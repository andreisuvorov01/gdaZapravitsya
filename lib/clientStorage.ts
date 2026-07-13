/** Ключ уведомления о cookie. */
export const COOKIE_NOTICE_KEY = "cookie_notice_v1";

/** Чтение/запись флагов «уже показано» (localStorage + sessionStorage для инкогнито). */

export function isDismissed(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(key) || sessionStorage.getItem(key));
  } catch {
    // Хранилище недоступно — считаем, что ещё не закрывали (показываем снова).
    return false;
  }
}

export function markDismissed(key: string, value = "1"): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* localStorage недоступен */
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* sessionStorage недоступен */
  }
}

export function readTimestamp(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeTimestamp(key: string): void {
  markDismissed(key, String(Date.now()));
}
