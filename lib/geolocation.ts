/**
 * Геолокация: браузерный API + VK Bridge (внутри VK Mini App).
 *
 * В мобильных webview-клиентах ВК (iOS/Android) браузерный
 * navigator.geolocation часто недоступен или не выдаёт разрешение.
 * Внутри VK используем VKWebAppGetGeodata как основной путь,
 * с фолбэком на браузерный API вне ВК.
 */

import { getVkGeodata, isVkEnvironment } from "./vkBridge";

/** Сообщение при ошибке определения местоположения. */
export const GEO_FAIL_HINT = "Не удалось найти, возможно включен VPN";

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

/**
 * Получить координаты: VK Bridge (внутри VK) → браузерный API (вне VK).
 *
 * @returns Promise с { lat, lng } или null, если геолокация недоступна/отклонена.
 */
export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  // Внутри VK — сначала через нативный мост
  if (isVkEnvironment()) {
    const vkPos = await getVkGeodata();
    if (vkPos) return vkPos;
    // Если VK Bridge не дал гео (отказ/недоступен) — пробуем браузерный API
  }

  // Браузерный API (вне VK или как фолбэк)
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
 * Внутри VK пытается сначала VK Bridge, затем браузерный API.
 */
export function getCurrentPositionWithCallbacks(
  onSuccess: (lat: number, lng: number) => void,
  onError: () => void,
  options?: PositionOptions
): void {
  if (isVkEnvironment()) {
    getVkGeodata().then((vkPos) => {
      if (vkPos) {
        onSuccess(vkPos.lat, vkPos.lng);
        return;
      }
      // Фолбэк на браузерный API
      fallbackToBrowserGeo(onSuccess, onError, options);
    });
    return;
  }

  fallbackToBrowserGeo(onSuccess, onError, options);
}

function fallbackToBrowserGeo(
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
