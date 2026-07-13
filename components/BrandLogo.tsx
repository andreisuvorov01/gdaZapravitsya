import Link from "next/link";
import BrandMark from "./BrandMark";

interface BrandLogoProps {
  className?: string;
  /** Слоган под названием. */
  showTagline?: boolean;
  size?: "sm" | "md";
  /** Ссылка на главную (карта). */
  href?: string;
}

/** Логотип: знак + «ГдеЗаправиться.рф». */
export default function BrandLogo({
  className = "",
  showTagline = true,
  size = "md",
  href,
}: BrandLogoProps) {
  const inner = (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <BrandMark size={size} />
      <div className="min-w-0 leading-none">
        <p
          className={`truncate font-display font-bold tracking-tight text-white ${
            size === "sm" ? "text-[0.85rem]" : "text-[0.95rem] sm:text-[1.05rem]"
          }`}
        >
          Где<span className="text-brand-fuel">Заправиться.рф</span>
        </p>
        {showTagline && (
          <p className="mt-0.5 line-clamp-1 text-[0.48rem] font-medium uppercase tracking-[0.05em] text-ink-muted sm:text-[0.58rem] sm:tracking-[0.08em]">
            топливо в реальном времени
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="min-w-0 shrink rounded-lg outline-offset-2 transition-opacity hover:opacity-90"
        aria-label="ГдеЗаправиться.рф — на главную карту"
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
