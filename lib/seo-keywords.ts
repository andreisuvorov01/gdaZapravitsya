// Расширенное SEO-ядро для импорта в Topvisor и планирования контента.
// Генерируется из кластеров + приоритетных городов.

import { CITY_PRESETS } from "./cities";
import { BRAND_ENTRIES } from "./brand-slugs";
import { FUEL_SLUG_ENTRIES } from "./fuel-slugs";
import {
  KEYWORD_CLUSTERS,
  TRAFFIC_WINNER_CITY_SLUGS,
  collectSeedKeywords,
} from "./seo-growth";

/** Города для генерации long-tail (сначала трафиковые). */
function priorityCityNames(): string[] {
  const winnerSet = new Set<string>(TRAFFIC_WINNER_CITY_SLUGS);
  const winners = CITY_PRESETS.filter((c) => winnerSet.has(c.slug)).map((c) => c.name);
  const rest = CITY_PRESETS.filter((c) => !winnerSet.has(c.slug))
    .slice(0, 80)
    .map((c) => c.name);
  return [...winners, ...rest];
}

/** Шаблоны запросов с подстановкой города. */
const CITY_QUERY_TEMPLATES = [
  "где бензин {city}",
  "где есть бензин в {city}",
  "где бензин сейчас {city}",
  "бензин {city}",
  "бензин сегодня {city}",
  "наличие бензина {city}",
  "наличие бензина на заправках {city}",
  "где заправиться {city}",
  "на какой заправке есть бензин {city}",
  "карта заправок {city}",
  "карта бензина {city}",
  "очередь на заправке {city}",
  "лимит на бензин {city}",
  "что с заправками {city}",
  "азс {city}",
];

const FUEL_CITY_TEMPLATES = [
  "где {fuel} в {city}",
  "{fuel} {city}",
  "наличие {fuel} {city}",
];

const BRAND_CITY_TEMPLATES = [
  "{brand} {city}",
  "где {brand} {city}",
  "{brand} бензин {city}",
];

/** Полное ядро: базовые seeds + городские + топливные + брендовые. */
export function buildExpandedKeywordCore(): string[] {
  const keywords = new Set<string>(collectSeedKeywords());

  for (const city of priorityCityNames()) {
    for (const tpl of CITY_QUERY_TEMPLATES) {
      keywords.add(tpl.replace("{city}", city));
    }
    for (const fuel of FUEL_SLUG_ENTRIES) {
      for (const tpl of FUEL_CITY_TEMPLATES) {
        keywords.add(
          tpl.replace("{city}", city).replace("{fuel}", fuel.label.toLowerCase())
        );
      }
    }
    for (const brand of BRAND_ENTRIES.slice(0, 12)) {
      for (const tpl of BRAND_CITY_TEMPLATES) {
        keywords.add(
          tpl.replace("{city}", city).replace("{brand}", brand.name)
        );
      }
    }
  }

  return [...keywords].sort((a, b) => a.localeCompare(b, "ru"));
}

export const EXPANDED_KEYWORD_COUNT = buildExpandedKeywordCore().length;

export { KEYWORD_CLUSTERS };
