/** Применяет lib/city-overrides.ts к cities.json */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, "../lib/cities.json");

// Динамический import TS не в mjs — дублируем критичные правки inline при необходимости
const OVERRIDES = {
  oryol: { name: "Орёл", prepositional: "Орле", genitive: "Орла", lat: 52.968, lng: 36.07 },
  mytischi: { name: "Мытищи", prepositional: "Мытищах", genitive: "Мытищ" },
  balashiha: { name: "Балашиха", prepositional: "Балашихе", genitive: "Балашихи", lat: 55.7948, lng: 37.9479 },
  khimki: { name: "Химки", prepositional: "Химках", genitive: "Химок" },
  "veliky-novgorod": {
    name: "Великий Новгород",
    prepositional: "Великом Новгороде",
    genitive: "Великого Новгорода",
    lat: 58.5213,
    lng: 31.2755,
  },
  shahty: { name: "Шахты", prepositional: "Шахтах", genitive: "Шахт" },
  schelkovo: { name: "Щёлково", prepositional: "Щёлкове", genitive: "Щёлкова" },
  serpuhov: { name: "Серпухов", prepositional: "Серпухове", genitive: "Серпухова" },
  "orehovo-zuevo": { name: "Орехово-Зуево", prepositional: "Орехово-Зуеве", genitive: "Орехово-Зуева" },
  ramenskoe: { name: "Раменское", prepositional: "Раменском", genitive: "Раменского" },
  groznyy: { name: "Грозный", prepositional: "Грозном", genitive: "Грозного" },
  eysk: { name: "Ейск", prepositional: "Ейске", genitive: "Ейска", lat: 46.7111, lng: 38.2733 },
  prokopevsk: { name: "Прокопьевск", prepositional: "Прокопьевске", genitive: "Прокопьевска" },
  chehov: { name: "Чехов", prepositional: "Чехове", genitive: "Чехова" },
  timashevsk: { name: "Тимашёвск", prepositional: "Тимашёвске", genitive: "Тимашёвска" },
  balakhna: { name: "Балахна", prepositional: "Балахне", genitive: "Балахны" },
  vyazma: { name: "Вязьма", prepositional: "Вязьме", genitive: "Вязьмы" },
  arsenyev: { name: "Арсеньев", prepositional: "Арсеньеве", genitive: "Арсеньева" },
  pugachev: { name: "Пугачёв", prepositional: "Пугачёве", genitive: "Пугачёва" },
  "ust-labinsk": { name: "Усть-Лабинск", prepositional: "Усть-Лабинске", genitive: "Усть-Лабинска" },
  "slavyansk-na-kubani": {
    name: "Славянск-на-Кубани",
    prepositional: "Славянске-на-Кубани",
    genitive: "Славянска-на-Кубани",
  },
  "primorsko-akhtarsk": {
    name: "Приморско-Ахтарск",
    prepositional: "Приморско-Ахтарске",
    genitive: "Приморско-Ахтарска",
  },
  "kirovo-chepetsk": { name: "Кирово-Чепецк", prepositional: "Кирово-Чепецке", genitive: "Кирово-Чепецка" },
};

const cities = JSON.parse(readFileSync(path, "utf8"));
const slugs = new Set(cities.map((c) => c.slug));
let fixed = 0;
let added = 0;

for (const [slug, patch] of Object.entries(OVERRIDES)) {
  const idx = cities.findIndex((c) => c.slug === slug);
  if (idx >= 0) {
    cities[idx] = { ...cities[idx], ...patch };
    fixed++;
  } else if (patch.lat != null) {
    cities.push({
      slug,
      name: patch.name,
      prepositional: patch.prepositional,
      genitive: patch.genitive,
      lat: patch.lat,
      lng: patch.lng,
      zoom: 12,
    });
    added++;
  }
}

// Удалить дубликат oryol если есть отдельный orel
const orelIdx = cities.findIndex((c) => c.slug === "orel");
const oryolIdx = cities.findIndex((c) => c.slug === "oryol");
if (orelIdx >= 0 && oryolIdx >= 0) {
  cities.splice(oryolIdx, 1);
  console.log("removed duplicate oryol (kept orel)");
}

cities.sort((a, b) => a.name.localeCompare(b.name, "ru"));
writeFileSync(path, `${JSON.stringify(cities, null, 2)}\n`, "utf8");
console.log(`Fixed ${fixed}, added ${added}, total ${cities.length}`);
