import { ARTICLES } from "./articles";
import { BRAND_ENTRIES } from "./brand-slugs";
import { CITY_PRESETS } from "./cities";
import { FUEL_SLUG_ENTRIES } from "./fuel-slugs";
import { SEO_INTENTS } from "./seo-intents";
import { SITE_URL } from "./site";

export type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
};

export type SitemapShardId =
  | "core"
  | "cities"
  | "intent-city"
  | "city-fuel"
  | "brand-city";

/** Именованные шарды: легче для роботов и меньше риск таймаута на генерации. */
export const SITEMAP_SHARD_IDS: SitemapShardId[] = [
  "core",
  "cities",
  "intent-city",
  "city-fuel",
  "brand-city",
];

/** Стабильная дата для статических страниц — не меняется на каждый запрос sitemap. */
const SITE_CONTENT_ANCHOR = new Date("2026-06-01T00:00:00.000Z");

/** Программные страницы без реального updated_at — без lastModified. */
function programmaticEntry(
  url: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number
): SitemapEntry {
  return { url, changeFrequency, priority };
}

function collectCoreEntries(): SitemapEntry[] {
  const staticRoutes: SitemapEntry[] = [
    { url: `${SITE_URL}/`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/goroda`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/seti`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/regiony`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/faq`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/o-servise`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/confidentialnost`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/polzovatelskoe-soglashenie`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cookies`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "yearly", priority: 0.25 },
    { url: `${SITE_URL}/pravovaya-informaciya`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/kontakty`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/llms.txt`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "weekly", priority: 0.4 },
    { url: `${SITE_URL}/llms-full.txt`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "weekly", priority: 0.35 },
    { url: `${SITE_URL}/blog/feed.xml`, lastModified: SITE_CONTENT_ANCHOR, changeFrequency: "weekly", priority: 0.35 },
  ];

  const brandRoutes: SitemapEntry[] = BRAND_ENTRIES.map((b) =>
    programmaticEntry(`${SITE_URL}/seti/${b.slug}`, "weekly", 0.6)
  );

  const blogRoutes: SitemapEntry[] = ARTICLES.map((a) => ({
    url: `${SITE_URL}/blog/${a.slug}`,
    lastModified: new Date(a.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const intentHubRoutes: SitemapEntry[] = SEO_INTENTS.map((i) =>
    programmaticEntry(`${SITE_URL}/${i.slug}`, "daily", 0.78)
  );

  return [...staticRoutes, ...intentHubRoutes, ...blogRoutes, ...brandRoutes];
}

function collectCityEntries(): SitemapEntry[] {
  return CITY_PRESETS.map((c) =>
    programmaticEntry(`${SITE_URL}/azs/${c.slug}`, "hourly", 0.9)
  );
}

function collectIntentCityEntries(): SitemapEntry[] {
  return SEO_INTENTS.flatMap((intent) =>
    CITY_PRESETS.map((c) =>
      programmaticEntry(`${SITE_URL}/${intent.slug}/${c.slug}`, "hourly", intent.priority)
    )
  );
}

function collectCityFuelEntries(): SitemapEntry[] {
  return CITY_PRESETS.flatMap((c) =>
    FUEL_SLUG_ENTRIES.map((f) =>
      programmaticEntry(`${SITE_URL}/azs/${c.slug}/${f.slug}`, "hourly", 0.85)
    )
  );
}

function collectBrandCityEntries(): SitemapEntry[] {
  return BRAND_ENTRIES.flatMap((b) =>
    CITY_PRESETS.map((c) =>
      programmaticEntry(`${SITE_URL}/seti/${b.slug}/${c.slug}`, "hourly", 0.75)
    )
  );
}

export function collectSitemapShard(shardId: SitemapShardId): SitemapEntry[] {
  switch (shardId) {
    case "core":
      return collectCoreEntries();
    case "cities":
      return collectCityEntries();
    case "intent-city":
      return collectIntentCityEntries();
    case "city-fuel":
      return collectCityFuelEntries();
    case "brand-city":
      return collectBrandCityEntries();
    default:
      return [];
  }
}

export function isSitemapShardId(value: string): value is SitemapShardId {
  return (SITEMAP_SHARD_IDS as string[]).includes(value);
}

/** Все канонические URL для IndexNow и warm-seo. */
export function collectSitemapEntries(): SitemapEntry[] {
  return SITEMAP_SHARD_IDS.flatMap((shardId) => collectSitemapShard(shardId));
}

export function collectSitemapUrls(): string[] {
  return collectSitemapEntries().map((e) => e.url);
}
