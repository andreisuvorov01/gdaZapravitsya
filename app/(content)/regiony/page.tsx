import type { Metadata } from "next";
import Link from "next/link";
import { REGIONS } from "@/lib/regions";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  // Суффикс «| бензрядом» добавляет шаблон title из app/layout.tsx.
  title: "Наличие топлива по регионам России — карта АЗС",
  description:
    "Регионы России на народной карте заправок: где сейчас есть бензин и дизель. Выберите свой субъект РФ и откройте карту АЗС.",
  alternates: { canonical: absoluteUrl("/regiony") },
  openGraph: {
    title: "Топливо по регионам России — бензрядом",
    description: "Наличие бензина и дизеля на АЗС по регионам России.",
    url: absoluteUrl("/regiony"),
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function RegionyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        / <span className="text-ink">Регионы</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Наличие топлива по регионам России
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
        «бензрядом» работает по всей России. Выберите регион, чтобы перейти к
        карте наличия топлива. Для крупных городов доступны подробные страницы с
        актуальными статусами заправок.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REGIONS.map((r) => {
          const href = r.citySlug ? `/azs/${r.citySlug}` : "/";
          return (
            <li key={r.name}>
              <Link
                href={href}
                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-surface/60 px-5 py-4 transition hover:border-brand-fuel/40 hover:bg-surface-raised"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{r.name}</span>
                  {r.cityName && (
                    <span className="block text-xs text-ink-muted">
                      {r.cityName}
                    </span>
                  )}
                </span>
                <svg
                  className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:text-brand-fuel"
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
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 rounded-2xl border border-white/10 bg-surface/40 p-6">
        <h2 className="text-lg font-semibold text-ink">Смотрите также</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/goroda"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-fuel transition hover:bg-white/10"
          >
            Все города
          </Link>
          <Link
            href="/seti"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-brand-fuel transition hover:bg-white/10"
          >
            Сети АЗС
          </Link>
        </div>
      </div>
    </div>
  );
}
