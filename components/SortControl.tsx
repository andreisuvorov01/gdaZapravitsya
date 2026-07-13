"use client";

import type { SortBy } from "./Filters";

const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: "distance", label: "Ближе" },
  { id: "fresh", label: "Свежее" },
  { id: "price", label: "Дешевле" },
];

interface SortControlProps {
  value: SortBy;
  onChange: (next: SortBy) => void;
  className?: string;
}

/** Сортировка списка — вынесена из Filters в постоянно видимый ряд, а не
    спрятана за лишним тапом «Фильтры» (переупорядочивает 40+ строк). */
export default function SortControl({ value, onChange, className = "" }: SortControlProps) {
  return (
    <div
      className={`filter-scroll-row no-scrollbar ${className}`}
      role="group"
      aria-label="Сортировка"
    >
      {SORT_OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`filter-pill shrink-0 !min-h-[40px] !px-3 !text-xs ${
            value === o.id ? "filter-pill-active" : "filter-pill-idle"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
