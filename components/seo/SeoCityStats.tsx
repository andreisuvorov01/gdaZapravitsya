import { timeAgo } from "@/lib/freshness";
import { countByStatus } from "@/lib/seo-stations";
import type { StationStatus } from "@/lib/types";

interface SeoCityStatsProps {
  stations: StationStatus[];
  cityPrep: string;
  className?: string;
}

function latestReportAt(stations: StationStatus[]): string | null {
  let best: string | null = null;
  for (const s of stations) {
    if (!s.last_report_at) continue;
    if (!best || s.last_report_at > best) best = s.last_report_at;
  }
  return best;
}

/** Сводка по АЗС города — как у конкурентов, но по нашим данным. */
export default function SeoCityStats({
  stations,
  cityPrep,
  className = "mt-8",
}: SeoCityStatsProps) {
  if (stations.length === 0) return null;

  const counts = countByStatus(stations);
  const withFuel = counts.yes + counts.low;
  const pctFuel =
    stations.length > 0 ? Math.round((withFuel / stations.length) * 100) : 0;
  const lastAt = latestReportAt(stations);

  const cards: {
    label: string;
    value: string;
    tone?: "yes" | "low" | "no" | "muted";
  }[] = [
    { label: "АЗС в выборке", value: String(stations.length), tone: "muted" },
    {
      label: "С топливом",
      value: String(withFuel),
      tone: "yes",
    },
    {
      label: "Пусто",
      value: String(counts.no),
      tone: "no",
    },
    {
      label: "Доля с топливом",
      value: `${pctFuel}%`,
      tone: pctFuel >= 50 ? "yes" : pctFuel >= 25 ? "low" : "no",
    },
  ];

  const toneClass = (tone?: string) => {
    if (tone === "yes") return "text-fuel-yes";
    if (tone === "low") return "text-fuel-low";
    if (tone === "no") return "text-fuel-no";
    return "text-ink";
  };

  return (
    <section className={className} aria-label={`Сводка по АЗС ${cityPrep}`}>
      <div className="seo-stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="seo-stat-card">
            <p className="seo-stat-card__label">{c.label}</p>
            <p className={`seo-stat-card__value ${toneClass(c.tone)}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-muted sm:text-sm">
        По отчётам водителей:{" "}
        <span className="text-fuel-yes">есть — {counts.yes}</span>,{" "}
        <span className="text-fuel-low">мало или лимит — {counts.low}</span>,{" "}
        <span className="text-fuel-no">нет — {counts.no}</span>, без данных —{" "}
        {counts.unknown}.
        {lastAt && (
          <>
            {" "}
            Последняя отметка —{" "}
            <time dateTime={lastAt}>{timeAgo(lastAt)}</time>.
          </>
        )}
      </p>
    </section>
  );
}
