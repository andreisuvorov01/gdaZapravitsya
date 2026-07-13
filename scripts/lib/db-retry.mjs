// Ретраи для запросов к локальному Postgres. Заменяет scripts/lib/supabase-retry.mjs
// (то было под {data,error}-конвенцию supabase-js; обычный `pg` вместо этого
// просто бросает ошибку — так проще, отдельная обёртка над формой ответа не нужна).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Оборачивает `fn` (обычно `() => pool.query(...)`) ретраями с линейным
 * бэкоффом. Возвращает результат первого успешного вызова; если все попытки
 * упали — бросает последнюю ошибку.
 */
export async function withRetry(fn, { retries = 3, delayMs = 500, label = "db" } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        console.warn(
          `  ${label}: попытка ${attempt}/${retries} не удалась (${e.message}), повтор через ${delayMs * attempt}мс`
        );
        await sleep(delayMs * attempt);
      }
    }
  }
  throw lastErr;
}
