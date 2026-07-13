// Общие константы сайта для SEO/мета/sitemap.

// Базовый URL продакшена. Можно переопределить через переменную окружения.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://benzryadom.ru"
).replace(/\/$/, "");

// Название и контакты сервиса.
export const SITE_NAME = "бензрядом";
export const SITE_DESCRIPTION =
  "Краудсорсинговая карта заправок России: где есть бензин, лимиты на руки и очереди рядом с АЗС в реальном времени.";

/** Изображение для Open Graph / соцсетей (1200×628 — VK/Telegram). */
export const OG_IMAGE_PATH = "/social/og-default-1200x628.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 628;
export const OG_IMAGE_ALT = "бензрядом — карта наличия топлива на АЗС России";

// ID приложения VK Mini App (из настроек vk.com/apps?act=manage).
// Задаётся через NEXT_PUBLIC_VK_APP_ID на сервере.
export const VK_APP_ID = process.env.NEXT_PUBLIC_VK_APP_ID?.trim() || "";

// Каналы и сообщества (внутри — новости, бот и ссылка на карту).
export const TELEGRAM_BOT_URL = "https://t.me/BenzRyadom";
export const TELEGRAM_HANDLE = "@BenzRyadom";
export const TELEGRAM_BOT_TAGLINE =
  "Канал в Telegram — новости «бензрядом» и доступ к карте";

/** Подписка на канал/группу — для плашек и чипов. */
export function telegramChannelUrl(medium: string): string {
  const url = new URL(TELEGRAM_BOT_URL);
  url.searchParams.set("utm_source", "benzryadom");
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", "tg_subscribe");
  return url.toString();
}

/** @deprecated Для подписок используйте telegramChannelUrl — ведёт в канал, не в /start бота. */
export function telegramBotUrl(medium: string): string {
  return telegramChannelUrl(medium);
}

export const VK_COMMUNITY_URL = "https://vk.com/benzryadom";
/** Чат сообщества (запасной канал). */
export const VK_BOT_URL =
  "https://vk.com/im/convo/-239946152?entrypoint=community_page&tab=all";

/** Ссылка на сообщество VK с UTM. */
export function vkCommunityTrackUrl(medium: string): string {
  const url = new URL(VK_COMMUNITY_URL);
  url.searchParams.set("utm_source", "benzryadom");
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", "vk_subscribe");
  return url.toString();
}

/** @deprecated Для подписок предпочтительнее vkCommunityTrackUrl. */
export function vkBotTrackUrl(medium: string): string {
  return vkCommunityTrackUrl(medium);
}

export const VK_HANDLE = "Сообщество";
export const VK_BOT_TAGLINE =
  "Сообщество ВКонтакте — новости и ссылка на карту";

/** Канал в мессенджере MAX. */
export const MAX_BOT_URL = "https://max.ru/se13507148_biz";
export const MAX_HANDLE = "Канал";
export const MAX_BOT_TAGLINE =
  "Канал в MAX — часто работает, когда сайт тормозит или интернет ограничен";

/** Канал MAX с UTM для аналитики кликов с сайта. */
export function maxBotTrackUrl(medium: string): string {
  const url = new URL(MAX_BOT_URL);
  url.searchParams.set("utm_source", "benzryadom");
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", "max_subscribe");
  return url.toString();
}

/** @deprecated Используйте TELEGRAM_BOT_URL */
export const TELEGRAM_URL = TELEGRAM_BOT_URL;
/** Основная ссылка на VK-бота (для кнопок «написать боту»). */
export const VK_URL = VK_BOT_URL;

// Предложения по улучшению — в Telegram с заготовленным текстом.
export const FEEDBACK_TELEGRAM_URL = `${TELEGRAM_URL}?text=${encodeURIComponent(
  "Предложение по улучшению «бензрядом»: "
)}`;

// Донаты (CloudTips / Т-Банк). Задаётся через NEXT_PUBLIC_DONATE_URL на сервере.
export const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL?.trim() || "";

// Абсолютный URL для канонических ссылок и OpenGraph.
export function absoluteUrl(path = "/"): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}
