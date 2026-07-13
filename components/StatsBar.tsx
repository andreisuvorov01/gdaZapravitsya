import type { FuelStatus } from "@/lib/types";
import { STATUS_HEX } from "@/lib/types";

interface StatsBarProps {
  counts: Record<FuelStatus, number>;
  total: number;
  activeStatus?: FuelStatus | "all";
  onToggleStatus?: (status: FuelStatus) => void;
}

const ITEMS: { key: FuelStatus; label: string; chip: string }[] = [
  { key: "yes", label: "есть", chip: "chip-yes" },
  { key: "low", label: "мало", chip: "chip-low" },
  { key: "no", label: "нет", chip: "chip-no" },
  { key: "unknown", label: "нет данных", chip: "chip-unknown" },
];

export default function StatsBar({
  counts,
  total,
  activeStatus = "all",
  onToggleStatus,
}: StatsBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      aria-label={`Всего ${total} заправок на карте`}
    >
      <span className="stat-chip border border-white/10 bg-white/5 text-ink">
        <span className="font-display text-sm font-bold text-white">{total}</span>
        <span className="text-ink-muted">АЗС</span>
      </span>
      {ITEMS.map(({ key, label, chip }) => {
        if (counts[key] <= 0) return null;
        const active = activeStatus === key;
        const Tag = onToggleStatus ? "button" : "span";
        return (
          <Tag
            key={key}
            type={onToggleStatus ? "button" : undefined}
            aria-pressed={onToggleStatus ? active : undefined}
            onClick={onToggleStatus ? () => onToggleStatus(key) : undefined}
            className={`stat-chip ${chip} ${onToggleStatus ? "stat-chip--clickable" : ""} ${
              active ? "stat-chip--active" : ""
            }`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: STATUS_HEX[key] }}
              aria-hidden
            />
            <span>{counts[key]}</span>
            <span className="hidden font-normal opacity-80 sm:inline">{label}</span>
          </Tag>
        );
      })}
    </div>
  );
}
