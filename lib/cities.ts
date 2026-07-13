// Быстрый переход к городу (как SEO-страницы gdebenz.ru/{city}).

import citiesJson from "./cities.json";
import { distanceKm } from "./geo";

export interface CityPreset {
  slug: string;
  name: string;
  // Падежи названия для корректных SEO-текстов: предложный («в Москве»)
  // и родительный («АЗС Москвы»). Используются хелперами из lib/morph.ts.
  prepositional: string;
  genitive: string;
  lat: number;
  lng: number;
  zoom: number;
}

const cityPresets = citiesJson as CityPreset[];

export const CITY_PRESETS: CityPreset[] = [...cityPresets].sort((a, b) =>
  a.name.localeCompare(b.name, "ru")
);

// Крупнейшие города (население 300к+ и все региональные столицы-миллионники) —
// только их пререндерим статически при билде, остальные ~450 рендерятся по
// первому запросу (ISR, revalidate=300) и попадают в кэш из lib/warm-seo-pages.
// Так генерация статических страниц на билде не растягивается на 13k+ страниц
// (и не упирается в таймаут деплой-скрипта) — см. scripts/warm-seo-pages.mjs.
const PRIORITY_CITY_SLUGS = new Set([
  "moskva", "sankt-peterburg", "novosibirsk", "ekaterinburg", "kazan",
  "nizhniy-novgorod", "chelyabinsk", "krasnoyarsk", "samara", "ufa",
  "rostov-na-donu", "omsk", "krasnodar", "voronezh", "perm", "volgograd",
  "saratov", "tyumen", "tolyatti", "izhevsk", "barnaul", "ulyanovsk",
  "irkutsk", "khabarovsk", "yaroslavl", "vladivostok", "makhachkala",
  "tomsk", "orenburg", "kemerovo", "novokuznetsk", "ryazan", "astrakhan",
  "naberezhnye-chelny", "penza", "lipetsk", "kirov", "cheboksary", "tula",
  "kaliningrad", "balashikha", "kursk", "stavropol", "ulan-ude", "sochi",
  "sevastopol", "simferopol", "tver", "magnitogorsk", "ivanovo", "bryansk",
  "belgorod", "surgut", "vladimir", "nizhniy-tagil", "arkhangelsk", "chita",
  "kaluga", "smolensk", "volzhskiy", "kurgan",
  // Трафиковые и стратегические (Метрика + Кубань)
  "vologda", "kirovo-chepetsk", "saransk", "maykop", "armavir", "anapa",
  "yoshkar-ola", "tambov", "berezniki", "cherepovets", "glazov",
]);

export const PRIORITY_CITY_PRESETS: CityPreset[] = CITY_PRESETS.filter((c) =>
  PRIORITY_CITY_SLUGS.has(c.slug)
);

export function findCityBySlug(slug: string): CityPreset | undefined {
  return CITY_PRESETS.find((c) => c.slug === slug);
}

// Ближайший город-пресет к координатам без обращения к API.
// Возвращает пресет в радиусе maxKm (км) или null, если все слишком далеко.
export function nearestCity(
  lat: number,
  lng: number,
  maxKm = 70
): CityPreset | null {
  let best: CityPreset | null = null;
  let bestKm = Infinity;
  for (const c of CITY_PRESETS) {
    const km = distanceKm(lat, lng, c.lat, c.lng);
    if (km < bestKm) {
      bestKm = km;
      best = c;
    }
  }
  return best && bestKm <= maxKm ? best : null;
}

// Примерный bbox вокруг центра города [south, west, north, east].
// Радиус зависит от зума пресета (чем меньше зум — тем шире охват).
export function cityBBox(
  city: CityPreset
): [number, number, number, number] {
  const dLat = city.zoom <= 11 ? 0.35 : 0.25;
  const dLng = city.zoom <= 11 ? 0.6 : 0.45;
  return [city.lat - dLat, city.lng - dLng, city.lat + dLat, city.lng + dLng];
}
