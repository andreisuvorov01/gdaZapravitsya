"use client";

import type { FuelStatus } from "@/lib/types";
import CitySearch from "./CitySearch";
import Filters, { type FilterState } from "./Filters";
import StatsBar from "./StatsBar";
import RoutePlanner from "./RoutePlanner";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  FilterIcon,
  FuelPumpIcon,
  RouteIcon,
} from "./Icons";

interface MapDockProps {
  onFly: (lat: number, lng: number, zoom?: number) => void;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  activeFilterCount: number;
  statusCounts: Record<FuelStatus, number>;
  total: number;
  loading: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  emergencyActive?: boolean;
  onEmergencyFuel?: () => void;
  routeOpen?: boolean;
  routeActive?: boolean;
  onToggleRoute?: () => void;
  onPlanRoute?: (lat: number, lng: number) => void;
  routeLoading?: boolean;
  routeStationCount?: number;
}

const DEFAULT_FILTERS: FilterState = {
  fuelType: "all",
  brand: "all",
  onlyAvailable: false,
  status: "all",
  sortBy: "distance",
  cheapestOnly: false,
};

const STATUS_FILTER_LABELS: Record<FuelStatus, string> = {
  yes: "Есть",
  low: "Мало",
  no: "Нет",
  unknown: "Нет данных",
};

function activeFilterLabels(filters: FilterState): string[] {
  const labels: string[] = [];
  if (filters.fuelType !== "all") labels.push(filters.fuelType);
  if (filters.brand !== "all") labels.push(filters.brand);
  if (filters.onlyAvailable) labels.push("Есть бензин");
  if (filters.status !== "all") labels.push(STATUS_FILTER_LABELS[filters.status]);
  return labels;
}

/** Плавающая панель поиска и фильтров над картой. */
export default function MapDock({
  onFly,
  filters,
  onFiltersChange,
  filtersOpen,
  onFiltersOpenChange,
  activeFilterCount,
  statusCounts,
  total,
  loading,
  collapsed,
  onCollapsedChange,
  emergencyActive = false,
  onEmergencyFuel,
  routeOpen = false,
  routeActive = false,
  onToggleRoute,
  onPlanRoute,
  routeLoading,
  routeStationCount,
}: MapDockProps) {
  const activeLabels = activeFilterLabels(filters);
  const availableCount = statusCounts.yes + statusCounts.low;

  return (
    <div className="animate-fade-up pointer-events-none absolute left-0 right-0 top-0 z-[600] p-2 sm:p-3">
      <section
        className="map-dock glass-dock pointer-events-auto mx-auto max-w-5xl"
        aria-label="Поиск и фильтры на карте"
      >
        <span className="map-dock__glow" aria-hidden />

        <div className="map-dock__head">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-expanded={!collapsed}
            aria-controls="map-dock-body"
            className="map-dock__head-toggle"
          >
            <span className="map-dock__head-icon" aria-hidden>
              <FuelPumpIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-bold text-white">Поиск на карте</span>
              <span className="block truncate text-xs text-ink-muted">
                {loading ? (
                  "Обновляем данные…"
                ) : availableCount > 0 ? (
                  <>
                    <span className="font-semibold text-brand-fuel tabular-nums">
                      {availableCount}
                    </span>{" "}
                    с топливом из {total} АЗС в области
                  </>
                ) : (
                  <>{total} АЗС в видимой области</>
                )}
              </span>
            </span>
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => onFiltersChange(DEFAULT_FILTERS)}
              className="map-dock__reset"
              aria-label="Сбросить все фильтры"
            >
              <CloseIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Сбросить</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-expanded={!collapsed}
            aria-controls="map-dock-body"
            aria-label={collapsed ? "Развернуть панель поиска" : "Свернуть панель поиска"}
            className="map-dock__collapse-btn"
          >
            {collapsed ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        <div
          id="map-dock-body"
          className={`map-dock__body ${collapsed ? "map-dock__body--collapsed" : ""}`}
        >
          <div className="map-dock__actions no-scrollbar">
            {onEmergencyFuel && (
              <button
                type="button"
                onClick={onEmergencyFuel}
                aria-pressed={emergencyActive}
                className={`map-dock__action map-dock__action--urgent ${
                  emergencyActive ? "map-dock__action--active" : ""
                }`}
              >
                <FuelPumpIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span>Срочно: бензин</span>
              </button>
            )}
            {onToggleRoute && (
              <button
                type="button"
                onClick={onToggleRoute}
                aria-pressed={routeActive || routeOpen}
                className={`map-dock__action ${
                  routeActive || routeOpen ? "map-dock__action--active" : ""
                }`}
              >
                <RouteIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span>{routeActive ? `По пути · ${routeStationCount ?? 0}` : "По пути"}</span>
              </button>
            )}
          </div>

          {routeOpen && !routeActive && onPlanRoute && (
            <RoutePlanner
              open
              onClose={() => onToggleRoute?.()}
              onPlanRoute={onPlanRoute}
              loading={routeLoading}
              stationCount={routeStationCount}
            />
          )}

          {!routeOpen && (
            <div className="map-dock__search">
              <CitySearch onFly={onFly} />
              <button
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="map-dock-filters"
                aria-label={
                  filtersOpen
                    ? "Свернуть фильтры"
                    : activeFilterCount > 0
                      ? `Фильтры, активно: ${activeFilterCount}`
                      : "Открыть фильтры"
                }
                onClick={() => onFiltersOpenChange(!filtersOpen)}
                className={`map-dock__filter-btn ${
                  filtersOpen || activeFilterCount > 0
                    ? "map-dock__filter-btn--active"
                    : ""
                }`}
              >
                <FilterIcon className="h-5 w-5 shrink-0" />
                <span>{filtersOpen ? "Свернуть" : "Фильтры"}</span>
                {!filtersOpen && activeFilterCount > 0 && (
                  <span className="map-dock__filter-badge">{activeFilterCount}</span>
                )}
              </button>
            </div>
          )}

          {!filtersOpen && activeLabels.length > 0 && (
            <div className="map-dock__active-chips no-scrollbar">
              {activeLabels.map((label) => (
                <span key={label} className="map-dock__active-chip">
                  {label}
                </span>
              ))}
            </div>
          )}

          <div
            id="map-dock-filters"
            className={`map-dock__filters ${
              filtersOpen ? "map-dock__filters--open" : "map-dock__filters--closed"
            }`}
          >
            <Filters value={filters} onChange={onFiltersChange} />
          </div>

          <div className="map-dock__stats">
            <StatsBar
              counts={statusCounts}
              total={total}
              activeStatus={filters.status}
              onToggleStatus={(status) =>
                onFiltersChange({
                  ...filters,
                  status: filters.status === status ? "all" : status,
                })
              }
            />
            {loading && (
              <span
                className="flex items-center gap-1.5 text-xs text-ink-muted"
                aria-live="polite"
              >
                <span className="h-2 w-2 animate-pulse-dot rounded-full bg-brand-fuel" />
                обновление…
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
