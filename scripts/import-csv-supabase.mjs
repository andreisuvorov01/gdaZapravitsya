// Импорт заправок и посевных статусов из bundled-данных в локальный Postgres.
// Источник: lib/regions/stations.json + lib/regions/seed-reports.json
// (сгенерированы scripts/convert-stations.mjs из CSV).
//
// Запуск: node scripts/import-csv-supabase.mjs
// Требует в .env: DATABASE_URL
//
// Идемпотентность: станции upsert по osm_id; посевные отчёты помечаются
// client_id='seed' и пере-создаются при каждом запуске.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";
import { closePool, getPool } from "./lib/db.mjs";

loadEnv();

const regionsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "regions");
const stations = JSON.parse(readFileSync(join(regionsDir, "stations.json"), "utf8"));
const seedReports = JSON.parse(readFileSync(join(regionsDir, "seed-reports.json"), "utf8"));

const SYNTHETIC_BASE = 1_000_000_000_000; // отступ от реальных osm_id

// Стабильный числовой osm_id для каждой станции (для дедупа и маппинга id→uuid).
let syntheticCounter = 0;
function osmIdFor(id) {
  const m = String(id).match(/^osm-(\d+)$/);
  if (m) return Number(m[1]);
  return SYNTHETIC_BASE + syntheticCounter++;
}

async function main() {
  const pool = getPool();

  // csvId -> osm_id
  const csvToOsm = new Map();
  const rows = stations.map((s) => {
    const osm_id = osmIdFor(s.id);
    csvToOsm.set(s.id, osm_id);
    return {
      name: s.name || "АЗС",
      brand: s.brand ?? null,
      lat: s.lat,
      lng: s.lng,
      address: s.address ?? null,
      source: "osm",
      osm_id,
    };
  });

  // 1) Upsert станций батчами.
  const BATCH = 500;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await pool.query(
      `insert into public.stations (name, brand, lat, lng, address, source, osm_id)
       select x.name, x.brand, x.lat, x.lng, x.address, x.source, x.osm_id
       from jsonb_to_recordset($1::jsonb) as x(
         name text, brand text, lat double precision, lng double precision,
         address text, source text, osm_id bigint
       )
       on conflict (osm_id) do update set
         name = excluded.name,
         brand = excluded.brand,
         lat = excluded.lat,
         lng = excluded.lng,
         address = excluded.address`,
      [JSON.stringify(chunk)]
    );
    done += chunk.length;
    console.log(`Станции: ${done}/${rows.length}`);
  }

  // 2) Карта osm_id -> uuid (читаем все наши osm_id).
  const osmToUuid = new Map();
  const osmIds = [...csvToOsm.values()];
  for (let i = 0; i < osmIds.length; i += 1000) {
    const slice = osmIds.slice(i, i + 1000);
    const { rows: mapped } = await pool.query(
      `select id, osm_id from public.stations where osm_id = any($1::bigint[])`,
      [slice]
    );
    for (const r of mapped) osmToUuid.set(Number(r.osm_id), r.id);
  }
  console.log(`Сопоставлено станций: ${osmToUuid.size}`);

  // 3) Пере-создаём посевные отчёты.
  await pool.query(`delete from public.reports where client_id = 'seed'`);

  const now = Date.now();
  const reportRows = [];
  for (const sr of seedReports) {
    const osm_id = csvToOsm.get(sr.station_id);
    const uuid = osm_id != null ? osmToUuid.get(osm_id) : null;
    if (!uuid) continue;
    reportRows.push({
      station_id: uuid,
      status: sr.status,
      fuel_types: sr.fuel_types ?? [],
      queue: "none",
      confirms: sr.confirms ?? 0,
      client_id: "seed",
      created_at: new Date(now - (sr.age_min ?? 30) * 60000).toISOString(),
    });
  }

  let rDone = 0;
  for (let i = 0; i < reportRows.length; i += BATCH) {
    const chunk = reportRows.slice(i, i + BATCH);
    await pool.query(
      `insert into public.reports (station_id, status, fuel_types, queue, confirms, client_id, created_at)
       select x.station_id, x.status, x.fuel_types, x.queue, x.confirms, x.client_id, x.created_at
       from jsonb_to_recordset($1::jsonb) as x(
         station_id uuid, status text, fuel_types text[], queue text,
         confirms int, client_id text, created_at timestamptz
       )`,
      [JSON.stringify(chunk)]
    );
    rDone += chunk.length;
    console.log(`Отчёты: ${rDone}/${reportRows.length}`);
  }

  const { rows: countRows } = await pool.query("select count(*)::int as count from public.stations");
  console.log(`Готово. Заправок в БД: ${countRows[0]?.count}. Посевных отчётов: ${rDone}.`);
  await closePool();
}

main().catch((e) => {
  console.error("Ошибка импорта:", e.message);
  process.exit(1);
});
