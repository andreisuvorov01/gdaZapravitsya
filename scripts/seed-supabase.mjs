// Загрузка заправок из lib/regions/*.json в локальный Postgres.
// Запуск: npm run seed:db
//
// Требует в .env: DATABASE_URL

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";
import { closePool, getPool } from "./lib/db.mjs";

loadEnv();

const regionsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "regions");

function parseOsmId(id) {
  const m = String(id).match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

async function main() {
  const pool = getPool();

  // stations.json/seed-reports.json — вывод scripts/convert-stations.mjs для
  // demo-режима (lib/demo-store.ts), другая форма id, сюда не годятся: их
  // упорядоченный импорт — scripts/import-csv-supabase.mjs.
  const DEMO_BUNDLE_FILES = new Set(["stations.json", "seed-reports.json"]);
  const files = readdirSync(regionsDir).filter((f) => f.endsWith(".json") && !DEMO_BUNDLE_FILES.has(f));
  if (files.length === 0) {
    console.log("Нет файлов в lib/regions/. Сначала: node scripts/fetch-region.mjs krasnodar …");
    process.exit(1);
  }

  let total = 0;
  for (const file of files) {
    const raw = readFileSync(join(regionsDir, file), "utf8");
    const stations = JSON.parse(raw);
    const rows = stations
      .map((s) => ({
        name: s.name ?? "АЗС",
        brand: s.brand ?? null,
        lat: s.lat,
        lng: s.lng,
        address: s.address ?? null,
        source: "osm",
        osm_id: parseOsmId(s.id),
      }))
      .filter((r) => r.osm_id != null);

    const BATCH = 400;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      if (chunk.length === 0) continue;
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
      total += chunk.length;
      console.log(`${file}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
    }
  }

  const { rows: countRows } = await pool.query("select count(*)::int as count from public.stations");

  console.log(`Импорт завершён. Всего в БД заправок: ${countRows[0]?.count ?? total}`);
  await closePool();
}

main().catch((e) => {
  console.error("Ошибка seed:db:", e.message);
  process.exit(1);
});
