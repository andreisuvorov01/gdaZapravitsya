// Общее pg-подключение для standalone-скриптов (sync/seed/import) —
// заменяет прямые createClient(...) из @supabase/supabase-js. Один Pool на
// процесс скрипта, как и в приложении (см. lib/db.ts).
import pg from "pg";
import { requireEnv } from "../load-env.mjs";

let pool;

export function getPool() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: requireEnv("DATABASE_URL"), max: 5 });
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
