// Анонимный идентификатор клиента для базовой защиты от спама (rate-limit).
// Хранится в localStorage, отправляется на сервер заголовком x-client-id.
// Внутри VK Mini App — использует vk_user_id из launch params (если доступен)
// как более стабильный идентификатор, чем localStorage UUID.

import { isVkEnvironment } from "./vkBridge";

const KEY = "bz_client_id";
let memoryId: string | null = null;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Получить vk_user_id из query-параметров (если мы внутри VK).
 * ВК добавляет vk_user_id к launch params при открытии Mini App.
 */
function getVkUserId(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const uid = params.get("vk_user_id");
  return uid && /^\d+$/.test(uid) ? `vk:${uid}` : null;
}

export function getClientId(): string {
  if (typeof window === "undefined") return "server";

  // Внутри VK — используем vk_user_id как стабильный идентификатор
  if (isVkEnvironment()) {
    const vkId = getVkUserId();
    if (vkId) return vkId;
  }

  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = newId();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    if (!memoryId) memoryId = newId();
    return memoryId;
  }
}
