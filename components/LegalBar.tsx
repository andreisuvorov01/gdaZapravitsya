"use client";

import { memo } from "react";
import Link from "next/link";
import BotLinksClient from "@/components/BotLinksClient";
import { LEGAL_DISCLAIMER, LEGAL_PAGES } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";

/**
 * Компактная правовая строка для карты (без полного подвала). Без пропов —
 * memo() убирает ре-рендер вместе с родительским AppShell, см. InstallChip.
 */
function LegalBar() {
  const year = new Date().getFullYear();

  return (
    <div className="legal-bar pointer-events-none absolute inset-x-0 bottom-0 z-[400]">
      <div className="pointer-events-auto touch-none mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-1.5 text-[0.65rem] leading-snug text-ink-muted">
        <p className="min-w-0 flex-1 truncate">
          <Link href="/o-servise" className="hover:text-brand-fuel hover:underline">
            © {year} {SITE_NAME}. {LEGAL_DISCLAIMER}
          </Link>
        </p>
        <nav
          aria-label="Правовая информация"
          className="hidden shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 sm:flex"
        >
          <BotLinksClient variant="inline" />
          {LEGAL_PAGES.map((p) => (
            <Link key={p.href} href={p.href} className="hover:text-brand-fuel">
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default memo(LegalBar);
