import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SeoCityPrices from "@/components/seo/SeoCityPrices";
import SeoCityStats from "@/components/seo/SeoCityStats";
import SeoCrossLinks from "@/components/seo/SeoCrossLinks";
import SeoJsonLd from "@/components/seo/SeoJsonLd";
import SeoPageCta from "@/components/seo/SeoPageCta";
import SeoFloatingEngage from "@/components/seo/SeoFloatingEngage";
import { ContentInarticleAd } from "@/components/ads/ContentPageAds";
import SeoStationList from "@/components/seo/SeoStationList";
import FaqList from "@/components/FaqList";
import { cityBBox, findCityBySlug } from "@/lib/cities";
import { getCityStationsCached } from "@/lib/data";
import { cityGenitive, cityPrepositional } from "@/lib/morph";
import { medianPricesFromStations } from "@/lib/seo-city-prices";
import { intentCityFaq, statsFromCounts } from "@/lib/seo-faq";
import { buildProgrammaticSeoGraph } from "@/lib/seo-schema";
import { findSeoIntent } from "@/lib/seo-intents";
import { countByStatus, sortStationsByStatus } from "@/lib/seo-stations";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { withDefaultSocialPreview } from "@/lib/seo-metadata";
import type { StationStatus } from "@/lib/types";

export function intentCityMetadata(
  intentSlug: string,
  citySlug: string
): Metadata {
  const intent = findSeoIntent(intentSlug);
  const city = findCityBySlug(citySlug);
  if (!intent || !city) return { title: "Страница не найдена" };
  const prep = cityPrepositional(city);
  const gen = cityGenitive(city);
  const title = intent.title(prep);
  const description = `${intent.description(prep, gen)} Сервис «${SITE_NAME}».`;
  return withDefaultSocialPreview({
    title,
    description,
    alternates: { canonical: absoluteUrl(`/${intent.slug}/${city.slug}`) },
    openGraph: {
      title: `${title.replace(/ — .+$/, "")} — ${SITE_NAME}`,
      description,
      url: absoluteUrl(`/${intent.slug}/${city.slug}`),
      type: "website",
      siteName: SITE_NAME,
    },
  });
}

interface IntentCityPageProps {
  intentSlug: string;
  citySlug: string;
}

export default async function IntentCityPage({
  intentSlug,
  citySlug,
}: IntentCityPageProps) {
  const intent = findSeoIntent(intentSlug);
  const city = findCityBySlug(citySlug);
  if (!intent || !city) notFound();

  const prep = cityPrepositional(city);
  const gen = cityGenitive(city);
  const pageUrl = absoluteUrl(`/${intent.slug}/${city.slug}`);

  let allStations: StationStatus[] = [];
  try {
    allStations = await getCityStationsCached(city.slug, cityBBox(city), 60);
  } catch {
    allStations = [];
  }

  const counts = countByStatus(allStations);
  const stats = statsFromCounts(counts, allStations.length);
  const stations = sortStationsByStatus(intent.filter(allStations));
  const avgPrices = medianPricesFromStations(allStations);
  const faq = intentCityFaq(intent, city, prep, gen, stats);
  const pageName = intent.h1(prep);
  const description = intent.description(prep, gen);

  const jsonLd = buildProgrammaticSeoGraph({
    pageUrl,
    pageName,
    description,
    breadcrumbs: [
      { name: "Карта", path: "/" },
      { name: intent.breadcrumb, path: `/${intent.slug}` },
      { name: city.name },
    ],
    faq,
    stations,
    listHeading: intent.listHeading(prep, gen),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <SeoJsonLd data={jsonLd} />

      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        /{" "}
        <Link href={`/${intent.slug}`} className="hover:text-brand-fuel">
          {intent.breadcrumb}
        </Link>{" "}
        / <span className="text-ink">{city.name}</span>
      </nav>

      <h1 className="seo-page-h1 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {pageName}
      </h1>

      <p className="seo-page-lead mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
        {intent.lead(prep, gen)}
      </p>

      <section className="seo-page-hero" aria-label="Сводка и карта">
        <SeoCityStats stations={allStations} cityPrep={prep} className="mt-0" />
        <SeoPageCta
          primaryHref={`/?city=${city.slug}`}
          primaryLabel={intent.mapCta(gen)}
          secondaryHref={`/azs/${city.slug}`}
          secondaryLabel={`Все АЗС ${gen}`}
        />
      </section>

      <SeoStationList
        stations={stations}
        citySlug={city.slug}
        cityPrep={prep}
        heading={intent.listHeading(prep, gen)}
        emptyHint={intent.emptyHint(prep)}
        engage={{
          medium: intent.slug,
          pageUrl,
          cityName: city.name,
          cityPrep: prep,
          pageTitle: pageName,
        }}
      />

      <SeoFloatingEngage
        medium={intent.slug}
        pageUrl={pageUrl}
        cityName={city.name}
        cityPrep={prep}
        pageTitle={pageName}
      />

      <ContentInarticleAd className="mx-auto max-w-5xl px-4 sm:px-6" />

      <SeoCityPrices prices={avgPrices} cityPrep={prep} />

      <SeoCrossLinks city={city} cityPrep={prep} />

      <section className="mt-12" aria-label="Частые вопросы">
        <h2 className="text-xl font-bold text-ink">Частые вопросы</h2>
        <div className="mt-4">
          <FaqList items={faq} />
        </div>
      </section>
    </div>
  );
}
