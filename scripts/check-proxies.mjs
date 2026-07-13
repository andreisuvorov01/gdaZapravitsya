// Проверяет каждый прокси из PROXY_LIST/PROXY_URL по отдельности (без
// ротации) реальным запросом к gdebenz.ru — не просто "прокси жив", а
// "прокси реально подходит для синка". Логирует только host:port, credentials
// (user:pass) нигде не печатаются.
// Запуск: node scripts/check-proxies.mjs

import { loadEnv } from "./load-env.mjs";
import { PROXY_POOL, closeTransports, requestJson, sleep } from "./lib/gdebenz-http.mjs";

loadEnv();

// Маленький bbox в Москве — минимальная нагрузка на gdebenz.ru, но реальный
// эндпоинт синка, а не сторонний IP-чекер.
const TEST_URL = "https://gdebenz.ru/api/stations?lat1=55.70&lon1=37.55&lat2=55.75&lon2=37.60";
const DELAY_BETWEEN_MS = 800;

function redact(proxyUrl) {
  try {
    const u = new URL(proxyUrl);
    return `${u.protocol}//${u.hostname}:${u.port}`;
  } catch {
    return "<не парсится как URL>";
  }
}

/** На случай, если низкоуровневая ошибка сети случайно вставит user:pass@ в текст. */
function redactSecrets(text) {
  return String(text).replace(/:\/\/[^:@/\s]+:[^:@/\s]+@/g, "://<redacted>@");
}

async function testProxy(proxyUrl, index, total) {
  const label = redact(proxyUrl);
  const tag = `#${index + 1}/${total} ${label}`;
  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await requestJson(TEST_URL, controller.signal, proxyUrl).finally(() => clearTimeout(timer));
    const ms = Date.now() - t0;
    if (res.ok && Array.isArray(res.data)) {
      console.log(`[OK]   ${tag} — ${ms}мс, транспорт ${res.transport}, станций в ответе: ${res.data.length}`);
      return true;
    }
    console.log(`[FAIL] ${tag} — HTTP ${res.status} за ${ms}мс (тело не похоже на JSON-массив станций)`);
    return false;
  } catch (e) {
    const ms = Date.now() - t0;
    console.log(`[FAIL] ${tag} — ${redactSecrets(e.message)} (${ms}мс)`);
    return false;
  }
}

async function main() {
  if (PROXY_POOL.length === 0) {
    console.log("PROXY_LIST/PROXY_URL не заданы в .env — нечего проверять.");
    return;
  }
  console.log(`Проверяю ${PROXY_POOL.length} прокси по очереди (каждый — отдельным запросом к gdebenz.ru)…`);

  let ok = 0;
  for (let i = 0; i < PROXY_POOL.length; i++) {
    if (await testProxy(PROXY_POOL[i], i, PROXY_POOL.length)) ok++;
    if (i < PROXY_POOL.length - 1) await sleep(DELAY_BETWEEN_MS);
  }

  console.log(`Готово: ${ok}/${PROXY_POOL.length} прокси рабочие.`);
  await closeTransports();
  process.exitCode = ok === PROXY_POOL.length ? 0 : 1;
}

main();
