// Популярные города для перелинковки в подвале и на главной.

import { findCityBySlug } from "./cities";
import { TRAFFIC_WINNER_CITY_SLUGS } from "./seo-growth";

/** Сначала города с подтверждённым трафиком, затем крупнейшие. */
export const HOME_FEATURED_CITY_SLUGS = [
  ...TRAFFIC_WINNER_CITY_SLUGS,
  "moskva",
  "sankt-peterburg",
  "kazan",
  "novosibirsk",
  "ekaterinburg",
  "voronezh",
  "samara",
] as const;

export const HOME_FEATURED_CITIES = [...new Set(HOME_FEATURED_CITY_SLUGS)]
  .map((slug) => findCityBySlug(slug))
  .filter((c): c is NonNullable<typeof c> => Boolean(c))
  .slice(0, 14);

export const HOME_SEO_KEYWORDS = [
  "где бензин сейчас",
  "где есть бензин",
  "бензин сегодня",
  "карта заправок",
  "карта бензина",
  "наличие бензина на азс",
  "наличие бензина на заправках",
  "где заправиться",
  "на какой заправке есть бензин",
  "очередь на заправку",
  "лимит на бензин",
  "гдезаправиться",
] as const;

/** Главный ключ + бренд — для title и H1 (вопрос, как в поиске). */
export const HOME_PAGE_TITLE =
  "Где бензин сейчас? Бенз-Атлас — карта АЗС России";

/** Продолжение после бренда на главной (lead под H1). */
export const HOME_H1_CONTINUATION =
  "народная карта заправок — водители отмечают, где есть бензин и дизель, очередь и лимит на руки";

export const HOME_PAGE_DESCRIPTION =
  "Где бензин сейчас? Бенз-Атлас — карта АЗС России: наличие топлива, очереди и лимиты по отметкам водителей. Бесплатно, без регистрации.";
