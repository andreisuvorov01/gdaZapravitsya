import type { Metadata } from "next";
import Link from "next/link";
import { CITY_PRESETS } from "@/lib/cities";
import { intentHubFaq } from "@/lib/seo-faq";
import { buildProgrammaticSeoGraph } from "@/lib/seo-schema";
import { findSeoIntent } from "@/lib/seo-intents";
import { getTrafficWinnerCities } from "@/lib/seo-growth";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { withDefaultSocialPreview } from "@/lib/seo-metadata";
import SeoJsonLd from "@/components/seo/SeoJsonLd";
import FaqList from "@/components/FaqList";

interface IntentHubPageProps {
  intentSlug: string;
}

export function intentHubMetadata(intentSlug: string): Metadata {
  const intent = findSeoIntent(intentSlug);
  if (!intent) return { title: "Страница не найдена" };
  return withDefaultSocialPreview({
    title: intent.hubTitle,
    description: intent.hubDescription,
    alternates: { canonical: absoluteUrl(`/${intent.slug}`) },
    openGraph: {
      title: intent.hubTitle,
      description: intent.hubDescription,
      url: absoluteUrl(`/${intent.slug}`),
      type: "website",
      siteName: SITE_NAME,
    },
  });
}

export default function IntentHubPage({ intentSlug }: IntentHubPageProps) {
  const intent = findSeoIntent(intentSlug);
  if (!intent) return null;

  const trafficCities = getTrafficWinnerCities();
  const trafficSlugs = new Set(trafficCities.map((c) => c.slug));
  const otherCities = [...CITY_PRESETS]
    .filter((c) => !trafficSlugs.has(c.slug))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const cities = [...trafficCities, ...otherCities];

  const pageUrl = absoluteUrl(`/${intent.slug}`);
  const faq = intentHubFaq(intent);
  const jsonLd = buildProgrammaticSeoGraph({
    pageUrl,
    pageName: intent.hubH1,
    description: intent.hubDescription,
    breadcrumbs: [
      { name: "Карта", path: "/" },
      { name: intent.breadcrumb },
    ],
    faq,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <SeoJsonLd data={jsonLd} />

      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        / <span className="text-ink">{intent.breadcrumb}</span>
      </nav>

      <h1 className="seo-page-h1 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {intent.hubH1}
      </h1>
      <p className="seo-page-lead mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
        {intent.hubDescription} Данные от водителей на «бензрядом» — уточняйте
        на самой заправке.
      </p>

      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex rounded-xl bg-brand-fuel px-6 py-3 text-base font-semibold text-ink-dark shadow-glow transition hover:bg-brand-fuelDim"
        >
          Открыть карту России
        </Link>
      </div>

      <section className="mt-12" aria-label="Города">
        <h2 className="text-xl font-bold text-ink">
          {intent.breadcrumb} — {cities.length} городов
        </h2>
        {trafficCities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {trafficCities.map((city) => (
              <Link
                key={city.slug}
                href={`/${intent.slug}/${city.slug}`}
                className="rounded-full border border-brand-fuel/30 bg-brand-fuel/10 px-4 py-2 text-sm font-medium text-brand-fuel transition hover:bg-brand-fuel/20"
              >
                {city.name}
              </Link>
            ))}
          </div>
        )}
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <li key={city.slug}>
              <Link
                href={`/${intent.slug}/${city.slug}`}
                className="block rounded-xl border border-white/10 bg-surface/60 px-4 py-3 text-sm font-medium text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
              >
                {city.name}
              </Link>
            </li>
          ))}
        </ul>
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
