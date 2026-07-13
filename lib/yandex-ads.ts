/** Настройки блоков Яндекс РСЯ (partner.yandex.ru). */

export type YandexRtbSlot = "top" | "inarticle" | "footer";

// Статические обращения к process.env — иначе Next.js не вшивает NEXT_PUBLIC_* в клиентский бандл.
const BLOCK_IDS: Record<YandexRtbSlot, string | undefined> = {
  top: process.env.NEXT_PUBLIC_YANDEX_RTB_BLOCK_TOP,
  inarticle: process.env.NEXT_PUBLIC_YANDEX_RTB_BLOCK_INARTICLE,
  footer: process.env.NEXT_PUBLIC_YANDEX_RTB_BLOCK_FOOTER,
};

function normalizeBlockId(raw: string | undefined): string | null {
  const v = raw?.trim();
  if (!v || v.includes("YOUR")) return null;
  return v;
}

/** Есть хотя бы один настроенный blockId. */
export function isYandexRtbConfigured(): boolean {
  return (["top", "inarticle", "footer"] as YandexRtbSlot[]).some((s) =>
    Boolean(normalizeBlockId(BLOCK_IDS[s]))
  );
}

/** Явное отключение через env (даже если blockId задан). */
export function isYandexRtbEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_YANDEX_RTB_ENABLED === "false") return false;
  return isYandexRtbConfigured();
}

export function getYandexBlockId(slot: YandexRtbSlot): string | null {
  if (!isYandexRtbEnabled()) return null;
  return normalizeBlockId(BLOCK_IDS[slot]);
}

export const YANDEX_RTB_SCRIPT = "https://yandex.ru/ads/system/context.js";
