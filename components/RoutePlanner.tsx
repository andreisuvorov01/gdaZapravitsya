"use client";

import { useState } from "react";
import CitySearch from "./CitySearch";
import { CloseIcon, RouteIcon } from "./Icons";

interface RoutePlannerProps {
  open: boolean;
  onClose: () => void;
  onPlanRoute: (lat: number, lng: number) => void;
  loading?: boolean;
  stationCount?: number;
  /** Светлая тема (десктопный сайдбар карты, см. MapSidebar.tsx) — по умолчанию тёмная. */
  light?: boolean;
}

/** Поиск пункта назначения — заправки вдоль маршрута. */
export default function RoutePlanner({
  open,
  onClose,
  onPlanRoute,
  loading,
  stationCount,
  light = false,
}: RoutePlannerProps) {
  const [picked, setPicked] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div
      className={`route-planner ${light ? "route-planner--light" : "glass-dock"}`}
    >
      <div className="route-planner__head">
        <span className="route-planner__icon" aria-hidden>
          <RouteIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${light ? "text-paper-ink" : "text-white"}`}>
            Заправки по пути
          </p>
          <p className={`text-xs ${light ? "text-paper-muted" : "text-ink-muted"}`}>
            {loading
              ? "Строим маршрут…"
              : stationCount != null
                ? `${stationCount} АЗС вдоль дороги`
                : "Куда едете? Покажем АЗС по маршруту"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть планировщик маршрута"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            light
              ? "text-paper-muted hover:bg-black/5"
              : "text-ink-muted hover:bg-white/10"
          }`}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
      <CitySearch
        light={light}
        onFly={(lat, lng, zoom) => {
          setPicked(`${lat.toFixed(3)},${lng.toFixed(3)}`);
          onPlanRoute(lat, lng);
          if (zoom) void zoom;
        }}
      />
      {picked && !loading && stationCount === 0 && (
        <p className={`mt-2 text-xs ${light ? "text-paper-muted" : "text-ink-muted"}`}>
          По этому маршруту пока нет отмеченных АЗС в коридоре 2.5 км от дороги.
        </p>
      )}
    </div>
  );
}
