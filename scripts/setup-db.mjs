// Применяет db/schema.sql к Postgres, на который указывает DATABASE_URL.
// Заменяет scripts/setup-supabase.mjs — больше не завязано на Supabase
// (никакого "notify pgrst" и Supabase-specific миграций из supabase/migrations/,
// те остаются в репозитории только как история эволюции схемы на Supabase).
// Идемпотентен (create ... if not exists) — безопасно гонять повторно.
// Запуск: npm run setup:db

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadEnv, requireEnv } from "./load-env.mjs";

loadEnv();

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "db", "schema.sql");

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  console.log("Подключаюсь к Postgres…");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  console.log("Применяю db/schema.sql…");
  await client.query(readFileSync(schemaPath, "utf8"));

  const { rows } = await client.query(
    "select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name in ('stations','reports','report_confirms')"
  );
  await client.end();

  console.log(`Готово. Таблицы stations/reports/report_confirms: ${rows[0]?.n ?? 0}/3`);
  console.log("Дальше: перенести данные (см. scripts/migrate-data-from-supabase.mjs) или npm run seed:db");
}

main().catch((e) => {
  console.error("Ошибка setup:db:", e.message);
  process.exit(1);
});
