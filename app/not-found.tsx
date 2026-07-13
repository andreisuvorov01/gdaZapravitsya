import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: true },
};

/** Глобальная 404 — карта, города и поиск по разделам. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-surface-map px-4 py-16 text-center">
      <BrandLogo size="sm" href="/" showTagline={false} />
      <div className="max-w-md space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-fuel">
          Ошибка 404
        </p>
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
          Страница не найдена
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Такой адреса нет. Вернитесь на карту — там видно, где бензин сейчас на
          АЗС, или выберите город из каталога.
        </p>
      </div>
      <nav
        className="flex flex-wrap items-center justify-center gap-3"
        aria-label="Куда перейти"
      >
        <Link
          href="/"
          className="min-h-[44px] rounded-xl bg-brand-fuel px-5 py-2.5 text-sm font-semibold text-ink-dark transition-colors hover:bg-brand-fuelDim"
        >
          На карту
        </Link>
        <Link
          href="/goroda"
          className="min-h-[44px] rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/5"
        >
          Города
        </Link>
        <Link
          href="/faq"
          className="min-h-[44px] rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/5"
        >
          FAQ
        </Link>
      </nav>
    </div>
  );
}
