import { FuelPumpIcon } from "./Icons";

/** Фирменный знак: колонка на янтарном фоне + зелёная точка. */
export default function BrandMark({
  size = "md",
  /** Точный размер в px (для экспорта). */
  pixelSize,
  className = "",
}: {
  size?: "sm" | "md";
  pixelSize?: number;
  className?: string;
}) {
  if (pixelSize != null) {
    const iconPx = Math.round(pixelSize * 0.5);
    const dotPx = Math.max(6, Math.round(pixelSize * 0.22));
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-fuel to-brand-fuelDim shadow-glow ${className}`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <FuelPumpIcon
          className="text-ink-dark"
          style={{ width: iconPx, height: iconPx }}
        />
        <span
          className="absolute rounded-full bg-fuel-yes ring-2 ring-surface"
          style={{
            width: dotPx,
            height: dotPx,
            right: -dotPx * 0.15,
            top: -dotPx * 0.15,
          }}
          aria-hidden
        />
      </span>
    );
  }

  const box = size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl sm:h-10 sm:w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px] sm:h-5 sm:w-5";
  const dot = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-fuel to-brand-fuelDim shadow-glow ${box} ${className}`}
    >
      <FuelPumpIcon className={`${icon} text-ink-dark`} />
      <span
        className={`absolute -right-0.5 -top-0.5 ${dot} animate-pulse-dot rounded-full bg-fuel-yes ring-2 ring-surface`}
        aria-hidden
      />
    </span>
  );
}
