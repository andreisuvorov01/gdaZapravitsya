"use client";

import { useState } from "react";
import CitySearch from "./CitySearch";
import Filters, { type FilterState } from "./Filters";
import SortControl from "./SortControl";
import RadiusSelect from "./RadiusSelect";
import StationList, { LIST_MODE_TABS, type ListMode } from "./StationList";
import type { StationStatus } from "@/lib/types";
import { DONATE_URL } from "@/lib/site";
import { useNearRadius } from "@/lib/useNearRadius";
import { FilterIcon } from "./Icons";

interface ListViewProps {
  stations: StationStatus[];
  userLocation: [number, number] | null;
  mapCenter: [number, number];
  listMode: ListMode;
  onListModeChange: (mode: ListMode) => void;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  onFly: (lat: number, lng: number, zoom?: number) => void;
  onSelect: (s: StationStatus) => void;
  favoriteCount: number;
  emergencyActive?: boolean;
}

/** Режим списка: стеклянные панели по бокам, карточки АЗС (mobile-first). */
export default function ListView({
  stations,
  userLocation,
  mapCenter,
  listMode,
  onListModeChange,
  filters,
  onFiltersChange,
  onFly,
  onSelect,
  favoriteCount,
  emergencyActive = false,
}: ListViewProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useNearRadius();
  const activeFilterCount =
    (filters.fuelType !== "all" ? 1 : 0) +
    (filters.brand !== "all" ? 1 : 0) +
    (filters.onlyAvailable ? 1 : 0);

  return (
    <div className="list-scene flex min-h-0 min-w-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 p-3 pb-2 sm:p-4">
          <div className="glass-dock space-y-2.5 rounded-2xl p-3 sm:p-3.5">
            <CitySearch onFly={onFly} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="list-filters"
                onClick={() => setFiltersOpen((o) => !o)}
                className={`relative inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors ${
                  filtersOpen || activeFilterCount > 0
                    ? "bg-brand-fuel text-ink-dark"
                    : "bg-white/5 text-ink hover:bg-white/10"
                }`}
              >
                <FilterIcon className="h-5 w-5" />
                Фильтры
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ink-dark px-1 text-xs font-bold text-brand-fuel">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filtersOpen && (
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="ml-auto text-xs font-medium text-ink-muted"
                >
                  Свернуть
                </button>
              )}
            </div>
            <div
              id="list-filters"
              className={filtersOpen ? "block" : "hidden"}
            >
              <Filters value={filters} onChange={onFiltersChange} />
            </div>
          </div>
          <div className="list-tabs-row no-scrollbar mt-2.5" role="tablist" aria-label="Фильтр списка">
            {LIST_MODE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={listMode === t.id}
                onClick={() => onListModeChange(t.id)}
                className={`list-tab shrink-0 ${
                  listMode === t.id ? "list-tab--active" : "list-tab--idle"
                }`}
              >
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
                {t.id === "favorites" && favoriteCount > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ink-dark/25 px-1 text-xs font-bold sm:ml-1.5">
                    {favoriteCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <SortControl
              value={filters.sortBy}
              onChange={(sortBy) => onFiltersChange({ ...filters, sortBy })}
              className="min-w-0 flex-1"
            />
            {listMode === "near" && (
              <RadiusSelect value={radiusKm} onChange={setRadiusKm} />
            )}
          </div>
        </div>

        <StationList
          stations={stations}
          userLocation={userLocation}
          mapCenter={mapCenter}
          onSelect={onSelect}
          mode={listMode}
          radiusKm={radiusKm}
          sortBy={filters.sortBy}
          cheapestOnly={filters.cheapestOnly}
          fuelType={filters.fuelType}
          emergencyActive={emergencyActive}
        />

        {DONATE_URL && (
          <div className="shrink-0 border-t border-white/10 px-4 py-3 text-center">
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink-muted transition-colors hover:text-brand-fuel"
            >
              Поблагодарить автора
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
