import Link from "next/link";

interface SeoPageCtaProps {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Показать иконку карты на главной кнопке. */
  showMapIcon?: boolean;
}

function MapPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="9" r="2.5" fill="currentColor" />
    </svg>
  );
}

/** Главный призыв к действию на SEO-страницах — одна яркая кнопка на карту. */
export default function SeoPageCta({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  showMapIcon = true,
}: SeoPageCtaProps) {
  return (
    <div className="seo-page-cta" role="group" aria-label="Действия">
      <Link href={primaryHref} className="seo-page-cta__primary">
        {showMapIcon && <MapPinIcon />}
        <span>{primaryLabel}</span>
      </Link>
      {secondaryHref && secondaryLabel && (
        <Link href={secondaryHref} className="seo-page-cta__secondary">
          {secondaryLabel}
        </Link>
      )}
    </div>
  );
}
