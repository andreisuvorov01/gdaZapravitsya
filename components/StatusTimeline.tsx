"use client";

import { STATUS_HEX, STATUS_LABELS, type FuelStatus, type Report } from "@/lib/types";
import { STATUS_GLYPH } from "./StatusBadge";
import { timeAgo } from "@/lib/freshness";

// Склонение слова «раз» для числа смен статуса за сутки.
function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "раз";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "раза";
  return "раз";
}

/** Компактная история смены статусов (как на gdebenz.ru). */
export default function StatusTimeline({ reports }: { reports: Report[] }) {
  const sorted = [...reports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const changes: { status: FuelStatus; at: string }[] = [];
  let prev: FuelStatus | null = null;
  for (const r of sorted) {
    if (r.status !== prev) {
      changes.push({ status: r.status, at: r.created_at });
      prev = r.status;
    }
  }

  if (changes.length < 2) return null;

  const visible = changes.slice(0, 5);
  const changesLast24h = changes.filter(
    (c) => Date.now() - new Date(c.at).getTime() <= 24 * 60 * 60 * 1000
  ).length;

  return (
    <div className="status-timeline">
      <p className="status-timeline__title">История статусов</p>
      {changesLast24h >= 2 && (
        <p className="status-timeline__subtitle">
          Ситуация менялась {changesLast24h} {plural(changesLast24h)} за сутки
        </p>
      )}
      <ol className="status-timeline__list">
        {visible.map((c, i) => (
          <li key={`${c.at}-${i}`} className="status-timeline__item">
            <span
              className="status-timeline__dot"
              style={{ background: STATUS_HEX[c.status] }}
              aria-hidden
            >
              {STATUS_GLYPH[c.status]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-medium text-white">{STATUS_LABELS[c.status]}</span>
              <span className="ml-1.5 text-xs text-ink-muted">{timeAgo(c.at)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
