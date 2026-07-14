import type { CreateReportPayload } from "./types";

/** Очередь недоставленных отчётов (IndexedDB — доступна и из sw.js на событии
    'sync', в отличие от localStorage). Используется, когда POST /api/reports
    падает из-за отсутствия сети: отчёт не теряется, а досылается сам, как
    только появится связь (Background Sync, см. public/sw.js), с фолбэком на
    window 'online' для браузеров без поддержки (Safari/iOS). */

const DB_NAME = "gdezapravitsya-queue";
const DB_VERSION = 1;
const STORE = "reports";
const SYNC_TAG = "sync-reports";

export interface QueuedReport {
  id?: number;
  payload: CreateReportPayload;
  clientId: string;
  queuedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueReport(payload: CreateReportPayload, clientId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ payload, clientId, queuedAt: Date.now() } satisfies QueuedReport);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  try {
    const reg = await navigator.serviceWorker?.ready;
    const syncReg = reg as
      | (ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } })
      | undefined;
    if (syncReg?.sync) await syncReg.sync.register(SYNC_TAG);
  } catch {
    // Background Sync недоступен (Safari) или регистрация не готова —
    // ничего страшного, досошлём на следующем online-событии (см. ниже).
  }
}

/** Отправляет отчёт как обычно; при сетевом сбое (не при ошибке валидации на
    сервере — та не станет успешной от повтора) сохраняет его в очередь вместо
    показа ошибки пользователю. */
export async function submitOrQueueReport(
  payload: CreateReportPayload,
  clientId: string
): Promise<{ queued: boolean }> {
  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(String(j.error ?? "Не удалось отправить"));
    }
    return { queued: false };
  } catch (err) {
    if (err instanceof TypeError) {
      await enqueueReport(payload, clientId);
      return { queued: true };
    }
    throw err;
  }
}

export async function queuedReportsCount(): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  try {
    const db = await openDb();
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return count;
  } catch {
    return 0;
  }
}

/** Фолбэк для браузеров без Background Sync — вызывать на window 'online'.
    Останавливается на первом сетевом сбое (значит, всё ещё офлайн). */
export async function retryQueuedReports(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return;
  }
  const items = await new Promise<QueuedReport[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedReport[]);
    req.onerror = () => reject(req.error);
  });
  for (const item of items) {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": item.clientId,
        },
        body: JSON.stringify(item.payload),
      });
      if (!res.ok) continue;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(item.id!);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      break;
    }
  }
  db.close();
}
