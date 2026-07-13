// Применяет SQL-миграцию к облачному Supabase через прямое подключение Postgres.
// Запуск: npm run setup:db
//
// Нужно в .env:
//   DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@...pooler.supabase.com:6543/postgres
// (Supabase Dashboard → Project Settings → Database → Connection string → URI)

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadEnv, requireEnv } from "./load-env.mjs";

loadEnv();

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  console.log("Подключаюсь к Supabase Postgres…");

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  // Применяем все миграции *.sql по порядку имён (0001_, 0002_, …).
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`Применяю миграцию ${file} …`);
    await client.query(readFileSync(join(migrationsDir, file), "utf8"));
  }

  // PostgREST кеширует схему и не всегда мгновенно подхватывает DDL,
  // применённый напрямую через DATABASE_URL (в обход Supabase Studio) — без
  // этого api-запросы к новым колонкам могут ещё некоторое время падать с
  // "Could not find the '<col>' column ... in the schema cache".
  await client.query("notify pgrst, 'reload schema'");

  const { rows } = await client.query(
    "select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name in ('stations','reports')"
  );
  await client.end();

  console.log(`Готово. Таблицы stations/reports: ${rows[0]?.n ?? 0}/2`);
  console.log("Дальше: npm run seed:db");
}

main().catch((e) => {
  console.error("Ошибка setup:db:", e.message);
  console.error(
    "\nПроверьте DATABASE_URL в .env (Supabase → Settings → Database → Connection string → URI)."
  );
  process.exit(1);
});
