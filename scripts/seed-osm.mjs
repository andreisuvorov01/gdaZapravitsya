// Импорт заправок из OpenStreetMap (Overpass API) в таблицу stations.
//
// Запуск:  npm run seed
//
// Переменные окружения (можно в .env):
//   DATABASE_URL   — строка подключения к Postgres
//   SEED_BBOX      — "south,west,north,east" (опционально)
//
// Без SEED_BBOX импортируется Москва и область. Для всей РФ запускайте
// по регионам (РФ слишком велика для одного запроса Overpass).

import { loadEnv, requireEnv } from "./load-env.mjs";
import { closePool, getPool } from "./lib/db.mjs";

loadEnv();
requireEnv("DATABASE_URL");

// Москва + область по умолчанию
const DEFAULT_BBOX = "55.1,36.8,56.1,38.3";
const bbox = (process.env.SEED_BBOX || DEFAULT_BBOX).trim();
const [south, west, north, east] = bbox.split(",").map((s) => Number(s.trim()));

if ([south, west, north, east].some((n) => Number.isNaN(n))) {
  console.error("Неверный SEED_BBOX. Формат: south,west,north,east");
  process.exit(1);
}

const OVERPASS = "https://overpass-api.de/api/interpreter";

// Запрос: все объекты amenity=fuel в bbox (узлы, пути, отношения).
const query = `
[out:json][timeout:180];
(
  node["amenity"="fuel"](${south},${west},${north},${east});
  way["amenity"="fuel"](${south},${west},${north},${east});
  relation["amenity"="fuel"](${south},${west},${north},${east});
);
out center tags;
`;

function pickName(tags = {}) {
  return (
    tags.name ||
    tags.brand ||
    tags["operator"] ||
    "АЗС"
  );
}

function pickAddress(tags = {}) {
  const parts = [
    tags["addr:city"],
    tags["addr:street"],
    tags["addr:housenumber"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

async function main() {
  console.log(`Запрашиваю заправки из OSM для bbox=${bbox} …`);
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) {
    console.error("Overpass вернул ошибку:", res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const elements = data.elements ?? [];
  console.log(`Получено объектов: ${elements.length}`);

  const rows = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    rows.push({
      osm_id: el.id,
      name: pickName(el.tags),
      brand: el.tags?.brand ?? null,
      lat,
      lng,
      address: pickAddress(el.tags),
      source: "osm",
    });
  }
  console.log(`Готово к вставке: ${rows.length}`);

  const pool = getPool();

  // Вставка пачками с upsert по osm_id (чтобы повторный запуск не дублировал).
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    try {
      await pool.query(
        `insert into public.stations (osm_id, name, brand, lat, lng, address, source)
         select x.osm_id, x.name, x.brand, x.lat, x.lng, x.address, x.source
         from jsonb_to_recordset($1::jsonb) as x(
           osm_id bigint, name text, brand text, lat double precision,
           lng double precision, address text, source text
         )
         on conflict (osm_id) do update set
           name = excluded.name,
           brand = excluded.brand,
           lat = excluded.lat,
           lng = excluded.lng,
           address = excluded.address`,
        [JSON.stringify(chunk)]
      );
    } catch (e) {
      console.error("Ошибка вставки пачки:", e.message);
      process.exit(1);
    }
    inserted += chunk.length;
    console.log(`Вставлено ${inserted}/${rows.length}`);
  }

  console.log("Импорт завершён.");
  await closePool();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
