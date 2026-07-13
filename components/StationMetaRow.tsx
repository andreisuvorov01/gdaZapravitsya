"use client";

import { computeVerdict, timeAgo, VERDICT_HEX } from "@/lib/freshness";
import type { StationStatus } from "@/lib/types";

// Компактная строка свежести/конфликта для строки списка (не дубль VerdictBadge:
// та же шкала через computeVerdict()/VERDICT_HEX, но в одну строку под карточкой АЗС.
export default function StationMetaRow({ station }: { station: StationStatus }) {
  const verdict = computeVerdict(station, 0);

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: VERDICT_HEX[verdict.level] }}
        aria-hidden
      />
      <span className="font-medium tabular-nums">
        {station.last_report_at ? (
          <>
            <span className="text-ink-muted">обновлено </span>
            <span className="text-ink">{timeAgo(station.last_report_at)}</span>
            {station.reports_count > 0 && (
              <span className="text-ink-muted">
                {" "}
                · {station.reports_count} отметок за 3 ч
              </span>
            )}
          </>
        ) : (
          <span className="text-ink-muted">нет свежих отчётов</span>
        )}
      </span>
      {station.conflicting && (
        <span
          className="rounded-full border border-fuel-low/40 bg-fuel-low/10 px-2 py-0.5 font-semibold text-fuel-low"
          title="Отчёты пользователей расходятся — уточните на месте"
        >
          данные расходятся
        </span>
      )}
      {station.stale && station.last_report_at && (
        <span className="text-ink-muted">устарело</span>
      )}
    </div>
  );
}
