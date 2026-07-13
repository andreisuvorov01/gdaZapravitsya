import type { FuelStatus } from "@/lib/types";
import { STATUS_HEX, STATUS_SHORT } from "@/lib/types";
import { STATUS_GLYPH } from "./StatusBadge";

// Компактный цветной чип статуса наличия топлива.
export default function StatusChip({
  status,
  className = "",
}: {
  status: FuelStatus;
  className?: string;
}) {
  const hex = STATUS_HEX[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${className}`}
      style={{
        color: hex,
        backgroundColor: `${hex}1f`,
        border: `1px solid ${hex}59`,
      }}
    >
      <span
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black leading-none text-ink-dark"
        style={{ backgroundColor: hex }}
        aria-hidden="true"
      >
        {STATUS_GLYPH[status]}
      </span>
      {STATUS_SHORT[status]}
    </span>
  );
}
