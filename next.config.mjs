/** @type {import('next').NextConfig} */
import { BLOG_REDIRECTS } from "./lib/articles/blog-redirects.mjs";

// Content-Security-Policy: запрещаем eval, ограничиваем источники.
// Внешние источники приложения: тайлы карты (OpenFreeMap + ассеты Protomaps),
// роутер OSRM и геокодер Nominatim. БД — self-hosted Postgres на том же VPS,
// браузер к нему напрямую не обращается (только через собственные /api/*).
// script/style разрешают 'unsafe-inline' (Next.js инлайнит hydration-скрипты,
// карта/UI используют inline-стили), но НЕ 'unsafe-eval' в проде.
// В dev-режиме Next.js (HMR / React Refresh) использует eval — добавляем
// 'unsafe-eval' только при разработке, в проде он не нужен.
const isDev = process.env.NODE_ENV !== "production";

// Яндекс.Метрика + Вебвизор: https://yandex.ru/support/metrica/ru/code/install-counter-csp
const metrikaHosts =
  "https://mc.yandex.ru https://*.mc.yandex.ru https://mc.webvisor.com https://mc.webvisor.org";
const metrikaWs = "wss://mc.yandex.ru wss://*.mc.yandex.ru wss://mc.webvisor.com wss://mc.webvisor.org";

// Яндекс РСЯ (partner.yandex.ru): context.js и креативы.
const yandexAdsHosts =
  "https://yandex.ru https://*.yandex.ru https://yastatic.net https://an.yandex.ru https://*.yandexadexchange.net https://avatars.mds.yandex.net https://ads.adfox.ru https://*.ads.adfox.ru";

const metrikaAncestors = [
  "'self'",
  "https://vk.com",
  "https://*.vk.com",
  "https://yandex.ru",
  "https://*.yandex.ru",
  "https://yandex.com",
  "https://*.yandex.com",
  "https://ya.ru",
  "https://*.ya.ru",
  "https://webvisor.com",
  "https://*.webvisor.com",
].join(" ");

const scriptSrc = isDev
  ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${metrikaHosts} ${yandexAdsHosts}`
  : `script-src 'self' 'unsafe-inline' ${metrikaHosts} ${yandexAdsHosts}`;

// Self-hosted тайлы (см. docs/TILES.md) обычно за реверс-прокси на том же домене
// (относительный путь вроде "/tiles/..." — уже покрыт connect-src 'self'), но при
// прямом доступе по IP:порт без nginx (напр. тестовый сервер без домена) это
// отдельный origin — CSP иначе молча блокирует fetch к нему как "Refused to
// connect". new URL() бросает на относительных путях — тогда просто пропускаем.
function originOf(url) {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
const selfHostedTileOrigins = [
  ...new Set(
    [
      process.env.NEXT_PUBLIC_TILES_URL,
      process.env.NEXT_PUBLIC_WORLD_TILES_URL,
      process.env.NEXT_PUBLIC_PMTILES_URL,
    ]
      .map(originOf)
      .filter(Boolean)
  ),
].join(" ");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Просмотр записей Вебвизора — Метрика встраивает сайт в iframe.
  `frame-ancestors ${metrikaAncestors}`,
  "form-action 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.openfreemap.org ${metrikaHosts} ${yandexAdsHosts}`,
  "font-src 'self' data: https://yastatic.net",
  "worker-src 'self' blob:",
  // Запись Вебвизора: без frame-src blob: mc.yandex.ru сессии не пишутся.
  `frame-src 'self' blob: ${metrikaHosts} ${yandexAdsHosts}`,
  `child-src 'self' blob: ${metrikaHosts} ${yandexAdsHosts}`,
  // В dev добавляем ws/http localhost для HMR-сокета Next.js.
  `connect-src 'self' https://*.openfreemap.org https://router.project-osrm.org https://nominatim.openstreetmap.org ${metrikaHosts} ${metrikaWs} ${yandexAdsHosts}${
    selfHostedTileOrigins ? ` ${selfHostedTileOrigins}` : ""
  }${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
];

const nextConfig = {
  // В dev React StrictMode монтирует компоненты дважды — карта падает при повторной инициализации.
  reactStrictMode: false,
  poweredByHeader: false,
  // Для деплоя на VPS/Beget (Node): npm run build → .next/standalone
  output: "standalone",
  experimental: {
    optimizePackageImports: ["maplibre-gl", "protomaps-themes-base"],
  },
  images: {
    // Пусто: Supabase Storage (единственный внешний источник изображений)
    // больше не используется — фото к отчётам не реализовано в текущем UI.
    // Без wildcard "**" — иначе /_next/image превращается в открытый
    // image-прокси (SSRF/амплификация трафика).
    remotePatterns: [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return Object.entries(BLOG_REDIRECTS).map(([from, to]) => ({
      source: `/blog/${from}`,
      destination: `/blog/${to}`,
      permanent: true,
    }));
  },
  async rewrites() {
    return [
      {
        source: "/:key.txt",
        destination: "/api/indexnow/key/:key",
      },
    ];
  },
};

export default nextConfig;
