import {
  maxBotTrackUrl,
  telegramChannelUrl,
  vkCommunityTrackUrl,
} from "@/lib/site";

export const SEO_SUBSCRIBE_CHANNELS = [
  {
    brand: "telegram" as const,
    name: "Telegram",
    benefit: "Связь с командой и идеи по улучшению карты",
    href: (medium: string) => telegramChannelUrl(medium),
  },
  {
    brand: "max" as const,
    name: "MAX",
    benefit: "Работает, когда сайт тормозит или интернет ограничен",
    href: (medium: string) => maxBotTrackUrl(medium),
  },
  {
    brand: "vk" as const,
    name: "ВКонтакте",
    benefit: "Запасной канал при сбоях и блокировках связи",
    href: (medium: string) => vkCommunityTrackUrl(medium),
  },
] as const;

export const SEO_SHARE_MOTIVATION =
  "Чем больше людей на карте — тем чаще обновляются отметки на заправках. Скиньте ссылку водителям в чат.";

export const SEO_SUBSCRIBE_MOTIVATION =
  "Подпишитесь на канал, который у вас открывается — так не потеряете связь, когда сайт недоступен.";
