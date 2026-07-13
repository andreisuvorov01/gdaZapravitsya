// Конвертер CSV-выгрузки заправок в bundled-данные демо-режима.
// Вход:  stations.csv (osm_id,name,brand,lat,lon,addr,status,fuels_now,conflict,extra)
// Выход: lib/regions/stations.json   — Station[]
//        lib/regions/seed-reports.json — посевные отчёты (age_min вместо абсолютного времени)
//
// Запуск: node scripts/convert-stations.mjs [путь_к_csv]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const csvPath = process.argv[2] || "C:/Users/Andrey/Downloads/stations.csv";
const raw = fs.readFileSync(csvPath, "utf8");

// Разбор одной CSV-строки с учётом кавычек и экранированных кавычек ("").
function parseLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
const header = parseLine(lines[0]);
const col = (name) => header.indexOf(name);
const ci = {
  osm_id: col("osm_id"),
  name: col("name"),
  brand: col("brand"),
  lat: col("lat"),
  lon: col("lon"),
  addr: col("addr"),
  status: col("status"),
  fuels_now: col("fuels_now"),
  extra: col("extra"),
};

const FUEL_MAP = [
  [/аи-?92|95\b|92/i, null],
];

// Нормализация видов топлива из строки fuels_now в принятые в приложении.
function parseFuels(s) {
  if (!s) return [];
  const set = new Set();
  const t = s.toLowerCase();
  if (/92/.test(t)) set.add("АИ-92");
  if (/95/.test(t)) set.add("АИ-95");
  if (/98/.test(t)) set.add("АИ-98");
  if (/100/.test(t)) set.add("АИ-100");
  if (/дт|diesel|дизель/.test(t)) set.add("ДТ");
  if (/газ|gas|пропан|метан|lpg|cng/.test(t)) set.add("Газ");
  return [...set];
}

function mapStatus(s) {
  const t = (s || "").trim().toLowerCase();
  if (t === "no" || t === "нет") return "no";
  if (t === "yes" || t === "да" || t === "есть") return "yes";
  if (t === "low" || t === "мало" || t === "limit") return "low";
  return null;
}

const stations = [];
const seedReports = [];
const seenIds = new Set();
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const f = parseLine(lines[i]);
  const lat = Number(f[ci.lat]);
  const lng = Number(f[ci.lon]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    skipped++;
    continue;
  }
  // Граница РФ (грубо), отсекаем мусорные координаты.
  if (lat < 41 || lat > 82 || lng < 19 || lng > 180) {
    skipped++;
    continue;
  }

  const rawId = (f[ci.osm_id] || "").trim();
  let id = rawId ? (rawId.startsWith("usr_") ? rawId : `osm-${rawId}`) : `gen-${i}`;
  if (seenIds.has(id)) id = `${id}-${i}`;
  seenIds.add(id);

  const brand = (f[ci.brand] || "").trim() || null;
  const name = (f[ci.name] || "").trim() || brand || "АЗС";
  const address = (f[ci.addr] || "").trim() || null;

  stations.push({
    id,
    name,
    brand,
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
    address,
    source: "osm",
  });

  // Посевной статус (если задан) — в виде отчёта с относительным возрастом.
  const status = mapStatus(f[ci.status]);
  if (status) {
    let confirms = 0;
    const extraStr = f[ci.extra];
    if (extraStr) {
      try {
        const ex = JSON.parse(extraStr);
        if (typeof ex.confirmations === "number") confirms = Math.min(50, ex.confirmations);
      } catch {
        /* extra не JSON — игнорируем */
      }
    }
    // Возраст 5–170 мин, чтобы попасть в окно свежести (3 ч) и оживить карту.
    const age_min = 5 + Math.floor(Math.random() * 165);
    seedReports.push({
      station_id: id,
      status,
      fuel_types: parseFuels(f[ci.fuels_now]),
      confirms,
      age_min,
    });
  }
}

const outDir = path.join(root, "lib", "regions");
fs.writeFileSync(
  path.join(outDir, "stations.json"),
  JSON.stringify(stations),
  "utf8"
);
fs.writeFileSync(
  path.join(outDir, "seed-reports.json"),
  JSON.stringify(seedReports),
  "utf8"
);

console.log(`Станций: ${stations.length}`);
console.log(`Посевных отчётов (со статусом): ${seedReports.length}`);
console.log(`Пропущено строк (битые координаты): ${skipped}`);
