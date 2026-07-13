/** Тексты и ссылки для «Поделиться» на SEO-страницах городов. */

import { maxBotTrackUrl } from "@/lib/site";

export type ShareChannel = "telegram" | "vk" | "whatsapp" | "max" | "copy" | "native";

export interface SeoSharePayload {
  title: string;
  text: string;
  url: string;
}

function withUtm(url: string, medium: ShareChannel): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "share");
    u.searchParams.set("utm_medium", medium);
    u.searchParams.set("utm_campaign", "seo_city");
    return u.toString();
  } catch {
    return url;
  }
}

/** Сообщение для мессенджеров — короткое, с брендом для узнаваемости. */
export function buildSeoSharePayload(opts: {
  pageUrl: string;
  cityName: string;
  cityPrep: string;
  pageTitle: string;
}): SeoSharePayload {
  const text = `Где есть бензин в ${opts.cityPrep} сейчас — живая карта АЗС на бензрядом. Очереди, лимиты, отметки водителей.`;
  return {
    title: opts.pageTitle,
    text,
    url: withUtm(opts.pageUrl, "copy"),
  };
}

export function shareChannelUrl(
  channel: Exclude<ShareChannel, "copy" | "native">,
  payload: SeoSharePayload
): string {
  const url = withUtm(payload.url, channel);
  const full = `${payload.text}\n${url}`;

  switch (channel) {
    case "telegram":
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(payload.text)}`;
    case "vk":
      return `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(payload.title)}&comment=${encodeURIComponent(payload.text)}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(full)}`;
    case "max":
      return maxBotTrackUrl("share_max");
    default:
      return url;
  }
}

export const SHARE_CHANNELS: {
  id: ShareChannel;
  label: string;
  hint: string;
}[] = [
  { id: "telegram", label: "Telegram", hint: "Отправить в чат или канал" },
  { id: "vk", label: "ВКонтакте", hint: "Запись или личные сообщения" },
  { id: "whatsapp", label: "WhatsApp", hint: "Скинуть знакомым водителям" },
  { id: "max", label: "MAX", hint: "Открыть бота в MAX" },
  { id: "copy", label: "Скопировать ссылку", hint: "Вставить куда угодно" },
  { id: "native", label: "Ещё…", hint: "Системное меню «Поделиться»" },
];
