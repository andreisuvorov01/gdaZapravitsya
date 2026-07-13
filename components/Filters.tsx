"use client";

import { GAS_BRANDS } from "@/lib/brands";
import { FUEL_TYPES, type FuelStatus, type FuelType } from "@/lib/types";
import { CheckIcon } from "./Icons";

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
}

export default function Filters({ value, onChange }: FiltersProps) {
  return (
    <div className="space-y-2">
      {/* Топливо — все виды чипами в один прокручиваемый ряд */}
      <div className="filter-scroll-row no-scrollbar">
        {FUEL_OPTIONS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={value.fuelType === f}
            onClick={() => onChange({ ...value, fuelType: f })}
            className={`filter-pill shrink-0 ${
              value.fuelType === f ? "filter-pill-active" : "filter-pill-idle"
            }`}
          >
            {f === "all" ? "Всё топливо" : f}
          </button>
        ))}
      </div>

      {/* Сеть АЗС + быстрый фильтр «есть бензин» */}
      <div className="filter-scroll-row no-scrollbar">
        <select
          aria-label="Сеть АЗС"
          value={value.brand}
          onChange={(e) => onChange({ ...value, brand: e.target.value })}
          className="filter-pill filter-pill-idle max-w-[10rem] shrink-0 cursor-pointer appearance-none"
        >
          <option value="all" className="bg-surface-raised">
            Все заправки
          </option>
          {GAS_BRANDS.map((b) => (
            <option key={b} value={b} className="bg-surface-raised">
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
              : "filter-pill-idle"
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
              : "filter-pill-idle"
          }`}
        >
          Топ-3 дешевле
        </button>
      </div>
    </div>
  );
}
