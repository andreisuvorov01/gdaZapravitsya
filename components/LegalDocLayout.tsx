import Link from "next/link";
import type { ReactNode } from "react";

interface LegalDocLayoutProps {
  title: string;
  breadcrumb: string;
  updated?: string;
  children: ReactNode;
}

/** Общий каркас правовых страниц. */
export default function LegalDocLayout({
  title,
  breadcrumb,
  updated,
  children,
}: LegalDocLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        / <span className="text-ink">{breadcrumb}</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      {updated && (
        <p className="mt-3 text-sm text-ink-muted">Редакция от {updated}</p>
      )}

      <div className="legal-prose mt-8">{children}</div>

      <div className="mt-10 flex flex-wrap gap-3 text-sm">
        <Link
          href="/kontakty"
          className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-ink transition hover:bg-white/10"
        >
          Контакты
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-xl bg-brand-fuel px-4 py-2 font-semibold text-ink-dark transition hover:bg-brand-fuelDim"
        >
          На карту
        </Link>
      </div>
    </div>
  );
}
