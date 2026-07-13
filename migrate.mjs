// Применяет SQL-миграции схемы (ALTER TABLE / CREATE INDEX) напрямую к
// Postgres, стоящему за Supabase-проектом.
//
// ВАЖНО: SUPABASE_SERVICE_ROLE_KEY (тот, что уже есть в .env и используется
// во всех sync-*.mjs через supabase-js) даёт доступ только к REST API
// (PostgREST) — им можно делать select/insert/update/upsert по
// СУЩЕСТВУЮЩИМ таблицам, но НЕЛЬЗЯ выполнить произвольный SQL вроде
// ALTER TABLE или CREATE INDEX: PostgREST в принципе не предоставляет
// такой эндпоинт (это осознанное ограничение ради безопасности). Единственный
// способ выполнить DDL программно — прямое подключение к Postgres по
// connection string, а не через REST/supabase-js.
//
// Поэтому этому скрипту нужна ОТДЕЛЬНАЯ переменная окружения (её пока нет в
// .env, добавьте сами): SUPABASE_DB_URL (или DATABASE_URL/POSTGRES_URL) —
// взять в Supabase Dashboard → Project Settings → Database → Connection
// string → URI. Пример:
//   postgresql://postgres.xxxxxxxx:ВАШ_ПАРОЛЬ@aws-0-xx-xxxx-1.pooler.supabase.com:6543/postgres
//
// Запуск: node migrate.mjs

import pg from "pg";
import { loadEnv } from "./scripts/load-env.mjs";

loadEnv();

const CONNECTION_STRING =
  process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

if (!CONNECTION_STRING) {
  console.error(
    "Не задана строка подключения к Postgres.\n\n" +
      "SUPABASE_SERVICE_ROLE_KEY из .env даёт доступ только к REST API (supabase-js) — им нельзя выполнить ALTER TABLE/CREATE INDEX.\n" +
      "Добавьте в .env одну из переменных: SUPABASE_DB_URL / DATABASE_URL / POSTGRES_URL со значением из\n" +
      "Supabase Dashboard → Project Settings → Database → Connection string → URI (подойдёт и Session pooler, и Direct connection).\n"
  );
  process.exit(1);
}

// Каждая миграция идемпотентна (IF NOT EXISTS) — повторный запуск безопасен.
const MIGRATIONS = [
  {
    name: "stations.benzinest_id",
    sql: `
      alter table public.stations add column if not exists benzinest_id text;
      create index if not exists stations_benzinest_id_idx on public.stations (benzinest_id);
    `,
  },
  {
    name: "stations.last_report_at",
    sql: `
      alter table public.stations add column if not exists last_report_at timestamptz;
      create index if not exists stations_last_report_at_idx on public.stations (last_report_at);
    `,
  },
  {
    // Массовое обновление last_report_at РАЗНЫМИ значениями за один запрос.
    // Обычный upsert() тут не годится: INSERT ... ON CONFLICT DO UPDATE в
    // Postgres строит полную кандидатную строку (со всеми NOT NULL
    // колонками вроде lat/lng) ДО проверки конфликта, даже если сработает
    // путь UPDATE — неполный payload {id, last_report_at} валится с "null
    // value in column lat". Обычный plain UPDATE эту проблему не имеет, но
    // Supabase-js .update() выставляет ОДНО значение сразу для всех строк
    // фильтра — для разных значений на каждую строку нужен отдельный запрос
    // на строку, что на тысячах станций плодит лишнюю сетевую нагрузку и
    // транзиентные "fetch failed". Эта RPC делает то же самое одним
    // запросом на всю пачку.
    //
    // security definer + revoke/grant ниже: Postgres по умолчанию даёт
    // EXECUTE на новую функцию роли PUBLIC, а значит anon/authenticated
    // смогут вызвать её через PostgREST RPC-эндпоинт напрямую — это ломает
    // инвариант из supabase/migrations/0002_security.sql ("все записи —
    // только через service_role"). Точечно отзываем PUBLIC и оставляем
    // только service_role.
    name: "rpc.bulk_update_last_report_at",
    sql: `
      create or replace function public.bulk_update_last_report_at(updates jsonb)
      returns void
      language sql
      as $$
        update public.stations s
        set last_report_at = (u.value->>'last_report_at')::timestamptz
        from jsonb_array_elements(updates) as u(value)
        where s.id = (u.value->>'id')::uuid;
      $$;
      revoke execute on function public.bulk_update_last_report_at(jsonb) from public;
      revoke execute on function public.bulk_update_last_report_at(jsonb) from anon, authenticated;
      grant execute on function public.bulk_update_last_report_at(jsonb) to service_role;
    `,
  },
];

async function main() {
  const client = new pg.Client({
    connectionString: CONNECTION_STRING,
    ssl: process.env.PGSSL === "0" ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Подключено к Postgres.");
  try {
    for (const m of MIGRATIONS) {
      process.stdout.write(`Применяю: ${m.name}... `);
      await client.query(m.sql);
      console.log("ok");
    }
    // DDL шло напрямую в Postgres, в обход PostgREST — у Supabase обычно
    // стоит event trigger, который сам шлёт этот NOTIFY, но полагаться на
    // него вслепую нельзя (если он отключён/не настроен в проекте,
    // PostgREST может продолжить отдавать старый schema cache сколь угодно
    // долго). Форсируем reload явно и идемпотентно на каждый прогон.
    await client.query(`notify pgrst, 'reload schema';`);
    console.log("Готово — все миграции применены, PostgREST schema cache сброшен.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("\nОшибка миграции:", e.message);
  process.exit(1);
});
