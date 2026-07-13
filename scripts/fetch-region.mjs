// Разовая выгрузка заправок региона из OpenStreetMap в локальный JSON,
// который используется демо-режимом как надёжная база (без БД).
//
// Запуск:
//   node scripts/fetch-region.mjs <slug> <south,west,north,east>
// Пример (Краснодар):
//   node scripts/fetch-region.mjs krasnodar 44.95,38.80,45.18,39.25

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const slug = process.argv[2] || "krasnodar";
const bboxArg = process.argv[3] || "44.95,38.80,45.18,39.25";
const [south, west, north, east] = bboxArg.split(",").map((s) => Number(s.trim()));

const ENDPOINTS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const query = `[out:json][timeout:60];(node["amenity"="fuel"](${south},${west},${north},${east});way["amenity"="fuel"](${south},${west},${north},${east}););out center tags;`;

function pickName(tags = {}) {
  return tags.name || tags.brand || tags.operator || "АЗС";
}
function pickAddress(tags = {}) {
  const parts = [tags["addr:city"], tags["addr:street"], tags["addr:housenumber"]].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

async function tryFetch() {
  for (let attempt = 1; attempt <= 4; attempt++) {
    for (const endpoint of ENDPOINTS) {
      try {
        process.stdout.write(`Попытка ${attempt}: ${endpoint} … `);
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 40000);
        const res = await fetch(endpoint + "?data=" + encodeURIComponent(query), {
          headers: { "User-Agent": "benzin-map/1.0" },
          signal: controller.signal,
        }).finally(() => clearTimeout(t));
        if (!res.ok) {
          console.log(`HTTP ${res.status}`);
          continue;
        }
        const data = await res.json();
        console.log(`OK, элементов: ${data.elements?.length ?? 0}`);
        return data.elements ?? [];
      } catch (e) {
        console.log("ошибка:", e.message);
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Не удалось получить данные ни с одного эндпоинта Overpass");
}

const elements = await tryFetch();
const stations = [];
for (const el of elements) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number") continue;
  stations.push({
    id: `osm-${el.type[0]}${el.id}`,
    name: pickName(el.tags),
    brand: el.tags?.brand ?? null,
    lat,
    lng,
    address: pickAddress(el.tags),
    source: "osm",
  });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = `${__dirname}/../lib/regions/${slug}.json`;
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(stations, null, 2), "utf8");
console.log(`Сохранено ${stations.length} заправок -> lib/regions/${slug}.json`);
