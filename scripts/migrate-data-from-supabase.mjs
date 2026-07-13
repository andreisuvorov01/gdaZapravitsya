// Восстанавливает данные из NDJSON-бэкапа (см. backup/*.ndjson, снятого
// срочно во время миграции с Supabase — см. историю в CLAUDE.md/README.md) в
// БД, на которую сейчас указывает DATABASE_URL (новый локальный Postgres).
// Схема должна быть уже применена (npm run setup:db) ДО запуска этого скрипта.
//
// Идемпотентен: id сохраняются из бэкапа как есть, вставка — `on conflict do
// nothing`, повторный запуск безопасен (просто ничего не добавит второй раз).
// Порядок важен: stations → reports → report_confirms (внешние ключи).
//
// Запуск: node scripts/migrate-data-from-supabase.mjs [путь-к-папке-с-бэкапом]
// (по умолчанию — ./backup рядом с корнем проекта)

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";
import { closePool, getPool } from "./lib/db.mjs";

loadEnv();

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const backupDir = process.argv[2] || join(root, "backup");
const BATCH = 2000;

async function readNdjsonBatches(filePath, onBatch) {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let batch = [];
  let total = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    batch.push(JSON.parse(line));
    if (batch.length >= BATCH) {
      await onBatch(batch);
      total += batch.length;
      process.stdout.write(`\r${filePath}: ${total}`);
      batch = [];
    }
  }
  if (batch.length > 0) {
    await onBatch(batch);
    total += batch.length;
  }
  console.log(`\r${filePath}: ${total} — готово`);
  return total;
}

async function main() {
  const pool = getPool();

  await readNdjsonBatches(join(backupDir, "stations.ndjson"), async (rows) => {
    await pool.query(
      `insert into public.stations
         (id, name, brand, lat, lng, address, source, osm_id, gdebenz_id,
          gdebenz_comments_synced_at, benzinest_id, last_report_at, created_at)
       select x.id, x.name, x.brand, x.lat, x.lng, x.address, x.source, x.osm_id, x.gdebenz_id,
              x.gdebenz_comments_synced_at, x.benzinest_id, x.last_report_at, x.created_at
       from jsonb_to_recordset($1::jsonb) as x(
         id uuid, name text, brand text, lat double precision, lng double precision,
         address text, source text, osm_id bigint, gdebenz_id text,
         gdebenz_comments_synced_at timestamptz, benzinest_id text,
         last_report_at timestamptz, created_at timestamptz
       )
       on conflict (id) do nothing`,
      [JSON.stringify(rows)]
    );
  });

  await readNdjsonBatches(join(backupDir, "reports.ndjson"), async (rows) => {
    await pool.query(
      `insert into public.reports
         (id, station_id, status, fuel_types, limit_liters, queue, comment, photo_url,
          confirms, client_id, prices, created_at)
       select x.id, x.station_id, x.status, x.fuel_types, x.limit_liters, x.queue, x.comment,
              x.photo_url, x.confirms, x.client_id, x.prices, x.created_at
       from jsonb_to_recordset($1::jsonb) as x(
         id uuid, station_id uuid, status text, fuel_types text[], limit_liters int,
         queue text, comment text, photo_url text, confirms int, client_id text,
         prices jsonb, created_at timestamptz
       )
       on conflict (id) do nothing`,
      [JSON.stringify(rows)]
    );
  });

  await readNdjsonBatches(join(backupDir, "report_confirms.ndjson"), async (rows) => {
    await pool.query(
      `insert into public.report_confirms (report_id, client_id, created_at)
       select x.report_id, x.client_id, x.created_at
       from jsonb_to_recordset($1::jsonb) as x(report_id uuid, client_id text, created_at timestamptz)
       on conflict (report_id, client_id) do nothing`,
      [JSON.stringify(rows)]
    );
  });

  const { rows: counts } = await pool.query(`
    select
      (select count(*)::int from public.stations) as stations,
      (select count(*)::int from public.reports) as reports,
      (select count(*)::int from public.report_confirms) as report_confirms
  `);
  console.log("В БД сейчас:", counts[0]);
  await closePool();
}

main().catch((e) => {
  console.error("Ошибка восстановления:", e.message);
  process.exit(1);
});
