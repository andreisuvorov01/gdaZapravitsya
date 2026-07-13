import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SeoFloatingEngage from "@/components/seo/SeoFloatingEngage";
import SeoPageCta from "@/components/seo/SeoPageCta";
import SeoStationList from "@/components/seo/SeoStationList";
import FaqList from "@/components/FaqList";
import { BRAND_ENTRIES, findBrandBySlug } from "@/lib/brand-slugs";
import { PRIORITY_CITY_PRESETS, cityBBox, findCityBySlug } from "@/lib/cities";
import { getCityStationsCached } from "@/lib/data";
import { brandCityFaq, statsFromCounts } from "@/lib/seo-faq";
import { buildProgrammaticSeoGraph } from "@/lib/seo-schema";
import { FUEL_SLUG_ENTRIES } from "@/lib/fuel-slugs";
import { cityGenitive, cityPrepositional } from "@/lib/morph";
import {
  countByStatus,
  filterStationsByBrand,
  sortStationsByStatus,
} from "@/lib/seo-stations";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { StationStatus } from "@/lib/types";
import SeoJsonLd from "@/components/seo/SeoJsonLd";

export const revalidate = 300;

export function generateStaticParams() {
  return BRAND_ENTRIES.flatMap((brand) =>
    PRIORITY_CITY_PRESETS.map((city) => ({ brand: brand.slug, city: city.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string; city: string }>;
}): Promise<Metadata> {
  const { brand: brandSlug, city: citySlug } = await params;
  const brand = findBrandBySlug(brandSlug);
  const city = findCityBySlug(citySlug);
  if (!brand || !city) return { title: "Страница не найдена" };

  const prep = cityPrepositional(city);
  const title = `${brand.name} в ${prep} — где есть бензин сейчас`;
  const description = `Где ${brand.name} в ${prep}: наличие бензина и дизеля на заправках сети по отчётам водителей. Очереди и лимиты.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/seti/${brand.slug}/${city.slug}`),
    },
    openGraph: {
      title: `${brand.name} в ${prep} — бензрядом`,
      description,
      url: absoluteUrl(`/seti/${brand.slug}/${city.slug}`),
      type: "website",
      siteName: SITE_NAME,
    },
  };
}

export default async function BrandCityPage({
  params,
}: {
  params: Promise<{ brand: string; city: string }>;
}) {
  const { brand: brandSlug, city: citySlug } = await params;
  const brand = findBrandBySlug(brandSlug);
  const city = findCityBySlug(citySlug);
  if (!brand || !city) notFound();

  const prep = cityPrepositional(city);
  const gen = cityGenitive(city);

  let stations: StationStatus[] = [];
  try {
    const all = await getCityStationsCached(city.slug, cityBBox(city), 60);
    stations = sortStationsByStatus(filterStationsByBrand(all, brand.name));
  } catch {
    stations = [];
  }

  const counts = countByStatus(stations);
  const faq = brandCityFaq(brand, city, prep, gen, statsFromCounts(counts, stations.length));
  const pageUrl = absoluteUrl(`/seti/${brand.slug}/${city.slug}`);
  const pageName = `${brand.name} в ${prep}: где есть топливо`;
  const description = `Заправки ${brand.name} в ${prep} — наличие бензина и дизеля по отчётам водителей. Карта «бензрядом», очереди и лимиты.`;

  const jsonLd = buildProgrammaticSeoGraph({
    pageUrl,
    pageName,
    description,
    breadcrumbs: [
      { name: "Карта", path: "/" },
      { name: "Сети", path: "/seti" },
      { name: brand.name, path: `/seti/${brand.slug}` },
      { name: city.name },
    ],
    faq,
    stations,
    listHeading: `АЗС ${brand.name} в ${prep}`,
  });

  const otherBrands = BRAND_ENTRIES.filter((b) => b.slug !== brand.slug).slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <SeoJsonLd data={jsonLd} />

      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        /{" "}
        <Link href="/seti" className="hover:text-brand-fuel">
          Сети
        </Link>{" "}
        /{" "}
        <Link href={`/seti/${brand.slug}`} className="hover:text-brand-fuel">
          {brand.name}
        </Link>{" "}
        / <span className="text-ink">{city.name}</span>
      </nav>

      <h1 className="seo-page-h1 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {pageName}
      </h1>

      <p className="seo-page-lead mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
        Заправки {brand.name} в {prep} на народной карте «бензрядом». Статусы
        ставят водители — не официальные данные сети, перед заездом лучше
        перепроверить на месте.
        {stations.length > 0 && (
          <>
            {" "}
            В выборке {stations.length} АЗС:{" "}
            <span className="text-fuel-yes">есть — {counts.yes}</span>,{" "}
            <span className="text-fuel-low">мало — {counts.low}</span>,{" "}
            <span className="text-fuel-no">нет — {counts.no}</span>.
          </>
        )}
      </p>

      <section className="seo-page-hero seo-page-hero--compact" aria-label="Карта">
        <SeoPageCta
          primaryHref={`/?city=${city.slug}&brand=${encodeURIComponent(brand.name)}`}
          primaryLabel={`${brand.name} на карте`}
          secondaryHref={`/seti/${brand.slug}`}
          secondaryLabel={`${brand.name} по России`}
        />
      </section>

      <SeoStationList
        stations={stations}
        citySlug={city.slug}
        cityPrep={prep}
        heading={`АЗС ${brand.name} в ${prep}`}
        emptyHint={`Пока нет отчётов по ${brand.name} в ${prep}.`}
        engage={{
          medium: `seti_${brand.slug}`,
          pageUrl,
          cityName: city.name,
          cityPrep: prep,
          pageTitle: pageName,
        }}
      />

      <SeoFloatingEngage
        medium={`seti_${brand.slug}`}
        pageUrl={pageUrl}
        cityName={city.name}
        cityPrep={prep}
        pageTitle={pageName}
      />

      <section className="mt-10" aria-label="Топливо по маркам">
        <h2 className="text-xl font-bold text-ink">{brand.name}: виды топлива в {prep}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {FUEL_SLUG_ENTRIES.map((f) => (
            <Link
              key={f.slug}
              href={`/azs/${city.slug}/${f.slug}`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              {f.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-label="Другие сети">
        <h2 className="text-xl font-bold text-ink">Другие сети в {prep}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {otherBrands.map((b) => (
            <Link
              key={b.slug}
              href={`/seti/${b.slug}/${city.slug}`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              {b.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-label="Частые вопросы">
        <h2 className="text-xl font-bold text-ink">Частые вопросы</h2>
        <div className="mt-4">
          <FaqList items={faq} />
        </div>
      </section>
    </div>
  );
}
