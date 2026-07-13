/** Триггеры и тайминги плашки подписки на Telegram / MAX. */

import { readTimestamp, writeTimestamp } from "./clientStorage";

export const CHANNEL_DISMISS_KEY = "channelBannerDismissAt";
export const CHANNEL_SESSION_KEY = "channelBannerSession";
export const CHANNEL_LAST_VISIT_KEY = "channelBannerLastVisitAt";

/** Короткий cooldown — повторно показываем плашку раз в сутки. */
export const CHANNEL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const CHANNEL_TIMER_MS = 60_000;
export const CHANNEL_RETURN_DELAY_MS = 15_000;
export const CHANNEL_REPORT_DELAY_MS = 1_500;

const RETURN_GAP_MS = 30 * 60 * 1000;
const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type ChannelPromptReason = "report" | "return" | "exit" | "timer";

export const CHANNEL_PROMPT_EVENT = "benzryadom:channel-prompt";

export type ChannelPromptCopy = {
  title: string;
  hint: string;
};

export const CHANNEL_COPY: Record<ChannelPromptReason, ChannelPromptCopy> = {
  report: {
    title: "Спасибо за помощь!",
    hint: "Подпишитесь в Telegram или MAX — новости сервиса и связь с картой, если сайт недоступен",
  },
  return: {
    title: "Вы снова на карте",
    hint: "Подпишитесь, чтобы не потерять связь с нами — новости в Telegram или MAX",
  },
  exit: {
    title: "Сохраните связь с сервисом",
    hint: "Telegram или MAX — новости «бензрядом», часто работает, когда сайт тормозит",
  },
  timer: {
    title: "Не потеряйте связь",
    hint: "Подпишитесь в Telegram или MAX — новости сервиса и доступ к карте из мессенджера",
  },
};

export function dispatchChannelPrompt(reason: ChannelPromptReason): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ChannelPromptReason>(CHANNEL_PROMPT_EVENT, { detail: reason }),
  );
}

export function wasChannelDismissedRecently(): boolean {
  const ts = readTimestamp(CHANNEL_DISMISS_KEY);
  if (!ts) return false;
  return Date.now() - ts < CHANNEL_COOLDOWN_MS;
}

export function wasChannelShownThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(CHANNEL_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markChannelSession(): void {
  try {
    sessionStorage.setItem(CHANNEL_SESSION_KEY, "1");
  } catch {
    /* sessionStorage недоступен */
  }
}

export function dismissChannelPrompt(): void {
  writeTimestamp(CHANNEL_DISMISS_KEY);
  markChannelSession();
}

/** Пока TG-плашка не закрыта или ещё может появиться — install не показываем. */
export function channelBlocksInstallThisSession(): boolean {
  if (wasChannelShownThisSession()) return true;
  return !wasChannelDismissedRecently();
}

export function canShowChannelPrompt(): boolean {
  return !wasChannelDismissedRecently() && !wasChannelShownThisSession();
}

/** Второй и последующие визиты за неделю (пауза между сессиями ≥ 30 мин). */
export function consumeReturnVisit(): boolean {
  const now = Date.now();
  const last = readTimestamp(CHANNEL_LAST_VISIT_KEY);
  writeTimestamp(CHANNEL_LAST_VISIT_KEY);

  if (!last) return false;
  const gap = now - last;
  return gap >= RETURN_GAP_MS && gap <= RETURN_WINDOW_MS;
}

export function isChannelPromptDevMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    process.env.NODE_ENV === "development" &&
    new URLSearchParams(window.location.search).get("channel") === "1"
  );
}
