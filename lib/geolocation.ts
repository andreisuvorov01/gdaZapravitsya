/** Геолокация — обёртка над браузерным navigator.geolocation API. */

/** Сообщение при ошибке определения местоположения. */
export const GEO_FAIL_HINT = "Не удалось найти, возможно включен VPN";

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

/**
 * Получить координаты через браузерный API.
 *
 * @returns Promise с { lat, lng } или null, если геолокация недоступна/отклонена.
 */
export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  if (!isGeolocationSupported()) return null;

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/**
 * Грубая позиция сразу (короткий таймаут, разрешён кэш до 5 минут — обычно
 * IP/Wi-Fi фикс приходит почти мгновенно), затем уточнение через GPS в
 * фоне — вызывает onFix дважды (сначала precise=false, потом precise=true),
 * не блокируя первый рендер ожиданием точного фикса.
 */
export function getProgressivePosition(
  onFix: (lat: number, lng: number, precise: boolean) => void,
  onError: () => void,
  options?: { preciseTimeout?: number }
): void {
  if (!isGeolocationSupported()) {
    onError();
    return;
  }
  let gotAny = false;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      gotAny = true;
      onFix(pos.coords.latitude, pos.coords.longitude, false);
    },
    () => {},
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
  );

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      gotAny = true;
      onFix(pos.coords.latitude, pos.coords.longitude, true);
    },
    () => {
      if (!gotAny) onError();
    },
    { enableHighAccuracy: true, timeout: options?.preciseTimeout ?? 15000, maximumAge: 0 }
  );
}

/**
 * Обёртка над navigator.geolocation.getCurrentPosition с колбэками
 * (для обратной совместимости с существующим кодом в AppShell).
 */
export function getCurrentPositionWithCallbacks(
  onSuccess: (lat: number, lng: number) => void,
  onError: () => void,
  options?: PositionOptions
): void {
  if (!isGeolocationSupported()) {
    onError();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess(pos.coords.latitude, pos.coords.longitude),
    () => onError(),
    options ?? { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}
