// Минимальный безопасный service worker для «Бенз-Атлас».
// Стратегия: network-first для навигаций (всегда свежие данные),
// с откатом на кэш при оффлайне. Статику кэшируем по мере запроса.
// /api/stations — тоже network-first, с кэшем по bbox только на случай
// офлайна (см. ниже); остальные /api/* всегда идут по сети — не кэшируем.
// Тайлы/стиль/шрифты базовой карты — отдельное исключение (см. ниже): это
// статическая инфраструктура (дороги, подписи), которая почти не меняется,
// поэтому кэшируем агрессивно ради скорости повторных заходов.

const CACHE = "gdezapravitsya-v1";
const TILE_CACHE = "gdezapravitsya-tiles-v1";
const API_CACHE = "gdezapravitsya-api-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];
// Кэш /api/stations по bbox (см. ниже) — старше этого не отдаём даже офлайн,
// сильно устаревшие данные о наличии топлива хуже, чем их отсутствие.
const API_CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const API_CACHE_MAX_ENTRIES = 40;
// Хост тайлов/стиля/спрайтов/шрифтов карты (см. NEXT_PUBLIC_MAP_STYLE в .env —
// если он переопределён на другой хост, эта карта-исключение просто не сработает
// и запросы уйдут в обычную сетевую обработку ниже).
const MAP_TILE_HOSTS = new Set(["tiles.openfreemap.org"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== TILE_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Грубый лимит на число закэшированных bbox — иначе кэш растёт бесконечно
    по мере панорамирования карты за долгую офлайн-сессию. FIFO по порядку
    вставки (Cache API не хранит явную дату вставки, только порядок ключей). */
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  const excess = keys.length - maxEntries;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map((k) => cache.delete(k)));
}

// Очередь отчётов, отправленных офлайн (см. lib/reportQueue.ts — та же
// IndexedDB-база и стор, здесь только читаем/дочищаем на событии 'sync').
const QUEUE_DB = "gdezapravitsya-queue";
const QUEUE_STORE = "reports";

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function flushReportQueue() {
  const db = await openQueueDb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
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
      await new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, "readwrite");
        tx.objectStore(QUEUE_STORE).delete(item.id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Сеть всё ещё недоступна — браузер сам повторит 'sync' позже,
      // остальные элементы очереди подождут вместе с этим.
      break;
    }
  }
  db.close();
}

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-reports") {
    event.waitUntil(flushReportQueue());
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Тайлы карты: stale-while-revalidate — отдаём из кэша мгновенно (если есть),
  // параллельно обновляем в фоне для следующего раза. Не блокирует показ картой
  // ожиданием сети, но и не даёт данным протухнуть навсегда.
  if (MAP_TILE_HOSTS.has(url.hostname)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Только свой домен дальше.
  if (url.origin !== self.location.origin) return;

  // /api/stations: сеть всегда в приоритете (свежесть данных о топливе важнее
  // скорости) — кэш по bbox (сам URL с query — естественный ключ) только как
  // офлайн-подстраховка, не старше API_CACHE_MAX_AGE_MS. Остальные /api/*
  // не трогаем — там нет смысла отдавать что-то офлайн (отправка отчётов и т.п.).
  if (url.pathname === "/api/stations") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches
              .open(API_CACHE)
              .then(async (cache) => {
                await trimCache(cache, API_CACHE_MAX_ENTRIES - 1);
                cache.put(req, copy);
              })
              .catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(API_CACHE);
          const cached = await cache.match(req);
          if (!cached) return Response.error();
          const dateHeader = cached.headers.get("date");
          const age = dateHeader ? Date.now() - new Date(dateHeader).getTime() : Infinity;
          if (age > API_CACHE_MAX_AGE_MS) return Response.error();
          const headers = new Headers(cached.headers);
          headers.set("x-served-by", "sw-cache");
          return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers,
          });
        })
    );
    return;
  }
  if (url.pathname.startsWith("/api/")) return;

  // Навигации: сеть, при сбое — кэш, затем главная.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Статика (_next/static, иконки, шрифты): cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|woff2?|png|svg|jpg|jpeg|webp)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
      )
    );
  }
});
