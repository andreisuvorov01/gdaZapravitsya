// Общие константы сайта для SEO/мета/sitemap.

// Базовый URL продакшена. Можно переопределить через переменную окружения.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://benzatlas.ru"
).replace(/\/$/, "");

// Название и контакты сервиса.
export const SITE_NAME = "Бенз-Атлас";
export const SITE_DESCRIPTION =
  "Краудсорсинговый атлас заправок России: где есть бензин, лимиты на руки и очереди рядом с АЗС в реальном времени.";

/** Изображение для Open Graph. */
export const OG_IMAGE_PATH = "/social/og-default-1200x628.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 628;
export const OG_IMAGE_ALT = "Бенз-Атлас — карта наличия топлива на АЗС России";

// Донаты (CloudTips / Т-Банк). Задаётся через NEXT_PUBLIC_DONATE_URL на сервере.
export const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL?.trim() || "";

// Абсолютный URL для канонических ссылок и OpenGraph.
export function absoluteUrl(path = "/"): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}
