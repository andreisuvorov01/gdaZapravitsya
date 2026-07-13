import type { Metadata } from "next";
import Link from "next/link";
import { CITY_PRESETS } from "@/lib/cities";
import { getTrafficWinnerCities } from "@/lib/seo-growth";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import GorodaIndex from "@/components/GorodaIndex";

export const metadata: Metadata = {
  // Суффикс «| ГдеЗаправиться.рф» добавляет шаблон title из app/layout.tsx.
  title: "Где есть бензин по городам России — карта АЗС",
  description:
    "Выберите свой город и узнайте, на каких АЗС сейчас есть бензин и дизель. Народная карта наличия топлива в реальном времени.",
  alternates: { canonical: absoluteUrl("/goroda") },
  openGraph: {
    title: "Наличие топлива по городам России — ГдеЗаправиться.рф",
    description:
      "Карта АЗС с актуальным наличием бензина и дизеля по городам России.",
    url: absoluteUrl("/goroda"),
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function GorodaPage() {
  const trafficCities = getTrafficWinnerCities();
  const cities = [...CITY_PRESETS].sort((a, b) => a.name.localeCompare(b.name, "ru"));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        / <span className="text-ink">Города</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Наличие топлива по городам России
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
        {CITY_PRESETS.length} городов — выберите свой, чтобы посмотреть, на каких АЗС
        сейчас есть бензин и дизель. Данные собираются из отчётов пользователей и
        обновляются в реальном времени.
      </p>

      <section className="mt-8" aria-label="Популярные города">
        <h2 className="text-lg font-semibold text-ink">Популярные запросы по городам</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {trafficCities.map((c) => (
            <Link
              key={c.slug}
              href={`/gde-benzin/${c.slug}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink transition hover:border-brand-fuel/40 hover:text-brand-fuel"
            >
              Бензин — {c.name}
            </Link>
          ))}
        </div>
      </section>

      <GorodaIndex cities={cities} />

      <div className="mt-10 rounded-2xl border border-white/10 bg-surface/40 p-6">
        <h2 className="text-lg font-semibold text-ink">Не нашли свой город?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Карта работает по всей России — на ней более 19 000 заправок. Откройте
          карту и найдите ближайшие АЗС по геолокации или поиску.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-fuel px-5 py-2.5 font-semibold text-ink-dark shadow-glow transition hover:bg-brand-fuelDim"
        >
          Открыть карту России
        </Link>
      </div>
    </div>
  );
}
