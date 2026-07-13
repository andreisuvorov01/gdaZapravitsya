// Одноразовый/плановый пинг IndexNow на проде после деплоя.
// Без CRON_SECRET: прямая отправка в IndexNow (Яндекс + Bing).
// URL собираются ЛОКАЛЬНО из lib/sitemap-urls.ts — прод не нагружается.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logDir = path.join(root, "logs");
const logFile = path.join(logDir, "indexnow-prod.log");

/** Мелкие пакеты + пауза — щадящий режим для внешних API. */
const BATCH_SIZE = Number(process.env.INDEXNOW_BATCH_SIZE || 200);
const BATCH_DELAY_MS = Number(process.env.INDEXNOW_BATCH_DELAY_MS || 2500);

const INDEXNOW_ENDPOINTS = [
  "https://yandex.com/indexnow",
  "https://api.indexnow.org/indexnow",
];

const PRIORITY_PATH_PREFIXES = [
  "/",
  "/gde-benzin",
  "/gde-zapravitsya",
  "/na-kakoy-zapravke",
  "/goroda",
  "/faq",
  "/llms.txt",
  "/llms-full.txt",
  "/sitemap.xml",
  "/gde-benzin/moskva",
  "/gde-benzin/sankt-peterburg",
  "/gde-benzin/krasnodar",
  "/azs/moskva",
  "/azs/krasnodar",
];

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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

/** Fallback: один GET sitemap с прода, если tsx недоступен. */
async function fetchUrlsFromProdSitemap(siteUrl) {
  log("Fallback: читаем sitemap.xml с прода (один запрос)");
  const res = await fetch(`${siteUrl}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function prioritizeUrls(urlList, siteUrl) {
  const prioritySet = new Set(
    PRIORITY_PATH_PREFIXES.map((p) =>
      p === "/" ? `${siteUrl}/` : `${siteUrl}${p}`
    )
  );
  const priority = [];
  const rest = [];
  for (const url of urlList) {
    if (prioritySet.has(url)) priority.push(url);
    else rest.push(url);
  }
  return [...priority, ...rest];
}

async function viaDirectIndexNow(siteUrl, key) {
  const host = new URL(siteUrl).host;
  const keyLocation = `${siteUrl}/${key}.txt`;

  let urlList;
  try {
    urlList = collectUrlsLocally();
    log(`Локальный sitemap: ${urlList.length} URL (прод не трогали)`);
  } catch (e) {
    log(`Локальный сбор не удался: ${e instanceof Error ? e.message : String(e)}`);
    urlList = await fetchUrlsFromProdSitemap(siteUrl);
    log(`С прода: ${urlList.length} URL`);
  }

  urlList = prioritizeUrls(urlList, siteUrl);
  const batches = chunk(urlList, BATCH_SIZE);
  log(
    `IndexNow: ${urlList.length} URL, ${batches.length} пакетов по ≤${BATCH_SIZE}, пауза ${BATCH_DELAY_MS} мс`
  );
  log(`keyLocation: ${keyLocation}`);
  log("Google IndexNow не поддерживает — для Google нужен Search Console + sitemap");

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const payload = { host, key, keyLocation, urlList: batch };
    log(`Пакет ${i + 1}/${batches.length} (${batch.length} url)`);

    for (const endpoint of INDEXNOW_ENDPOINTS) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const body = await res.text();
      const ok = res.ok || res.status === 202;
      log(`${endpoint} → ${res.status} ${ok ? "ok" : "warn"} ${body.slice(0, 100)}`);
      if (!ok && endpoint.includes("yandex.com")) process.exit(1);
    }

    if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }
}

loadEnv();

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://benzryadom.ru").replace(/\/$/, "");
const indexNowKey = process.env.INDEXNOW_KEY?.trim();

log("--- trigger-indexnow-prod start ---");

try {
  if (!indexNowKey) {
    log("Ошибка: нужен INDEXNOW_KEY в .env");
    process.exit(1);
  }
  log("Режим: прямая отправка IndexNow (без CRON_SECRET, без нагрузки на прод)");
  await viaDirectIndexNow(siteUrl, indexNowKey);
  log("--- trigger-indexnow-prod ok ---");
} catch (e) {
  log(`Ошибка: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
