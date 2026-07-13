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
