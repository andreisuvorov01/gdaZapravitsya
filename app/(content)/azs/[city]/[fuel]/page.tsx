import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SeoCrossLinks from "@/components/seo/SeoCrossLinks";
import SeoFloatingEngage from "@/components/seo/SeoFloatingEngage";
import SeoPageCta from "@/components/seo/SeoPageCta";
import SeoStationList from "@/components/seo/SeoStationList";
import FaqList from "@/components/FaqList";
import { PRIORITY_CITY_PRESETS, cityBBox, findCityBySlug } from "@/lib/cities";
import { getCityStationsCached } from "@/lib/data";
import { azsFuelFaq, statsFromCounts } from "@/lib/seo-faq";
import { buildProgrammaticSeoGraph } from "@/lib/seo-schema";
import { findFuelBySlug, FUEL_SLUG_ENTRIES } from "@/lib/fuel-slugs";
import { cityGenitive, cityPrepositional } from "@/lib/morph";
import {
  countByStatus,
  filterStationsByFuel,
  sortStationsByStatus,
} from "@/lib/seo-stations";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { StationStatus } from "@/lib/types";
import SeoJsonLd from "@/components/seo/SeoJsonLd";

export const revalidate = 300;

export function generateStaticParams() {
  return PRIORITY_CITY_PRESETS.flatMap((city) =>
    FUEL_SLUG_ENTRIES.map((fuel) => ({ city: city.slug, fuel: fuel.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; fuel: string }>;
}): Promise<Metadata> {
  const { city: citySlug, fuel: fuelSlug } = await params;
  const city = findCityBySlug(citySlug);
  const fuel = findFuelBySlug(fuelSlug);
  if (!city || !fuel) return { title: "Страница не найдена" };

  const prep = cityPrepositional(city);
  const title = `Где ${fuel.label} в ${prep} сейчас — на каких заправках`;
  const description = `Где ${fuel.genitive} в ${prep}: на каких АЗС есть по отчётам водителей. Очереди, лимиты — карта «бензрядом».`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/azs/${city.slug}/${fuel.slug}`) },
    openGraph: {
      title: `${fuel.label} в ${prep} — бензрядом`,
      description,
      url: absoluteUrl(`/azs/${city.slug}/${fuel.slug}`),
      type: "website",
      siteName: SITE_NAME,
    },
  };
}

export default async function CityFuelPage({
  params,
}: {
  params: Promise<{ city: string; fuel: string }>;
}) {
  const { city: citySlug, fuel: fuelSlug } = await params;
  const city = findCityBySlug(citySlug);
  const fuel = findFuelBySlug(fuelSlug);
  if (!city || !fuel) notFound();

  const prep = cityPrepositional(city);
  const gen = cityGenitive(city);

  let stations: StationStatus[] = [];
  try {
    const all = await getCityStationsCached(city.slug, cityBBox(city), 60);
    stations = sortStationsByStatus(filterStationsByFuel(all, fuel.fuel));
  } catch {
    stations = [];
  }

  const counts = countByStatus(stations);
  const faq = azsFuelFaq(city, fuel, prep, gen, statsFromCounts(counts, stations.length));
  const pageUrl = absoluteUrl(`/azs/${city.slug}/${fuel.slug}`);
  const pageName = `Где ${fuel.label} в ${prep} сейчас`;
  const description = `На каких заправках ${prep} сейчас есть ${fuel.genitive}: народные отчёты, очереди и лимиты. Карта «бензрядом», бесплатно.`;

  const jsonLd = buildProgrammaticSeoGraph({
    pageUrl,
    pageName,
    description,
    breadcrumbs: [
      { name: "Карта", path: "/" },
      { name: "Города", path: "/goroda" },
      { name: city.name, path: `/azs/${city.slug}` },
      { name: fuel.label },
    ],
    faq,
    stations,
    listHeading: `АЗС ${gen} с ${fuel.label}`,
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
        /{" "}
        <Link href={`/azs/${city.slug}`} className="hover:text-brand-fuel">
          {city.name}
        </Link>{" "}
        / <span className="text-ink">{fuel.label}</span>
      </nav>

      <h1 className="seo-page-h1 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {pageName}
      </h1>

      <p className="seo-page-lead mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
        На «бензрядом» водители отмечают, на каких АЗС {gen} есть {fuel.genitive}.
        Данные не от сетей — их добавляют люди за пару секунд прямо с телефона.
        {stations.length > 0 && (
          <>
            {" "}
            Сейчас в подборке {stations.length} заправок:{" "}
            <span className="text-fuel-yes">есть — {counts.yes}</span>,{" "}
            <span className="text-fuel-low">мало — {counts.low}</span>,{" "}
            <span className="text-fuel-no">нет — {counts.no}</span>.
          </>
        )}
      </p>

      <section className="seo-page-hero seo-page-hero--compact" aria-label="Карта">
        <SeoPageCta
          primaryHref={`/?city=${city.slug}&fuel=${fuel.slug}`}
          primaryLabel={`Карта ${gen}`}
          secondaryHref={`/azs/${city.slug}`}
          secondaryLabel="Все виды топлива"
        />
      </section>

      <SeoStationList
        stations={stations}
        citySlug={city.slug}
        cityPrep={prep}
        heading={`АЗС ${gen} с ${fuel.label}`}
        emptyHint={`Пока нет отчётов про ${fuel.genitive} в ${prep}.`}
        engage={{
          medium: `azs_${fuel.slug}`,
          pageUrl,
          cityName: city.name,
          cityPrep: prep,
          pageTitle: pageName,
        }}
      />

      <SeoFloatingEngage
        medium={`azs_${fuel.slug}`}
        pageUrl={pageUrl}
        cityName={city.name}
        cityPrep={prep}
        pageTitle={pageName}
      />

      <SeoCrossLinks city={city} cityPrep={prep} currentFuelSlug={fuel.slug} />

      <section className="mt-12" aria-label="Частые вопросы">
        <h2 className="text-xl font-bold text-ink">Частые вопросы</h2>
        <div className="mt-4">
          <FaqList items={faq} />
        </div>
      </section>
    </div>
  );
}
