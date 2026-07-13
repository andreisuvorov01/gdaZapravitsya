/**
 * Добавляет города из sitemap gdebenz.ru (по слагам fuel/ai-95/{city}).
 * Геокодирование: Open-Meteo → fallback Nominatim.
 * Запуск: node scripts/import-gdebenz-cities.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

function guessCityCases(name) {
  const n = name.trim();
  if (!n) return { prepositional: n, genitive: n };
  if (/[скц]$/iu.test(n)) return { prepositional: `${n}е`, genitive: `${n}а` };
  if (/[иы]$/u.test(n)) return { prepositional: n, genitive: n };
  if (/а$/u.test(n)) {
    if (/ьа$/u.test(n)) return { prepositional: `${n.slice(0, -1)}е`, genitive: `${n.slice(0, -1)}и` };
    if (/ия$/u.test(n)) return { prepositional: `${n.slice(0, -1)}и`, genitive: `${n.slice(0, -1)}и` };
    if (/ая$/u.test(n)) return { prepositional: `${n.slice(0, -2)}ой`, genitive: `${n.slice(0, -2)}ой` };
    return { prepositional: `${n.slice(0, -1)}е`, genitive: `${n.slice(0, -1)}ы` };
  }
  if (/й$/u.test(n)) return { prepositional: `${n.slice(0, -1)}е`, genitive: `${n.slice(0, -1)}я` };
  if (/о$/u.test(n)) return { prepositional: `${n.slice(0, -1)}е`, genitive: `${n.slice(0, -1)}а` };
  if (/ь$/u.test(n)) return { prepositional: `${n.slice(0, -1)}и`, genitive: `${n.slice(0, -1)}и` };
  return { prepositional: `${n}е`, genitive: `${n}а` };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const citiesPath = join(__dirname, "../lib/cities.json");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://benzryadom.ru";
const UA = `benzryadom-city-import/1.0 (+${SITE_URL})`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugToLatin(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function geocodeOpenMeteo(query) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}` +
    `&count=3&language=ru&countryCode=RU`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data.results?.[0];
  if (!hit) return null;
  return {
    name: hit.name,
    lat: hit.latitude,
    lng: hit.longitude,
  };
}

async function geocodeNominatim(query) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ru` +
    `&accept-language=ru&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data[0]) return null;
  const parts = (data[0].display_name || "").split(",");
  const name = parts[0]?.trim() || query;
  return {
    name,
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}

async function resolveCity(slug) {
  const latin = slugToLatin(slug);
  let hit = await geocodeOpenMeteo(latin);
  if (!hit) {
    await sleep(1100);
    hit = await geocodeNominatim(`${latin}, Россия`);
  }
  if (!hit) return null;
  const cases = guessCityCases(hit.name);
  return {
    slug,
    name: hit.name,
    prepositional: cases.prepositional,
    genitive: cases.genitive,
    lat: Math.round(hit.lat * 1e4) / 1e4,
    lng: Math.round(hit.lng * 1e4) / 1e4,
    zoom: 12,
  };
}

const sitemap = execSync("curl.exe -sL https://gdebenz.ru/sitemap.xml", {
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,
});
const gdebenzSlugs = [
  ...new Set(
    [...sitemap.matchAll(/<loc>https:\/\/gdebenz\.ru\/fuel\/ai-95\/([^<]+)<\/loc>/g)].map(
      (m) => m[1]
    )
  ),
];

const existing = JSON.parse(readFileSync(citiesPath, "utf8"));
const have = new Set(existing.map((c) => c.slug));
const missing = gdebenzSlugs.filter((s) => !have.has(s));

console.log(`gdebenz: ${gdebenzSlugs.length}, ours: ${existing.length}, import: ${missing.length}`);

let added = 0;
for (const slug of missing) {
  const city = await resolveCity(slug);
  if (!city) {
    console.warn(`  skip ${slug}`);
    await sleep(200);
    continue;
  }
  if (have.has(city.slug) || existing.some((c) => c.name === city.name)) {
    continue;
  }
  existing.push(city);
  have.add(city.slug);
  added++;
  console.log(`  + ${city.name} (${slug})`);
  await sleep(300);
}

existing.sort((a, b) => a.name.localeCompare(b.name, "ru"));
writeFileSync(citiesPath, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
console.log(`Done: +${added}, total ${existing.length}`);
