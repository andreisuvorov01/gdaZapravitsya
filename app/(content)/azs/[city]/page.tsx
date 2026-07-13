import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SeoCityPrices from "@/components/seo/SeoCityPrices";
import SeoCityStats from "@/components/seo/SeoCityStats";
import SeoJsonLd from "@/components/seo/SeoJsonLd";
import SeoPageCta from "@/components/seo/SeoPageCta";
import SeoFloatingEngage from "@/components/seo/SeoFloatingEngage";
import { ContentInarticleAd } from "@/components/ads/ContentPageAds";
import SeoStationList from "@/components/seo/SeoStationList";
import FaqList from "@/components/FaqList";
import { PRIORITY_CITY_PRESETS, cityBBox, findCityBySlug } from "@/lib/cities";
import { getCityStationsCached } from "@/lib/data";
import { cityGenitive, cityPrepositional } from "@/lib/morph";
import { medianPricesFromStations } from "@/lib/seo-city-prices";
import { azsCityFaq, statsFromCounts } from "@/lib/seo-faq";
import { buildProgrammaticSeoGraph } from "@/lib/seo-schema";
import { FUEL_SLUG_ENTRIES } from "@/lib/fuel-slugs";
import {
  getRelatedCitiesForLinking,
  getTrafficWinnerBrands,
  PRIORITY_INTENT_SLUGS,
} from "@/lib/seo-growth";
import { findSeoIntent } from "@/lib/seo-intents";
import { countByStatus, sortStationsByStatus } from "@/lib/seo-stations";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { withDefaultSocialPreview } from "@/lib/seo-metadata";
import type { StationStatus } from "@/lib/types";

// Перегенерация раз в 5 минут (ISR) — данные о наличии быстро устаревают.
export const revalidate = 300;

// Крупнейшие города пререндерим статически, остальные — по первому запросу (ISR).
export function generateStaticParams() {
  return PRIORITY_CITY_PRESETS.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = findCityBySlug(slug);
  if (!city) {
    return { title: "Город не найден" };
  }
  const prep = cityPrepositional(city);
  const title = `Где есть бензин в ${prep} сейчас — наличие на АЗС`;
  const description = `Где бензин в ${prep}: наличие на заправках, очереди и лимиты по отчётам водителей. Народная карта «${SITE_NAME}», бесплатно.`;
  return withDefaultSocialPreview({
    title,
    description,
    alternates: { canonical: absoluteUrl(`/azs/${city.slug}`) },
    openGraph: {
      title: `Где есть бензин в ${prep} — ${SITE_NAME}`,
      description,
      url: absoluteUrl(`/azs/${city.slug}`),
      type: "website",
      siteName: SITE_NAME,
    },
  });
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = findCityBySlug(slug);
  if (!city) notFound();

  const prep = cityPrepositional(city);
  const gen = cityGenitive(city);

  let stations: StationStatus[] = [];
  try {
    stations = await getCityStationsCached(city.slug, cityBBox(city), 60);
  } catch {
    stations = [];
  }

  stations = sortStationsByStatus(stations);
  const counts = countByStatus(stations);
  const avgPrices = medianPricesFromStations(stations);
  const otherCities = getRelatedCitiesForLinking(city.slug, 10);
  const priorityIntents = PRIORITY_INTENT_SLUGS.map((s) => findSeoIntent(s)).filter(
    (i): i is NonNullable<typeof i> => Boolean(i)
  );
  const trafficBrands = getTrafficWinnerBrands();
  const faqForCity = azsCityFaq(city, prep, gen, statsFromCounts(counts, stations.length));
  const pageUrl = absoluteUrl(`/azs/${city.slug}`);
  const pageName = `Где есть бензин в ${prep} сейчас`;
  const description = `Где бензин в ${prep}: наличие на заправках, очереди и лимиты по отчётам водителей. Народная карта «${SITE_NAME}», бесплатно.`;

  const jsonLd = buildProgrammaticSeoGraph({
    pageUrl,
    pageName,
    description,
    breadcrumbs: [
      { name: "Карта", path: "/" },
      { name: "Города", path: "/goroda" },
      { name: city.name },
    ],
    faq: faqForCity,
    stations,
    listHeading: `Заправки ${gen} и наличие топлива`,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <SeoJsonLd data={jsonLd} />

      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        /{" "}
        <Link href="/goroda" className="hover:text-brand-fuel">
          Города
        </Link>{" "}
        / <span className="text-ink">{city.name}</span>
      </nav>

      <h1 className="seo-page-h1 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {pageName}
      </h1>

      <p className="seo-page-lead mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
        Ищете «где бензин в {prep}» или «наличие бензина на заправках» — ниже
        список АЗС {gen} с отметками водителей: есть топливо, мало, нет или пока
        нет данных. Перед заездом лучше перепроверить на заправке.
      </p>

      <section className="seo-page-hero" aria-label="Сводка и карта">
        <SeoCityStats stations={stations} cityPrep={prep} className="mt-0" />
        <SeoPageCta
          primaryHref={`/?city=${city.slug}`}
          primaryLabel={`Открыть карту ${gen}`}
          secondaryHref={`/gde-est-benzin/${city.slug}`}
          secondaryLabel={`Где есть бензин ${prep}`}
        />
      </section>

      <SeoStationList
        stations={stations}
        citySlug={city.slug}
        cityPrep={prep}
        heading={`Заправки ${gen} и наличие топлива`}
        emptyHint={`Пока нет данных по этому городу.`}
        engage={{
          medium: "azs_city",
          pageUrl,
          cityName: city.name,
          cityPrep: prep,
          pageTitle: pageName,
        }}
      />

      <SeoFloatingEngage
        medium="azs_city"
        pageUrl={pageUrl}
        cityName={city.name}
        cityPrep={prep}
        pageTitle={pageName}
      />

      <ContentInarticleAd className="mx-auto max-w-5xl px-4 sm:px-6" />

      <SeoCityPrices prices={avgPrices} cityPrep={prep} />

      <section className="mt-10" aria-label="Топливо по маркам">
        <h2 className="text-xl font-bold text-ink">Топливо в {prep}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {FUEL_SLUG_ENTRIES.map((f) => (
            <Link
              key={f.slug}
              href={`/azs/${city.slug}/${f.slug}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              {f.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-label="Поисковые подборки">
        <h2 className="text-lg font-semibold text-ink">Популярные запросы</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {priorityIntents.map((intent) => (
            <Link
              key={intent.slug}
              href={`/${intent.slug}/${city.slug}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              {intent.breadcrumb}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-label="Другие города">
        <h2 className="text-xl font-bold text-ink">Топливо в других городах</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {otherCities.map((c) => (
            <Link
              key={c.slug}
              href={`/azs/${c.slug}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/goroda"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-fuel transition hover:bg-white/10"
          >
            Все города →
          </Link>
        </div>
      </section>

      <section className="mt-10" aria-label="Сети АЗС">
        <h2 className="text-xl font-bold text-ink">Популярные сети АЗС</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {trafficBrands.map((b) => (
            <Link
              key={b.slug}
              href={`/seti/${b.slug}/${city.slug}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              {b.name}
            </Link>
          ))}
          <Link
            href="/seti"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-fuel transition hover:bg-white/10"
          >
            Все сети →
          </Link>
        </div>
      </section>

      <section className="mt-12" aria-label="Частые вопросы">
        <h2 className="text-xl font-bold text-ink">Частые вопросы</h2>
        <div className="mt-4">
          <FaqList items={faqForCity} />
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          Больше ответов — на странице{" "}
          <Link href="/faq" className="text-brand-fuel underline">
            «Вопросы и ответы»
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
