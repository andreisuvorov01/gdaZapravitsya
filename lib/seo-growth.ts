// Приоритеты SEO-роста: ядро запросов, города/бренды с трафиком, кластеры.

import { CITY_PRESETS, findCityBySlug, type CityPreset } from "./cities";
import { findBrandBySlug, type BrandEntry } from "./brand-slugs";

/** Уровень подтверждённого спроса из поисковых кабинетов. */
export type DemandTier = "hot" | "warm" | "cold";

export interface KeywordCluster {
  id: string;
  /** Человекочитаемое имя кластера */
  label: string;
  /** Базовые запросы без города */
  seeds: string[];
  /** Соответствующий intent-slug или шаблон страницы */
  pageFamily: "intent-city" | "city" | "city-fuel" | "brand-city";
  intentSlug?: string;
  tier: DemandTier;
}

/**
 * Города с подтверждённым входящим трафиком (Метрика, первые 5 дней).
 * Порядок — по убыванию визитов на страницы входа.
 */
export const TRAFFIC_WINNER_CITY_SLUGS = [
  "kirov",
  "vologda",
  "perm",
  "nizhniy-novgorod",
  "kirovo-chepetsk",
  "penza",
  "saransk",
  "lipetsk",
  "yoshkar-ola",
  "tambov",
  "berezniki",
  "cherepovets",
  "glazov",
  // Стратегический регион владельца
  "krasnodar",
  "maykop",
  "armavir",
  "anapa",
  "sochi",
  "rostov-na-donu",
] as const;

/** Сети с подтверждённым трафиком на brand+city страницах. */
export const TRAFFIC_WINNER_BRAND_SLUGS = ["lukoil", "rosneft", "gazprom-neft"] as const;

/** Интенты в порядке приоритета для перелинковки (сначала самые сильные). */
export const PRIORITY_INTENT_SLUGS = [
  "gde-est-benzin",
  "gde-benzin",
  "gde-kupit-benzin",
  "nalichie-benzina",
  "na-kakoy-zapravke",
  "benzin-segodnya",
  "proverit-benzin",
  "narodnaya-karta-azs",
  "zapravki-rabotayut",
  "kogda-budet-benzin",
  "karta-zapravok",
  "karta-benzina",
  "gde-zapravitsya",
  "chto-s-zapravkami",
  "deficit-benzina",
  "ocheredi-na-azs",
  "limity-na-benzin",
  "ceny-benzina",
  "net-benzina",
  "kak-najti-benzin",
] as const;

/** Карта кластеров для Topvisor и планирования контента. */
export const KEYWORD_CLUSTERS: KeywordCluster[] = [
  {
    id: "gde-benzin",
    label: "Где бензин",
    seeds: ["где бензин", "где бензин сейчас", "где сейчас есть бензин"],
    pageFamily: "intent-city",
    intentSlug: "gde-benzin",
    tier: "hot",
  },
  {
    id: "gde-est-benzin",
    label: "Где есть бензин",
    seeds: [
      "где есть бензин",
      "где есть бензин сейчас",
      "где есть бензин в",
      "где бензин киров",
      "где бензин вологда",
      "где есть бензин в кирове бензрядом",
    ],
    pageFamily: "intent-city",
    intentSlug: "gde-est-benzin",
    tier: "hot",
  },
  {
    id: "gde-kupit-benzin",
    label: "Где купить бензин",
    seeds: ["где купить бензин", "где купить бензин сейчас", "где можно купить бензин"],
    pageFamily: "intent-city",
    intentSlug: "gde-kupit-benzin",
    tier: "hot",
  },
  {
    id: "proverit-benzin",
    label: "Проверить бензин",
    seeds: [
      "как проверить бензин",
      "проверить наличие бензина",
      "проверить бензин на заправке",
    ],
    pageFamily: "intent-city",
    intentSlug: "proverit-benzin",
    tier: "warm",
  },
  {
    id: "kogda-budet-benzin",
    label: "Когда будет бензин",
    seeds: ["когда будет бензин", "когда привезут бензин", "когда завезут бензин"],
    pageFamily: "intent-city",
    intentSlug: "kogda-budet-benzin",
    tier: "warm",
  },
  {
    id: "narodnaya-karta",
    label: "Народная карта",
    seeds: ["народная карта азс", "народная карта бензина", "народная карта заправок"],
    pageFamily: "intent-city",
    intentSlug: "narodnaya-karta-azs",
    tier: "hot",
  },
  {
    id: "zapravki-rabotayut",
    label: "Заправки работают",
    seeds: [
      "какие заправки работают",
      "где заправки работают",
      "работающие заправки",
      "на каких заправках есть бензин",
    ],
    pageFamily: "intent-city",
    intentSlug: "zapravki-rabotayut",
    tier: "hot",
  },
  {
    id: "net-benzina",
    label: "Нет бензина",
    seeds: ["нет бензина на заправке", "нет бензина", "почему нет бензина"],
    pageFamily: "intent-city",
    intentSlug: "net-benzina",
    tier: "warm",
  },
  {
    id: "deficit-benzina",
    label: "Дефицит бензина",
    seeds: ["дефицит бензина", "ситуация с бензином", "что с бензином в россии"],
    pageFamily: "intent-city",
    intentSlug: "deficit-benzina",
    tier: "warm",
  },
  {
    id: "ceny-benzina",
    label: "Цены на бензин",
    seeds: ["цены на бензин сегодня", "цена бензина", "сколько стоит бензин"],
    pageFamily: "intent-city",
    intentSlug: "ceny-benzina",
    tier: "warm",
  },
  {
    id: "nalichie",
    label: "Наличие бензина",
    seeds: [
      "наличие бензина",
      "наличие бензина на азс",
      "наличие бензина на заправках",
      "карта наличия бензина",
    ],
    pageFamily: "intent-city",
    intentSlug: "nalichie-benzina",
    tier: "hot",
  },
  {
    id: "na-kakoy",
    label: "На какой заправке",
    seeds: ["на каких заправках есть бензин", "на какой заправке есть бензин"],
    pageFamily: "intent-city",
    intentSlug: "na-kakoy-zapravke",
    tier: "hot",
  },
  {
    id: "benzin-segodnya",
    label: "Бензин сегодня",
    seeds: ["бензин сегодня", "где бензин сегодня", "бензин сейчас"],
    pageFamily: "intent-city",
    intentSlug: "benzin-segodnya",
    tier: "hot",
  },
  {
    id: "karta-zapravok",
    label: "Карта заправок",
    seeds: ["карта заправок", "карта азс", "азс на карте", "заправки на карте"],
    pageFamily: "intent-city",
    intentSlug: "karta-zapravok",
    tier: "warm",
  },
  {
    id: "karta-benzina",
    label: "Карта бензина",
    seeds: ["карта бензина", "карта наличия бензина", "где бензин карта"],
    pageFamily: "intent-city",
    intentSlug: "karta-benzina",
    tier: "warm",
  },
  {
    id: "gde-zapravitsya",
    label: "Где заправиться",
    seeds: ["где заправиться", "куда заехать за бензином"],
    pageFamily: "intent-city",
    intentSlug: "gde-zapravitsya",
    tier: "warm",
  },
  {
    id: "ocheredi",
    label: "Очереди",
    seeds: ["очередь на заправке", "очереди на азс", "очередь на азс"],
    pageFamily: "intent-city",
    intentSlug: "ocheredi-na-azs",
    tier: "warm",
  },
  {
    id: "limity",
    label: "Лимиты",
    seeds: ["лимит на бензин", "лимиты на заправку", "сколько литров на руки"],
    pageFamily: "intent-city",
    intentSlug: "limity-na-benzin",
    tier: "warm",
  },
  {
    id: "city-fuel",
    label: "Город + топливо",
    seeds: ["бензин аи-95", "дизель", "где аи-92", "где дизель"],
    pageFamily: "city-fuel",
    tier: "warm",
  },
  {
    id: "brand-city",
    label: "Сеть + город",
    seeds: ["лукойл", "роснефть", "газпромнефть"],
    pageFamily: "brand-city",
    tier: "hot",
  },
  {
    id: "city",
    label: "Город",
    seeds: ["где есть бензин в", "бензин в", "азс"],
    pageFamily: "city",
    tier: "hot",
  },
];

export function getTrafficWinnerCities(): CityPreset[] {
  return TRAFFIC_WINNER_CITY_SLUGS.map((slug) => findCityBySlug(slug)).filter(
    (c): c is CityPreset => Boolean(c)
  );
}

export function getTrafficWinnerBrands(): BrandEntry[] {
  return TRAFFIC_WINNER_BRAND_SLUGS.map((slug) => findBrandBySlug(slug)).filter(
    (b): b is BrandEntry => Boolean(b)
  );
}

/** Города для блока перелинковки: сначала трафиковые, потом соседи по алфавиту. */
export function getRelatedCitiesForLinking(
  currentSlug: string,
  limit = 10
): CityPreset[] {
  const winners = getTrafficWinnerCities().filter((c) => c.slug !== currentSlug);
  const rest = CITY_PRESETS.filter(
    (c) =>
      c.slug !== currentSlug &&
      !TRAFFIC_WINNER_CITY_SLUGS.includes(c.slug as (typeof TRAFFIC_WINNER_CITY_SLUGS)[number])
  );
  return [...winners, ...rest].slice(0, limit);
}

/** Все seed-запросы для импорта в Topvisor. */
export function collectSeedKeywords(): string[] {
  const base = KEYWORD_CLUSTERS.flatMap((c) => c.seeds);
  const branded = ["бензрядом", "benzryadom"];
  return [...new Set([...base, ...branded])];
}
