// Минимальный безопасный service worker для «ГдеЗаправиться.рф».
// Стратегия: network-first для навигаций (всегда свежие данные),
// с откатом на кэш при оффлайне. Статику кэшируем по мере запроса.
// API и данные о заправках (свежесть важна) всегда идут по сети — не кэшируем.
// Тайлы/стиль/шрифты базовой карты — отдельное исключение (см. ниже): это
// статическая инфраструктура (дороги, подписи), которая почти не меняется,
// поэтому кэшируем агрессивно ради скорости повторных заходов.

const CACHE = "gdezapravitsya-v1";
const TILE_CACHE = "gdezapravitsya-tiles-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];
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
            .filter((k) => k !== CACHE && k !== TILE_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
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

  // Только свой домен дальше; API не трогаем.
  if (url.origin !== self.location.origin) return;
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
