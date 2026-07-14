import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import HomeSeoLandings from "@/components/HomeSeoLandings";
import SeoJsonLd from "@/components/seo/SeoJsonLd";
import { isDbConfigured } from "@/lib/db";
import { homeSearchFaq } from "@/lib/seo-faq";
import { buildProgrammaticSeoGraph } from "@/lib/seo-schema";
import { HOME_PAGE_DESCRIPTION, HOME_PAGE_TITLE, HOME_SEO_KEYWORDS } from "@/lib/home-seo";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import { withDefaultSocialPreview } from "@/lib/seo-metadata";

// Хосты, к которым карта обращается сразу при загрузке (тайлы). preconnect
// поднимает TLS-соединение параллельно с загрузкой JS, а не после него — так
// первый тайл приходит раньше.
// Логика источника карты продублирована из buildStyle() в MapLibreMapView.tsx,
// приоритет тот же: TILES_URL (свой pmtiles serve, см. docs/TILES.md) >
// PMTILES_URL (сырой self-host файл) > внешний style.json (OpenFreeMap).
// В self-host режимах глифы/спрайт теперь свои (/map-assets/..., см. PM_GLYPHS
// в MapLibreMapView.tsx) — раньше они шли с protomaps.github.io, и зависший
// без VPN GitHub Pages ломал self-host тайлы заодно с ним (инцидент
// 2026-07-11). Отдельный preconnect для self-host поэтому не нужен — все его
// запросы (тайлы, шрифты, спрайт) идут на 'self', соединение с которым и так
// уже поднимается для самой страницы.
const TILES_URL = process.env.NEXT_PUBLIC_TILES_URL?.trim() || "";
const PMTILES_URL = process.env.NEXT_PUBLIC_PMTILES_URL?.trim() || "";
const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE || "https://tiles.openfreemap.org/styles/liberty";

// TILES_URL обычно относительный путь на том же домене (reverse-proxy до
// pmtiles serve) — тогда отдельный preconnect не нужен, браузер и так уже
// соединён с 'self'. Преконнектим только если это явно другой хост.
const TILES_ORIGIN = (() => {
  if (!TILES_URL) return null;
  try {
    return new URL(TILES_URL, SITE_URL).origin;
  } catch {
    return null;
  }
})();
const SITE_ORIGIN = (() => {
  try {
    return new URL(SITE_URL).origin;
  } catch {
    return null;
  }
})();
const MAP_TILE_ORIGIN = (() => {
  if (TILES_URL) {
    return TILES_ORIGIN && TILES_ORIGIN !== SITE_ORIGIN ? TILES_ORIGIN : null;
  }
  try {
    return new URL(PMTILES_URL || STYLE_URL).origin;
  } catch {
    return null;
  }
})();
export const metadata: Metadata = withDefaultSocialPreview({
  // absolute — чтобы шаблон «%s | Бенз-Атлас» не добавлял суффикс к
  // названию, которое уже содержит бренд (иначе «… | Бенз-Атлас» задвоится).
  title: {
    absolute: HOME_PAGE_TITLE,
  },
  description: HOME_PAGE_DESCRIPTION,
  keywords: [...HOME_SEO_KEYWORDS],
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: HOME_PAGE_TITLE,
    description: HOME_PAGE_DESCRIPTION,
    url: absoluteUrl("/"),
    type: "website",
    siteName: SITE_NAME,
  },
});

const homeJsonLd = buildProgrammaticSeoGraph({
  pageUrl: absoluteUrl("/"),
  pageName: HOME_PAGE_TITLE.replace(/\?.*$/, "").trim(),
  description: HOME_PAGE_DESCRIPTION,
  breadcrumbs: [{ name: "Карта" }],
  faq: homeSearchFaq(),
});

// DATABASE_URL есть только на VPS, не в CI-сборке — без этого Next заранее
// вшивает demoMode=true в статический HTML главной.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      {MAP_TILE_ORIGIN && (
        <link rel="preconnect" href={MAP_TILE_ORIGIN} crossOrigin="anonymous" />
      )}
      {!TILES_URL && !PMTILES_URL && (
        // Внешний style.json — первый же запрос MapLibre после инициализации,
        // от него зависят URL тайлов/спрайта/шрифтов. Преднагружаем его сразу
        // при парсинге HTML, не дожидаясь загрузки и исполнения JS-бандла карты.
        // Self-host режимы (TILES_URL/PMTILES_URL) сюда не попадают — им
        // отдельный preconnect не нужен, все их запросы идут на 'self'.
        <link rel="preload" as="fetch" href={STYLE_URL} crossOrigin="anonymous" />
      )}
      <SeoJsonLd data={homeJsonLd} />
      <div className="flex min-h-full flex-col">
        <div className="relative h-[100dvh] min-h-0 shrink-0">
          <AppShell demoMode={!isDbConfigured()} />
        </div>
        <HomeSeoLandings />
      </div>
    </>
  );
}
