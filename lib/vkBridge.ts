// Интеграция с VK Bridge — запуск приложения как VK Mini App.
// Вне ВК (обычный браузер, обычный benzryadom.ru) все функции — безопасные
// no-op/фолбэки, так что этот модуль можно импортировать в общий клиентский
// код без ветвления "VK или нет" на каждом вызывающем месте.

import bridge from "@vkontakte/vk-bridge";

let initStarted = false;

/**
 * Приложение открыто внутри ВК (iframe vk.com/app… или мобильный webview)?
 * ВК всегда добавляет vk_app_id к query string лончинга Mini App.
 */
export function isVkEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("vk_app_id");
}

/** Разово инициализирует VK Bridge. Безопасно вызывать и вне ВК (просто ничего не делает). */
export function initVkBridge(): void {
  if (initStarted || !isVkEnvironment()) return;
  initStarted = true;
  bridge.send("VKWebAppInit").catch(() => {
    /* мост недоступен (старый клиент ВК) — приложение продолжает работать как обычный сайт */
  });
}

/** Сырая query-строка параметров лончинга (vk_user_id, vk_app_id, sign, …) — для передачи на сервер для верификации. */
export function getVkLaunchParamsString(): string | null {
  if (!isVkEnvironment()) return null;
  return window.location.search.replace(/^\?/, "");
}

/**
 * Геолокация через нативный мост ВК: работает и там, где браузерный
 * navigator.geolocation недоступен или не выдаёт разрешение (мобильные
 * webview-клиенты ВК на iOS/Android). Возвращает null вне ВК или при отказе —
 * вызывающий код должен в этом случае откатиться на обычный geolocation.
 */
export async function getVkGeodata(): Promise<{ lat: number; lng: number } | null> {
  if (!isVkEnvironment()) return null;
  try {
    const data = await bridge.send("VKWebAppGetGeodata");
    if (!data.available || typeof data.lat !== "number" || typeof data.long !== "number") {
      return null;
    }
    return { lat: data.lat, lng: data.long };
  } catch {
    return null;
  }
}

/** Нативное «Поделиться» через ВК. Вне ВК — false, вызывающий код должен откатиться на copyOrShare(). */
export async function shareVk(url: string): Promise<boolean> {
  if (!isVkEnvironment()) return false;
  try {
    await bridge.send("VKWebAppShare", { link: url });
    return true;
  } catch {
    return false;
  }
}
