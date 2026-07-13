"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import CitySearch from "./CitySearch";
import Filters, { type FilterState } from "./Filters";
import RoutePlanner from "./RoutePlanner";
import ShareButton from "./ShareButton";
import StatsBar from "./StatsBar";
import StationList, { LIST_MODE_TABS, type ListMode } from "./StationList";
import { useInstallPrompt } from "./InstallPromptContext";
import { DONATE_URL, SITE_NAME, SITE_URL } from "@/lib/site";
import type { FuelPrices, FuelStatus, StationStatus } from "@/lib/types";
import {
  ChevronDownIcon,
  FilterIcon,
  FuelPumpIcon,
  HeartIcon,
  InstallIcon,
  RouteIcon,
} from "./Icons";

const StationPanel = dynamic(() => import("./StationPanel"));

interface MapSidebarProps {
  onFly: (lat: number, lng: number, zoom?: number) => void;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  activeFilterCount: number;
  statusCounts: Record<FuelStatus, number>;
  total: number;
  emergencyActive: boolean;
  onEmergencyFuel: () => void;
  routeOpen: boolean;
  routeActive: boolean;
  onToggleRoute: () => void;
  onPlanRoute: (lat: number, lng: number) => void;
  routeLoading: boolean;
  routeStationCount: number;
  listMode: ListMode;
  onListModeChange: (mode: ListMode) => void;
  stations: StationStatus[];
  userLocation: [number, number] | null;
  /** "Замороженная" на время открытой карточки станции точка отсчёта для
      сортировки списка по расстоянию — см. AppShell.tsx. userLocation
      (выше) остаётся живым: он ещё нужен StationPanel для построения
      маршрута, пока список её не использует. */
  listUserLocation: [number, number] | null;
  mapCenter: [number, number];
  onSelect: (s: StationStatus) => void;
  /** Наведение/прокрутка списка до станции — подсвечивает её маркер на карте, см. AppShell.tsx. */
  onHighlightStation?: (id: string | null) => void;
  favoriteCount: number;
  /** Выбранная станция — если задана, сайдбар вместо поиска/фильтров/списка
      показывает её карточку (см. AppShell.tsx: раньше это была отдельная
      панель поверх карты, теперь она встроена в тот же слот). */
  selectedStation: StationStatus | null;
  onCloseStation: () => void;
  onReportStation: () => void;
  stationRefreshKey: number;
  onStationChanged: () => void;
  onRouteGeometry: (geom: GeoJSON.LineString | null) => void;
  onRequestLocation: () => void;
  isStationFavorite: boolean;
  onToggleStationFavorite: () => void;
  priceReference: FuelPrices[];
}

/**
 * Постоянный левый сайдбар карты на десктопе (от sm: и выше) — светлая тема,
 * список станций всегда виден рядом с картой (замена floating map-dock +
 * отдельного режима «Список», см. AppShell.tsx). Мобильная версия не
 * затронута — там по-прежнему MapDock + MobileNearbySheet.
 */
export default function MapSidebar({
  onFly,
  filters,
  onFiltersChange,
  activeFilterCount,
  statusCounts,
  total,
  emergencyActive,
  onEmergencyFuel,
  routeOpen,
  routeActive,
  onToggleRoute,
  onPlanRoute,
  routeLoading,
  routeStationCount,
  listMode,
  onListModeChange,
  stations,
  userLocation,
  listUserLocation,
  mapCenter,
  onSelect,
  onHighlightStation,
  favoriteCount,
  selectedStation,
  onCloseStation,
  onReportStation,
  stationRefreshKey,
  onStationChanged,
  onRouteGeometry,
  onRequestLocation,
  isStationFavorite,
  onToggleStationFavorite,
  priceReference,
}: MapSidebarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const { showChip: installShown, mobile: installMobile, openBanner: openInstallBanner } =
    useInstallPrompt();

  return (
    <aside className="map-sidebar hidden min-h-0 shrink-0 flex-col overflow-hidden sm:flex sm:w-[25rem] lg:w-[27rem]">
      {selectedStation && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
          <StationPanel
            station={selectedStation}
            onClose={onCloseStation}
            onReport={onReportStation}
            refreshKey={stationRefreshKey}
            onChanged={onStationChanged}
            userLocation={userLocation}
            onRouteGeometry={onRouteGeometry}
            onRequestLocation={onRequestLocation}
            isFavorite={isStationFavorite}
            onToggleFavorite={onToggleStationFavorite}
            priceReference={priceReference}
          />
        </div>
      )}
      {/* Список остаётся смонтированным и под карточкой станции (просто
          скрыт) — иначе StationList размонтировался бы вместе со своим
          скроллом и при закрытии карточки список всегда открывался бы
          заново сверху, а не с той позиции, где была выбрана станция. */}
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${selectedStation ? "hidden" : ""}`}>
      <div className="map-sidebar__panel shrink-0 space-y-3 p-4">
        {/* Логотип уже есть в SiteHeader над сайдбаром — здесь только поиск. */}
        <CitySearch onFly={onFly} light />

        <button
          type="button"
          onClick={() => setDisclaimerOpen((o) => !o)}
          aria-expanded={disclaimerOpen}
          className="map-sidebar__disclaimer"
        >
          <span>Это личные отметки водителей — сервис их не проверяет</span>
          <ChevronDownIcon
            className={`h-4 w-4 map-sidebar__disclaimer-chevron ${
              disclaimerOpen ? "map-sidebar__disclaimer-chevron--open" : ""
            }`}
          />
        </button>
        {disclaimerOpen && (
          <p className="map-sidebar__disclaimer-body">
            Статус, очереди и лимиты присылают сами водители в момент заезда на
            АЗС — мы не связываемся со станциями и не проверяем эти данные.
            Чем больше отметок за последние часы, тем точнее картина.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleRoute}
            aria-pressed={routeActive || routeOpen}
            className={`map-sidebar__route-btn ${
              routeActive || routeOpen ? "map-sidebar__route-btn--active" : ""
            }`}
          >
            <RouteIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {routeActive ? `По пути · ${routeStationCount}` : "В путь"}
            </span>
          </button>
          <button
            type="button"
            onClick={onEmergencyFuel}
            aria-pressed={emergencyActive}
            className={`map-sidebar__route-btn ${
              emergencyActive ? "map-sidebar__route-btn--active" : ""
            }`}
          >
            <FuelPumpIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">Срочно: бензин</span>
          </button>
        </div>

        {routeOpen && !routeActive && (
          <RoutePlanner
            open
            onClose={onToggleRoute}
            onPlanRoute={onPlanRoute}
            loading={routeLoading}
            stationCount={routeStationCount}
            light
          />
        )}

        <div className="map-sidebar__actions">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-label={
              activeFilterCount > 0
                ? `Фильтры, активно: ${activeFilterCount}`
                : "Фильтры"
            }
            className={`map-sidebar__action ${
              filtersOpen || activeFilterCount > 0 ? "map-sidebar__action--active" : ""
            }`}
          >
            <FilterIcon className="h-4 w-4 shrink-0" />
            Фильтры
            {activeFilterCount > 0 && <span className="map-sidebar__action-dot" aria-hidden />}
          </button>
          <ShareButton
            variant="sidebar"
            url={SITE_URL}
            title={SITE_NAME}
            text="Карта наличия топлива на АЗС России"
            label="Поделиться"
          />
          {installShown && (
            <button type="button" onClick={openInstallBanner} className="map-sidebar__action">
              <InstallIcon className="h-4 w-4 shrink-0" />
              {installMobile ? "На экран" : "На стол"}
            </button>
          )}
        </div>

        {filtersOpen && <Filters value={filters} onChange={onFiltersChange} light />}

        {DONATE_URL && (
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="map-sidebar__support"
          >
            <HeartIcon className="h-4 w-4 shrink-0" />
            Поддержать проект
          </a>
        )}
      </div>

      <div className="map-sidebar__tabs shrink-0 border-b border-paper-border bg-white px-4 py-2.5 no-scrollbar">
        {LIST_MODE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={listMode === t.id}
            onClick={() => onListModeChange(t.id)}
            className={`map-sidebar__tab ${
              listMode === t.id ? "map-sidebar__tab--active" : ""
            }`}
          >
            {t.label}
            {t.id === "favorites" && favoriteCount > 0 && ` · ${favoriteCount}`}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-1.5 pt-3">
        <span className="map-sidebar__section-title">Ближайшие АЗС</span>
        <StatsBar counts={statusCounts} total={total} light />
      </div>

      <StationList
        stations={stations}
        userLocation={listUserLocation}
        mapCenter={mapCenter}
        onSelect={onSelect}
        onHighlight={onHighlightStation}
        mode={listMode}
        sortBy={filters.sortBy}
        cheapestOnly={filters.cheapestOnly}
        fuelType={filters.fuelType}
        emergencyActive={emergencyActive}
        embedded
        light
        frozen={Boolean(selectedStation)}
      />
      </div>
    </aside>
  );
}
