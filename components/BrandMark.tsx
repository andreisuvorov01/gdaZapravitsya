import { DropletIcon } from "./Icons";

/** Фирменный знак: капля на синем круге. */
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
    const iconPx = Math.round(pixelSize * 0.52);
    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-fuel to-brand-fuelDim shadow-glow ${className}`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <DropletIcon
          className="text-ink-dark"
          style={{ width: iconPx, height: iconPx }}
        />
      </span>
    );
  }

  const box = size === "sm" ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px] sm:h-5 sm:w-5";

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-fuel to-brand-fuelDim shadow-glow ${box} ${className}`}
    >
      <DropletIcon className={`${icon} text-ink-dark`} />
    </span>
  );
}
