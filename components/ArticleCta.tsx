import Link from "next/link";

interface ArticleCtaProps {
  title?: string;
  text?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function ArticleCta({
  title = "Проверьте наличие бензина прямо сейчас",
  text = "Откройте карту «бензрядом» — актуальные статусы АЗС по всей России.",
  primaryLabel = "Смотреть карту бензина",
  primaryHref = "/",
  secondaryLabel,
  secondaryHref,
}: ArticleCtaProps) {
  return (
    <aside className="my-8 rounded-2xl border border-brand-fuel/30 bg-brand-fuel/10 p-6">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={primaryHref}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-fuel px-5 py-2.5 text-sm font-semibold text-ink-dark shadow-glow transition hover:bg-brand-fuelDim"
        >
          {primaryLabel}
        </Link>
        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/10"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </aside>
  );
}
