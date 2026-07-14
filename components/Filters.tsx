"use client";

import { GAS_BRANDS } from "@/lib/brands";
import { FUEL_TYPES, type FuelStatus, type FuelType } from "@/lib/types";
import { CheckIcon } from "./Icons";
import ScrollFadeRow from "./ScrollFadeRow";

export type SortBy = "distance" | "fresh" | "price";

export interface FilterState {
  fuelType: FuelType | "all";
  brand: string;
  onlyAvailable: boolean;
  status: FuelStatus | "all";
  sortBy: SortBy;
  cheapestOnly: boolean;
}

// Все виды топлива видимы сразу — без неудобного выпадающего «Ещё…».
const FUEL_OPTIONS: (FuelType | "all")[] = ["all", ...FUEL_TYPES];

interface FiltersProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  /** Светлая тема (десктопный сайдбар карты, см. MapSidebar.tsx) — по умолчанию тёмная. */
  light?: boolean;
}

export default function Filters({ value, onChange, light = false }: FiltersProps) {
  const idleCls = light
    ? "border-paper-border bg-[#F7F9FB] text-paper-ink"
    : "filter-pill-idle";
  return (
    <div className="filter-panel space-y-3">
      <div className="filter-group-label">Топливо</div>
      {/* Топливо — все виды чипами в один прокручиваемый ряд */}
      <ScrollFadeRow className="filter-scroll-row no-scrollbar">
        {FUEL_OPTIONS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={value.fuelType === f}
            onClick={() => onChange({ ...value, fuelType: f })}
            className={`filter-pill shrink-0 ${
              value.fuelType === f ? "filter-pill-active" : idleCls
            }`}
          >
            {f === "all" ? "Всё топливо" : f}
          </button>
        ))}
      </ScrollFadeRow>

      <div className="filter-group-label">Наличие, цена и сеть</div>
      {/* Сеть АЗС + быстрый фильтр «есть бензин» */}
      <ScrollFadeRow className="filter-scroll-row no-scrollbar">
        <select
          aria-label="Сеть АЗС"
          value={value.brand}
          onChange={(e) => onChange({ ...value, brand: e.target.value })}
          className={`filter-pill max-w-[10rem] shrink-0 cursor-pointer appearance-none ${idleCls}`}
        >
          <option value="all" className={light ? "" : "bg-surface-raised"}>
            Все заправки
          </option>
          {GAS_BRANDS.map((b) => (
            <option key={b} value={b} className={light ? "" : "bg-surface-raised"}>
              {b}
            </option>
          ))}
        </select>

        <button
          type="button"
          aria-pressed={value.onlyAvailable}
          onClick={() => onChange({ ...value, onlyAvailable: !value.onlyAvailable })}
          className={`filter-pill inline-flex shrink-0 items-center gap-1.5 ${
            value.onlyAvailable
              ? "border-fuel-yes bg-fuel-yes/20 text-fuel-yes"
              : idleCls
          }`}
        >
          <CheckIcon className="h-4 w-4" />
          Есть бензин
        </button>

        <button
          type="button"
          aria-pressed={value.cheapestOnly}
          disabled={value.fuelType === "all"}
          title={
            value.fuelType === "all"
              ? "Сначала выберите вид топлива"
              : "Топ-3 самых дешёвых в области карты"
          }
          onClick={() => onChange({ ...value, cheapestOnly: !value.cheapestOnly })}
          className={`filter-pill shrink-0 disabled:cursor-not-allowed disabled:opacity-40 ${
            value.cheapestOnly
              ? "border-fuel-yes bg-fuel-yes/20 text-fuel-yes"
              : idleCls
          }`}
        >
          {value.fuelType === "all" ? "Выберите топливо" : "Топ-3 дешевле"}
        </button>
      </ScrollFadeRow>
    </div>
  );
}
