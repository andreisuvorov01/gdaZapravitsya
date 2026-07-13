import Link from "next/link";
import { HOME_FEATURED_CITIES } from "@/lib/home-seo";

/** Популярные города в подвале — перелинковка для роботов с уже проиндексированных страниц. */
export default function FooterFeaturedCities() {
  return (
    <nav
      className="mt-6 border-t border-white/10 pt-6 lg:col-span-5"
      aria-label="Где есть бензин в городах"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Где бензин сейчас
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2 text-sm">
        {HOME_FEATURED_CITIES.map((city) => (
          <li key={city.slug}>
            <Link
              href={`/azs/${city.slug}`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-ink/90 transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              {city.name}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/goroda"
            className="rounded-full border border-white/10 px-3 py-1 font-medium text-brand-fuel transition hover:bg-white/5"
          >
            Все города →
          </Link>
        </li>
      </ul>
    </nav>
  );
}
