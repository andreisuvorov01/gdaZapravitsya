// Прогрев ISR-кэша для SEO-страниц, которые НЕ пререндерятся статически на
// билде (см. PRIORITY_CITY_PRESETS в lib/cities.ts — на билде остаются только
// ~60 крупнейших городов, чтобы next build не упирался в таймаут деплой-скрипта
// на ~14k страницах). Здесь просто обходим все URL из sitemap живыми GET-запросами
// к уже поднятому прод-серверу — Next.js сам сгенерирует и закэширует (revalidate=300)
// каждую страницу при первом обращении.
//
// Запускается ПОСЛЕ pm2 restart, в фоне (см. scripts/deploy.sh) — не блокирует деплой.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logDir = path.join(root, "logs");
const logFile = path.join(logDir, "warm-seo-pages.log");

const CONCURRENCY = Number(process.env.WARM_CONCURRENCY || 4);
const REQUEST_TIMEOUT_MS = Number(process.env.WARM_TIMEOUT_MS || 15000);

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  mkdirSync(logDir, { recursive: true });
  appendFileSync(logFile, line, "utf8");
  console.log(message);
}

function collectUrlsLocally() {
  const out = execSync("npx --yes tsx scripts/collect-sitemap-urls.mts", {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return JSON.parse(out.trim());
}

async function warmOne(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.status;
  } catch (err) {
    return `ERR:${err.message}`;
  } finally {
    clearTimeout(timer);
  }
}

async function runPool(urls, concurrency) {
  let ok = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < urls.length) {
      const i = cursor++;
      const url = urls[i];
      const status = await warmOne(url);
      if (status === 200) {
        ok += 1;
      } else {
        failed += 1;
        log(`  ${status} ${url}`);
      }
      if ((ok + failed) % 500 === 0) {
        log(`прогрето ${ok + failed}/${urls.length} (ok=${ok}, failed=${failed})`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return { ok, failed };
}

async function main() {
  loadEnv();
  log("=== Прогрев SEO-страниц: старт ===");

  const urls = collectUrlsLocally();
  log(`URL из sitemap: ${urls.length}, конкурентность: ${CONCURRENCY}`);

  const startedAt = Date.now();
  const { ok, failed } = await runPool(urls, CONCURRENCY);
  const seconds = Math.round((Date.now() - startedAt) / 1000);

  log(`=== Готово за ${seconds}с: ok=${ok}, failed=${failed} ===`);
}

main().catch((err) => {
  log(`Фатальная ошибка: ${err.stack || err.message}`);
  process.exitCode = 1;
});
