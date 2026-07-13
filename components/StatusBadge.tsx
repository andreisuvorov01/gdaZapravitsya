import { STATUS_LABELS, STATUS_SHORT, STATUS_HEX, type FuelStatus } from "@/lib/types";

const STYLES: Record<FuelStatus, string> = {
  yes: "bg-fuel-yes/15 text-fuel-yes border-fuel-yes/40",
  low: "bg-fuel-low/15 text-fuel-low border-fuel-low/40",
  no: "bg-fuel-no/15 text-fuel-no border-fuel-no/40",
  unknown: "bg-fuel-unknown/10 text-fuel-unknown border-fuel-unknown/30",
};

// Дублирующий цвет символ статуса — чтобы статус читался без опоры на цвет
// (доступность для дальтоников): ✓ есть, ! мало, ✕ нет, ? нет данных.
export const STATUS_GLYPH: Record<FuelStatus, string> = {
  yes: "✓",
  low: "!",
  no: "✕",
  unknown: "?",
};

export default function StatusBadge({
  status,
  className = "",
  compact = false,
  large = false,
}: {
  status: FuelStatus;
  className?: string;
  compact?: boolean;
  /** Крупный, светящийся вариант — для главного индикатора статуса в шапке
      карточки заправки (см. StationPanel.tsx), а не для плотных списков. */
  large?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-lg font-bold uppercase tracking-wide ${
        large ? "gap-2 px-3.5 py-1.5 text-sm" : "gap-1.5 border px-2.5 py-0.5 text-xs"
      } ${STYLES[status]} ${className}`}
      style={
        large
          ? {
              boxShadow: `inset 0 0 0 1.5px ${STATUS_HEX[status]}80, 0 0 16px ${STATUS_HEX[status]}40`,
            }
          : undefined
      }
    >
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-black leading-none text-ink-dark ${
          large ? "h-5 w-5 text-xs" : "h-4 w-4 text-[0.6rem]"
        }`}
        style={{ background: STATUS_HEX[status] }}
        aria-hidden
      >
        {STATUS_GLYPH[status]}
      </span>
      {compact ? STATUS_SHORT[status] : STATUS_LABELS[status]}
    </span>
  );
}
