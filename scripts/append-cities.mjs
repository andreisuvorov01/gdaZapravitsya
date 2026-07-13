/** Добавляет города в lib/cities.json без дублей. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, "../lib/cities.json");
const cyrillicOnly = /^[А-Яа-яЁё\s-]+$/u;

const extra = [
  { slug: "almetyevsk", name: "Альметьевск", prepositional: "Альметьевске", genitive: "Альметьевска", lat: 54.9014, lng: 52.2971, zoom: 12 },
  { slug: "alushta", name: "Алушта", prepositional: "Алуште", genitive: "Алушты", lat: 44.6763, lng: 34.4097, zoom: 13 },
  { slug: "armavir", name: "Армавир", prepositional: "Армавире", genitive: "Армавира", lat: 45.0012, lng: 41.1324, zoom: 12 },
  { slug: "arzamas", name: "Арзамас", prepositional: "Арзамасе", genitive: "Арзамаса", lat: 55.3948, lng: 43.8399, zoom: 13 },
  { slug: "artyom", name: "Артём", prepositional: "Артёме", genitive: "Артёма", lat: 43.3599, lng: 132.1889, zoom: 12 },
  { slug: "asbest", name: "Асбест", prepositional: "Асбесте", genitive: "Асбеста", lat: 57.005, lng: 61.458, zoom: 12 },
  { slug: "achinsk", name: "Ачинск", prepositional: "Ачинске", genitive: "Ачинска", lat: 56.2696, lng: 90.4993, zoom: 12 },
  { slug: "balakovo", name: "Балаково", prepositional: "Балакове", genitive: "Балакова", lat: 52.0226, lng: 47.7828, zoom: 12 },
  { slug: "bataysk", name: "Батайск", prepositional: "Батайске", genitive: "Батайска", lat: 47.1383, lng: 39.7508, zoom: 12 },
  { slug: "belovo", name: "Белово", prepositional: "Белове", genitive: "Белова", lat: 54.4165, lng: 86.3037, zoom: 12 },
  { slug: "berezniki", name: "Березники", prepositional: "Березниках", genitive: "Березников", lat: 59.4079, lng: 56.8047, zoom: 12 },
  { slug: "berdsk", name: "Бердск", prepositional: "Бердске", genitive: "Бердска", lat: 54.7583, lng: 83.1071, zoom: 12 },
  { slug: "biysk", name: "Бийск", prepositional: "Бийске", genitive: "Бийска", lat: 52.5387, lng: 85.2072, zoom: 12 },
  { slug: "bor", name: "Бор", prepositional: "Боре", genitive: "Бора", lat: 56.3565, lng: 44.0625, zoom: 13 },
  { slug: "volgodonsk", name: "Волгодонск", prepositional: "Волгодонске", genitive: "Волгодонска", lat: 47.5167, lng: 42.1989, zoom: 12 },
  { slug: "vorkuta", name: "Воркута", prepositional: "Воркуте", genitive: "Воркуты", lat: 67.4979, lng: 64.0525, zoom: 12 },
  { slug: "vyborg", name: "Выборг", prepositional: "Выборге", genitive: "Выборга", lat: 60.7136, lng: 28.7528, zoom: 12 },
  { slug: "derbent", name: "Дербент", prepositional: "Дербенте", genitive: "Дербента", lat: 42.0578, lng: 48.2906, zoom: 12 },
  { slug: "dolgoprudnyy", name: "Долгопрудный", prepositional: "Долгопрудном", genitive: "Долгопрудного", lat: 55.9386, lng: 37.5201, zoom: 12 },
  { slug: "dubna", name: "Дубна", prepositional: "Дубне", genitive: "Дубны", lat: 56.732, lng: 37.1669, zoom: 13 },
  { slug: "essentuki", name: "Ессентуки", prepositional: "Ессентуках", genitive: "Ессентуков", lat: 44.0445, lng: 42.8649, zoom: 13 },
  { slug: "egoryevsk", name: "Егорьевск", prepositional: "Егорьевске", genitive: "Егорьевска", lat: 55.3831, lng: 39.0358, zoom: 12 },
  { slug: "zhukovskiy", name: "Жуковский", prepositional: "Жуковском", genitive: "Жуковского", lat: 55.5975, lng: 38.1198, zoom: 12 },
  { slug: "zlatoust", name: "Златоуст", prepositional: "Златоусте", genitive: "Златоуста", lat: 55.1711, lng: 59.6508, zoom: 12 },
  { slug: "ivanteyevka", name: "Ивантеевка", prepositional: "Ивантеевке", genitive: "Ивантеевки", lat: 55.9718, lng: 37.9208, zoom: 12 },
  { slug: "iskitim", name: "Искитим", prepositional: "Искитиме", genitive: "Искитима", lat: 54.642, lng: 83.3065, zoom: 12 },
  { slug: "ishimbay", name: "Ишимбай", prepositional: "Ишимбае", genitive: "Ишимбая", lat: 53.4546, lng: 56.0439, zoom: 12 },
  { slug: "kamensk-uralskiy", name: "Каменск-Уральский", prepositional: "Каменске-Уральском", genitive: "Каменска-Уральского", lat: 56.4149, lng: 61.9189, zoom: 12 },
  { slug: "kamyshin", name: "Камышин", prepositional: "Камышине", genitive: "Камышина", lat: 50.0833, lng: 45.4167, zoom: 12 },
  { slug: "kansk", name: "Канск", prepositional: "Канске", genitive: "Канска", lat: 56.205, lng: 95.705, zoom: 12 },
  { slug: "kaspiysk", name: "Каспийск", prepositional: "Каспийске", genitive: "Каспийска", lat: 42.8816, lng: 47.6382, zoom: 12 },
  { slug: "kiselevsk", name: "Киселёвск", prepositional: "Киселёвске", genitive: "Киселёвска", lat: 53.9904, lng: 86.662, zoom: 12 },
  { slug: "kislovodsk", name: "Кисловодск", prepositional: "Кисловодске", genitive: "Кисловодска", lat: 43.9057, lng: 42.7168, zoom: 13 },
  { slug: "klin", name: "Клин", prepositional: "Клине", genitive: "Клина", lat: 56.3319, lng: 36.7272, zoom: 13 },
  { slug: "kolomna", name: "Коломна", prepositional: "Коломне", genitive: "Коломны", lat: 55.0794, lng: 38.7789, zoom: 12 },
  { slug: "kopeysk", name: "Копейск", prepositional: "Копейске", genitive: "Копейска", lat: 55.1168, lng: 61.6175, zoom: 12 },
  { slug: "kovrov", name: "Ковров", prepositional: "Коврове", genitive: "Коврова", lat: 56.3557, lng: 41.3171, zoom: 12 },
  { slug: "kstovo", name: "Кстово", prepositional: "Кстове", genitive: "Кстова", lat: 56.143, lng: 44.1669, zoom: 12 },
  { slug: "leninsk-kuznetskiy", name: "Ленинск-Кузнецкий", prepositional: "Ленинске-Кузнецком", genitive: "Ленинска-Кузнецкого", lat: 54.656, lng: 86.1737, zoom: 12 },
  { slug: "mezhdurechensk", name: "Междуреченск", prepositional: "Междуреченске", genitive: "Междуреченска", lat: 53.6866, lng: 88.0703, zoom: 12 },
  { slug: "miass", name: "Миасс", prepositional: "Миассе", genitive: "Миасса", lat: 55.045, lng: 60.1084, zoom: 12 },
  { slug: "mineralnye-vody", name: "Минеральные Воды", prepositional: "Минеральных Водах", genitive: "Минеральных Вод", lat: 44.2087, lng: 43.1351, zoom: 13 },
  { slug: "murom", name: "Муром", prepositional: "Муроме", genitive: "Мурома", lat: 55.5631, lng: 42.0236, zoom: 13 },
  { slug: "nakhodka", name: "Находка", prepositional: "Находке", genitive: "Находки", lat: 42.824, lng: 132.8928, zoom: 13 },
  { slug: "nazran", name: "Назрань", prepositional: "Назрани", genitive: "Назрани", lat: 43.2287, lng: 44.7644, zoom: 13 },
  { slug: "neftekamsk", name: "Нефтекамск", prepositional: "Нефтекамске", genitive: "Нефтекамска", lat: 56.088, lng: 54.2483, zoom: 12 },
  { slug: "nizhnyaya-tura", name: "Нижняя Тура", prepositional: "Нижней Туре", genitive: "Нижней Туры", lat: 58.6306, lng: 59.852, zoom: 12 },
  { slug: "noginsk", name: "Ногинск", prepositional: "Ногинске", genitive: "Ногинска", lat: 55.8686, lng: 38.4622, zoom: 12 },
  { slug: "novocherkassk", name: "Новочеркасск", prepositional: "Новочеркасске", genitive: "Новочеркасска", lat: 47.4119, lng: 40.0939, zoom: 12 },
  { slug: "novocheboksarsk", name: "Новочебоксарск", prepositional: "Новочебоксарске", genitive: "Новочебоксарска", lat: 56.1095, lng: 47.4791, zoom: 12 },
  { slug: "novomoskovsk", name: "Новомосковск", prepositional: "Новомосковске", genitive: "Новомосковска", lat: 54.0105, lng: 38.2846, zoom: 12 },
  { slug: "novotroitsk", name: "Новотроицк", prepositional: "Новотроицке", genitive: "Новотроицка", lat: 51.2037, lng: 58.3266, zoom: 12 },
  { slug: "novouralsk", name: "Новоуральск", prepositional: "Новоуральске", genitive: "Новоуральска", lat: 57.2472, lng: 60.0956, zoom: 12 },
  { slug: "novoshakhtinsk", name: "Новошахтинск", prepositional: "Новошахтинске", genitive: "Новошахтинска", lat: 47.7576, lng: 39.9364, zoom: 12 },
  { slug: "noyabrsk", name: "Ноябрьск", prepositional: "Ноябрьске", genitive: "Ноябрьска", lat: 63.2018, lng: 75.451, zoom: 12 },
  { slug: "norilsk", name: "Норильск", prepositional: "Норильске", genitive: "Норильска", lat: 69.349, lng: 88.201, zoom: 12 },
  { slug: "orsk", name: "Орск", prepositional: "Орске", genitive: "Орска", lat: 51.2293, lng: 58.4757, zoom: 12 },
  { slug: "orekhovo-zuevo", name: "Орехово-Зуево", prepositional: "Орехово-Зуеве", genitive: "Орехово-Зуева", lat: 55.8067, lng: 38.9618, zoom: 12 },
  { slug: "oktyabrskiy", name: "Октябрьский", prepositional: "Октябрьском", genitive: "Октябрьского", lat: 54.4815, lng: 53.4716, zoom: 12 },
  { slug: "prokopyevsk", name: "Прокопьевск", prepositional: "Прокопьевске", genitive: "Прокопьевска", lat: 53.9062, lng: 86.7189, zoom: 12 },
  { slug: "pushkino", name: "Пушкино", prepositional: "Пушкине", genitive: "Пушкина", lat: 56.0104, lng: 37.8471, zoom: 12 },
  { slug: "pyatigorsk", name: "Пятигорск", prepositional: "Пятигорске", genitive: "Пятигорска", lat: 44.0486, lng: 43.0594, zoom: 12 },
  { slug: "ramenskoye", name: "Раменское", prepositional: "Раменском", genitive: "Раменского", lat: 55.5669, lng: 38.2303, zoom: 12 },
  { slug: "reutov", name: "Реутов", prepositional: "Реутове", genitive: "Реутова", lat: 55.7612, lng: 37.8575, zoom: 12 },
  { slug: "rubtsovsk", name: "Рубцовск", prepositional: "Рубцовске", genitive: "Рубцовска", lat: 51.5263, lng: 81.2078, zoom: 12 },
  { slug: "salavat", name: "Салават", prepositional: "Салавате", genitive: "Салавата", lat: 53.3617, lng: 55.9247, zoom: 12 },
  { slug: "salsk", name: "Сальск", prepositional: "Сальске", genitive: "Сальска", lat: 46.475, lng: 41.541, zoom: 12 },
  { slug: "seversk", name: "Северск", prepositional: "Северске", genitive: "Северска", lat: 56.603, lng: 84.8809, zoom: 12 },
  { slug: "serov", name: "Серов", prepositional: "Серове", genitive: "Серова", lat: 59.605, lng: 60.573, zoom: 12 },
  { slug: "serpukhov", name: "Серпухов", prepositional: "Серпухове", genitive: "Серпухова", lat: 54.9158, lng: 37.4111, zoom: 12 },
  { slug: "syzran", name: "Сызрань", prepositional: "Сызрани", genitive: "Сызрани", lat: 53.1557, lng: 48.4741, zoom: 12 },
  { slug: "tobolsk", name: "Тобольск", prepositional: "Тобольске", genitive: "Тобольска", lat: 58.2017, lng: 68.2538, zoom: 12 },
  { slug: "tuapse", name: "Туапсе", prepositional: "Туапсе", genitive: "Туапсе", lat: 44.0876, lng: 39.0825, zoom: 13 },
  { slug: "ukhta", name: "Ухта", prepositional: "Ухте", genitive: "Ухты", lat: 63.566, lng: 53.6635, zoom: 12 },
  { slug: "ust-ilimsk", name: "Усть-Илимск", prepositional: "Усть-Илимске", genitive: "Усть-Илимска", lat: 58.0006, lng: 102.6619, zoom: 12 },
  { slug: "ust-kut", name: "Усть-Кут", prepositional: "Усть-Куте", genitive: "Усть-Кута", lat: 56.7928, lng: 105.775, zoom: 12 },
  { slug: "ussuriysk", name: "Уссурийск", prepositional: "Уссурийске", genitive: "Уссурийска", lat: 43.8028, lng: 131.9468, zoom: 12 },
  { slug: "feodosiya", name: "Феодосия", prepositional: "Феодосии", genitive: "Феодосии", lat: 45.0319, lng: 35.3824, zoom: 13 },
  { slug: "fryazino", name: "Фрязино", prepositional: "Фрязине", genitive: "Фрязина", lat: 55.959, lng: 38.041, zoom: 12 },
  { slug: "hasavyurt", name: "Хасавюрт", prepositional: "Хасавюрте", genitive: "Хасавюрта", lat: 43.1299, lng: 46.5886, zoom: 12 },
  { slug: "elektrostal", name: "Электросталь", prepositional: "Электростали", genitive: "Электростали", lat: 55.7842, lng: 38.4467, zoom: 12 },
  { slug: "yurga", name: "Юрга", prepositional: "Юрге", genitive: "Юрги", lat: 55.7136, lng: 84.898, zoom: 12 },
  { slug: "shchyolkovo", name: "Щёлково", prepositional: "Щёлкове", genitive: "Щёлкова", lat: 55.9239, lng: 37.9783, zoom: 12 },
];

for (const city of extra) {
  for (const field of ["name", "prepositional", "genitive"]) {
    if (!cyrillicOnly.test(city[field])) {
      throw new Error(`Поле ${field} содержит некириллические символы: ${city.slug}`);
    }
  }
}

const existing = JSON.parse(readFileSync(path, "utf8"));
const slugs = new Set(existing.map((city) => city.slug));
const names = new Set(existing.map((city) => city.name));
let added = 0;

for (const city of extra) {
  if (slugs.has(city.slug) || names.has(city.name)) {
    continue;
  }

  existing.push(city);
  slugs.add(city.slug);
  names.add(city.name);
  added++;
}

existing.sort((a, b) => a.name.localeCompare(b.name, "ru"));
writeFileSync(path, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
console.log(`Added ${added}, total ${existing.length}`);
