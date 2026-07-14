import type { OptimisticReportPatch, StationStatus } from "./types";

/**
 * Мгновенно применяет только что отправленный отчёт к локальному списку
 * станций — без пересчёта полного взвешенного голосования (см.
 * lib/freshness.ts::aggregateStation, который выполняется на сервере). Это
 * приближение: свежий отчёт пользователя почти всегда и есть текущий
 * "победитель" голосования, поэтому приближения достаточно для мгновенной
 * обратной связи, до того как фоновый refresh() подтянет точный агрегат.
 */
export function applyOptimisticReportPatch(
  list: StationStatus[],
  stationId: string,
  patch: OptimisticReportPatch
): StationStatus[] {
  let changed = false;
  const next = list.map((s) => {
    if (s.id !== stationId) return s;
    changed = true;
    return {
      ...s,
      status: patch.status,
      queue: patch.queue,
      fuel_types: patch.fuel_types.length > 0 ? patch.fuel_types : s.fuel_types,
      limit_liters: patch.limit_liters,
      prices:
        patch.prices && Object.keys(patch.prices).length > 0
          ? { ...s.prices, ...patch.prices }
          : s.prices,
      last_report_at: new Date().toISOString(),
      reports_count: s.reports_count + 1,
      stale: false,
      conflicting: false,
    };
  });
  return changed ? next : list;
}
