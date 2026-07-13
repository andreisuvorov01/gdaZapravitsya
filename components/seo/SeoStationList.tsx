"use client";

import { useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/freshness";
import { displayName } from "@/lib/brands";
import { QUEUE_LABELS, STATUS_LABELS, type StationStatus } from "@/lib/types";
import StatusChip from "@/components/StatusChip";
import SeoStationPrice from "@/components/seo/SeoStationPrice";
import SeoListEngage from "@/components/seo/SeoListEngage";

const PAGE_SIZE = 10;

interface SeoListEngageProps {
  medium: string;
  pageUrl: string;
  cityName: string;
  cityPrep: string;
  pageTitle: string;
}

interface SeoStationListProps {
  stations: StationStatus[];
  citySlug: string;
  cityPrep: string;
  emptyHint: string;
  heading: string;
  engage?: SeoListEngageProps;
}

function stationMeta(s: StationStatus): string {
  const parts: string[] = [STATUS_LABELS[s.status]];
  if (s.fuel_types.length > 0) parts.push(s.fuel_types.join(", "));
  if (s.queue && s.queue !== "none") parts.push(QUEUE_LABELS[s.queue]);
  if (s.limit_liters != null) parts.push(`лимит ${s.limit_liters} л`);
  if (s.last_report_at) parts.push(timeAgo(s.last_report_at));
  return parts.join(" · ");
}

export default function SeoStationList({
  stations,
  citySlug,
  cityPrep,
  emptyHint,
  heading,
  engage,
}: SeoStationListProps) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = stations.slice(0, shown);
  const hasMore = shown < stations.length;

  return (
    <section className="seo-section mt-8" aria-label={heading}>
      <h2 className="seo-section__title">{heading}</h2>
      <p className="seo-section__lead">
        Список обновляется по мере новых отчётов. Нажмите «На карте» — откроется
        заправка с геолокацией.
      </p>

      {stations.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-surface/40 p-6 text-sm text-ink-muted">
          {emptyHint}{" "}
          <Link href={`/?city=${citySlug}`} className="text-brand-fuel underline">
            Открыть карту {cityPrep}
          </Link>{" "}
          и отметьте статус — так помогаете другим водителям.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {visible.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-surface/60 p-3.5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{displayName(s)}</span>
                    {s.brand && (
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-ink-muted">
                        {s.brand}
                      </span>
                    )}
                  </div>
                  {s.address && (
                    <p className="mt-1 text-sm text-ink-muted">{s.address}</p>
                  )}
                  <p className="mt-1 text-xs text-ink-muted">{stationMeta(s)}</p>
                  <SeoStationPrice station={s} />
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <StatusChip status={s.status} />
                  <Link
                    href={`/?city=${citySlug}&station=${s.id}`}
                    className="cursor-pointer rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-brand-fuel transition-colors duration-200 hover:border-brand-fuel/40 hover:bg-brand-fuel/10"
                  >
                    На карте
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col items-center gap-2">
            {hasMore ? (
              <button
                type="button"
                className="seo-station-list__more"
                onClick={() =>
                  setShown((n) => Math.min(n + PAGE_SIZE, stations.length))
                }
              >
                Загрузить ещё
                <span className="seo-station-list__more-count">
                  +{Math.min(PAGE_SIZE, stations.length - shown)}
                </span>
              </button>
            ) : (
              <p className="text-xs text-ink-muted">
                Показаны все {stations.length} заправок
              </p>
            )}
          </div>
        </>
      )}

      {engage && <SeoListEngage {...engage} />}
    </section>
  );
}
