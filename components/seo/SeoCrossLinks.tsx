import Link from "next/link";
import type { CityPreset } from "@/lib/cities";
import { BRAND_ENTRIES, type BrandEntry } from "@/lib/brand-slugs";
import { FUEL_SLUG_ENTRIES } from "@/lib/fuel-slugs";
import { findSeoIntent } from "@/lib/seo-intents";
import {
  getRelatedCitiesForLinking,
  getTrafficWinnerBrands,
  PRIORITY_INTENT_SLUGS,
} from "@/lib/seo-growth";

interface SeoCrossLinksProps {
  city: CityPreset;
  cityPrep: string;
  /** Текущий слаг топлива — не дублировать в списке. */
  currentFuelSlug?: string;
  /** Текущий бренд — не дублировать. */
  currentBrandSlug?: string;
  /** Текущий интент — не дублировать в блоке запросов. */
  currentIntentSlug?: string;
}

export default function SeoCrossLinks({
  city,
  cityPrep,
  currentFuelSlug,
  currentBrandSlug,
  currentIntentSlug,
}: SeoCrossLinksProps) {
  const fuels = FUEL_SLUG_ENTRIES.filter((f) => f.slug !== currentFuelSlug);
  const trafficBrands = getTrafficWinnerBrands();
  const otherBrands = BRAND_ENTRIES.filter(
    (b) =>
      b.slug !== currentBrandSlug &&
      !trafficBrands.some((t) => t.slug === b.slug)
  );
  const brands = [
    ...trafficBrands.filter((b) => b.slug !== currentBrandSlug),
    ...otherBrands,
  ].slice(0, 10);

  const intents = PRIORITY_INTENT_SLUGS.map((slug) => findSeoIntent(slug))
    .filter((i): i is NonNullable<typeof i> => Boolean(i))
    .filter((i) => i.slug !== currentIntentSlug);

  const relatedCities = getRelatedCitiesForLinking(city.slug, 8);

  return (
    <>
      <section className="mt-10" aria-label={`Топливо в ${cityPrep}`}>
        <h2 className="text-xl font-bold text-ink">Другое топливо в {cityPrep}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {fuels.map((f) => (
            <Link
              key={f.slug}
              href={`/azs/${city.slug}/${f.slug}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              {f.label}
            </Link>
          ))}
          <Link
            href={`/azs/${city.slug}`}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-fuel transition hover:bg-white/10"
          >
            Все виды →
          </Link>
        </div>
      </section>

      <section className="mt-10" aria-label="Сети АЗС">
        <h2 className="text-xl font-bold text-ink">Сети заправок в {cityPrep}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {brands.map((b: BrandEntry) => (
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

      <section className="mt-10" aria-label="Смежные запросы">
        <h2 className="text-xl font-bold text-ink">Популярные запросы в {cityPrep}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {intents.map((intent) => (
            <Link
              key={intent.slug}
              href={`/${intent.slug}/${city.slug}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              {intent.breadcrumb} — {city.name}
            </Link>
          ))}
          <Link
            href={`/azs/${city.slug}`}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-fuel transition hover:bg-white/10"
          >
            Карта {cityPrep} →
          </Link>
        </div>
      </section>

      <section className="mt-10" aria-label="Другие города">
        <h2 className="text-xl font-bold text-ink">Топливо в других городах</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {relatedCities.map((c) => (
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
    </>
  );
}
