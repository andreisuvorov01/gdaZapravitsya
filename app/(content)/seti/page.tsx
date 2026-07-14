import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_ENTRIES } from "@/lib/brand-slugs";
import { getTrafficWinnerBrands, getTrafficWinnerCities } from "@/lib/seo-growth";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  // Суффикс «| Бенз-Атлас» добавляет шаблон title из app/layout.tsx.
  title: "Сети АЗС России: наличие топлива на карте",
  description:
    "Лукойл, Роснефть, Газпромнефть, Татнефть и другие сети АЗС. Узнайте, где сейчас есть бензин и дизель, на народной карте заправок.",
  alternates: { canonical: absoluteUrl("/seti") },
  openGraph: {
    title: "Сети АЗС России — Бенз-Атлас",
    description:
      "Наличие топлива по сетям АЗС: Лукойл, Роснефть, Газпромнефть и другие.",
    url: absoluteUrl("/seti"),
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function SetiPage() {
  const trafficBrands = getTrafficWinnerBrands();
  const trafficCities = getTrafficWinnerCities().slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        / <span className="text-ink">Сети АЗС</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Сети АЗС России
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
        Выберите сеть заправок, чтобы узнать, где у неё сейчас есть топливо.
        Наличие бензина и дизеля отмечают сами автомобилисты — данные обновляются
        в реальном времени и доступны бесплатно.
      </p>

      <section className="mt-8" aria-label="Популярные сети">
        <h2 className="text-lg font-semibold text-ink">Популярные запросы</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {trafficBrands.flatMap((b) =>
            trafficCities.map((c) => (
              <Link
                key={`${b.slug}-${c.slug}`}
                href={`/seti/${b.slug}/${c.slug}`}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
              >
                {b.name} — {c.name}
              </Link>
            ))
          )}
        </div>
      </section>

      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BRAND_ENTRIES.map((b) => (
          <li key={b.slug}>
            <Link
              href={`/seti/${b.slug}`}
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-surface/60 px-5 py-4 transition hover:border-brand-fuel/40 hover:bg-surface-raised"
            >
              <span className="text-lg font-semibold text-ink">{b.name}</span>
              <span className="flex items-center gap-1 text-sm text-ink-muted transition group-hover:text-brand-fuel">
                Открыть
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    d="M9 6l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-2xl border border-white/10 bg-surface/40 p-6">
        <h2 className="text-lg font-semibold text-ink">Не нашли свою сеть?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          На карте есть заправки всех сетей и независимые АЗС. Откройте карту и
          фильтруйте заправки по бренду прямо на ней.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-fuel px-5 py-2.5 font-semibold text-ink-dark shadow-glow transition hover:bg-brand-fuelDim"
        >
          Открыть карту АЗС
        </Link>
      </div>
    </div>
  );
}
