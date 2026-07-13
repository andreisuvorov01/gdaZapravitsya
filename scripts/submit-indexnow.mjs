// Отправка URL сайта в IndexNow (Bing, Yandex и др.).
// Требует INDEXNOW_KEY и NEXT_PUBLIC_SITE_URL в .env.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://xn----8sbaibghrm1elpm4lxb.xn--p1ai"
).replace(/\/$/, "");
const key = process.env.INDEXNOW_KEY?.trim();
const pathsArg = process.argv.slice(2).filter((a) => !a.startsWith("-"));

if (!key) {
  console.error("INDEXNOW_KEY не задан в .env");
  process.exit(1);
}

const host = new URL(siteUrl).host;
const keyLocation = `${siteUrl}/${key}.txt`;

async function fetchUrlsFromSitemap() {
  const res = await fetch(`${siteUrl}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function submit(urlList) {
  const endpoints = ["https://api.indexnow.org/indexnow", "https://yandex.com/indexnow"];
  const payload = { host, key, keyLocation, urlList };
  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    console.log(`${endpoint} → ${res.status} ${body.slice(0, 120)}`);
  }
}

let urlList;
if (pathsArg.length) {
  urlList = pathsArg.map((p) => `${siteUrl}${p.startsWith("/") ? p : `/${p}`}`);
} else {
  urlList = await fetchUrlsFromSitemap();
}

console.log(`IndexNow: ${urlList.length} URL → ${keyLocation}`);
await submit(urlList);
