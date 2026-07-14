/** Тактильный отклик — no-op там, где Vibration API недоступен (iOS Safari). */

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* некоторые браузеры бросают, если вызвано вне жеста пользователя — тихо игнорируем */
  }
}

/** Лёгкий тик — защёлкивание шторки/снэпа, смена выбора. */
export function hapticTick(): void {
  vibrate(10);
}

/** Подтверждение действия — успешная отправка отчёта. */
export function hapticSuccess(): void {
  vibrate([10, 40, 15]);
}

/** Долгое нажатие сработало (например, добавление станции на карте). */
export function hapticLongPress(): void {
  vibrate(20);
}
