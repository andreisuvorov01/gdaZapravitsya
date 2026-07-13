"use client";

import { useEffect, useMemo, useRef } from "react";
import StationList, { LIST_MODE_TABS, type ListMode } from "./StationList";
import SortControl from "./SortControl";
import RadiusSelect from "./RadiusSelect";
import type { SortBy } from "./Filters";
import { useNearRadius } from "@/lib/useNearRadius";
import type { FuelStatus, FuelType, StationStatus } from "@/lib/types";
import { ChevronDownIcon, ChevronUpIcon, FuelPumpIcon, StarIcon } from "./Icons";

export type NearbySheetSnap = "peek" | "expanded";

// :root { font-size: 16px } зафиксирован в globals.css, поэтому 1rem = 16px
// надёжно (без зависимости от масштаба шрифта браузера).
const REM_PX = 16;
// Соответствует --mobile-sheet-peek (3.75rem) в globals.css.
const PEEK_PX = 3.75 * REM_PX;
// Соответствует min(85dvh, calc(100dvh - 4.5rem)) в .nearby-sheet--expanded.
// dvh недоступен из JS напрямую — innerHeight достаточно точен для превью
// во время драга, а точное значение всё равно даёт CSS-класс при отпускании.
function expandedMaxPx(): number {
  if (typeof window === "undefined") return 0;
  const vh = window.innerHeight;
  return Math.min(0.85 * vh, vh - 4.5 * REM_PX);
}
// Порог смещения (px), после которого жест считается перетаскиванием, а не тапом.
const DRAG_THRESHOLD = 8;
// Скорость (px/мс), при которой быстрый "флик" переоткрывает лист независимо
// от того, до какой доли пройден путь между peek и expanded.
const FLING_VELOCITY = 0.5;


interface MobileNearbySheetProps {
  stations: StationStatus[];
  favoriteStations: StationStatus[];
  userLocation: [number, number] | null;
  mapCenter: [number, number];
  listMode: ListMode;
  onListModeChange: (mode: ListMode) => void;
  snap: NearbySheetSnap;
  onSnapChange: (snap: NearbySheetSnap) => void;
  onSelect: (s: StationStatus) => void;
  favoriteCount: number;
  hidden?: boolean;
  statusCounts: Record<FuelStatus, number>;
  routeHint?: string | null;
  sortBy?: SortBy;
  onSortByChange?: (sortBy: SortBy) => void;
  cheapestOnly?: boolean;
  fuelType?: FuelType | "all";
  emergencyActive?: boolean;
}

/** Выдвижной лист «Рядом» — карта всегда на экране, список по запросу. */
export default function MobileNearbySheet({
  stations,
  favoriteStations,
  userLocation,
  mapCenter,
  listMode,
  onListModeChange,
  snap,
  onSnapChange,
  onSelect,
  favoriteCount,
  hidden = false,
  statusCounts,
  routeHint,
  sortBy = "distance",
  onSortByChange,
  cheapestOnly = false,
  fuelType = "all",
  emergencyActive = false,
}: MobileNearbySheetProps) {
  const expanded = snap === "expanded";
  const source = listMode === "favorites" ? favoriteStations : stations;
  const [radiusKm, setRadiusKm] = useNearRadius();

  const sheetRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    startY: number;
    startHeight: number;
    lastHeight: number;
    lastY: number;
    lastT: number;
    velocity: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  // Решение "остаться развёрнутым / свернуть в peek" — общее для драга за
  // ручку и для продолжения свайпа вниз с самого верха списка (см. эффект
  // ниже). Хуки должны идти безусловно до `if (hidden) return null;` ниже.
  const applySnapDecision = (lastHeight: number, velocity: number) => {
    const mid = (PEEK_PX + expandedMaxPx()) / 2;
    let nextSnap: NearbySheetSnap;
    if (velocity > FLING_VELOCITY) nextSnap = "expanded";
    else if (velocity < -FLING_VELOCITY) nextSnap = "peek";
    else nextSnap = lastHeight > mid ? "expanded" : "peek";
    onSnapChange(nextSnap);
  };
  const applySnapDecisionRef = useRef(applySnapDecision);
  applySnapDecisionRef.current = applySnapDecision;

  // Продолжение свайпа вниз, когда список уже докручен до самого верха —
  // без этого пришлось бы сначала отпустить палец и заново тянуть за ручку.
  useEffect(() => {
    const root = sheetRef.current;
    if (!root) return;

    let active = false;
    let capturing = false;
    let scrollEl: HTMLElement | null = null;
    let startY = 0;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (!expandedRef.current) return;
      const target = e.target as HTMLElement;
      scrollEl = target.closest<HTMLElement>(".thin-scroll");
      if (!scrollEl) return;
      active = true;
      capturing = false;
      startY = e.touches[0].clientY;
      lastY = startY;
      lastT = e.timeStamp;
      velocity = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active || !scrollEl) return;
      const y = e.touches[0].clientY;
      const delta = y - startY; // вниз — положительное

      if (!capturing) {
        if (scrollEl.scrollTop > 0 || delta <= 0) {
          lastY = y;
          lastT = e.timeStamp;
          return;
        }
        capturing = true;
        root.classList.add("nearby-sheet--dragging");
      }

      e.preventDefault();
      const dt = e.timeStamp - lastT;
      if (dt > 0) velocity = (lastY - y) / dt; // тот же знак, что в драге за ручку
      lastY = y;
      lastT = e.timeStamp;

      const next = Math.max(PEEK_PX, expandedMaxPx() - delta);
      root.style.maxHeight = `${next}px`;
    };

    const onTouchEnd = () => {
      if (!active) return;
      active = false;
      if (!capturing) return;
      capturing = false;
      root.classList.remove("nearby-sheet--dragging");
      root.style.maxHeight = "";
      const lastHeight = Math.max(PEEK_PX, expandedMaxPx() - (lastY - startY));
      applySnapDecisionRef.current(lastHeight, velocity);
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", onTouchEnd);
    root.addEventListener("touchcancel", onTouchEnd);
    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableNear = useMemo(
    () => stations.filter((s) => s.status === "yes" || s.status === "low").length,
    [stations]
  );

  const peekTitle =
    routeHint ??
    (listMode === "favorites"
      ? favoriteCount > 0
        ? `${favoriteCount} избранных`
        : "Избранные АЗС"
      : listMode === "fuel"
        ? `${source.filter((s) => s.status === "yes" || s.status === "low").length} с топливом`
        : listMode === "recent"
          ? "Свежие отметки"
          : availableNear > 0
            ? `${availableNear} с топливом рядом`
            : `${stations.length} АЗС на карте`);

  const peekHint =
    listMode === "favorites"
      ? "Нажмите ★ в карточке заправки"
      : statusCounts.yes > 0
        ? `${statusCounts.yes} подтверждённо есть`
        : "Потяните вверх — список";

  if (hidden) return null;

  const toggleSnap = () => onSnapChange(expanded ? "peek" : "expanded");

  // Драг за ручку/шапку — высота листа следует за пальцем напрямую (инлайн
  // max-height), а не только тап-переключение между peek/expanded. Финальный
  // снап решается по положению отпускания или скорости флика; CSS-переход
  // подхватывает точное значение после того, как инлайн-стиль сбрасывается.
  const onPeekPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = sheetRef.current;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const startHeight = el.getBoundingClientRect().height;
    dragRef.current = {
      startY: e.clientY,
      startHeight,
      lastHeight: startHeight,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
      moved: false,
    };
    el.classList.add("nearby-sheet--dragging");
  };

  const onPeekPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const el = sheetRef.current;
    if (!drag || !el) return;
    const delta = drag.startY - e.clientY; // тянем вверх — высота растёт
    if (Math.abs(delta) > DRAG_THRESHOLD) drag.moved = true;
    const next = Math.min(
      expandedMaxPx(),
      Math.max(PEEK_PX, drag.startHeight + delta)
    );
    drag.lastHeight = next;
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.velocity = (drag.lastY - e.clientY) / dt;
    drag.lastY = e.clientY;
    drag.lastT = e.timeStamp;
    if (drag.moved) el.style.maxHeight = `${next}px`;
  };

  const onPeekPointerUp = () => {
    const drag = dragRef.current;
    const el = sheetRef.current;
    dragRef.current = null;
    if (!drag || !el) return;
    el.classList.remove("nearby-sheet--dragging");
    el.style.maxHeight = "";
    if (!drag.moved) return; // обычный тап — переключит onClick

    suppressClickRef.current = true;
    applySnapDecision(drag.lastHeight, drag.velocity);
  };

  const handlePeekClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    toggleSnap();
  };

  return (
    <>
      {expanded && (
        <button
          type="button"
          aria-label="Свернуть список"
          className="overlay-backdrop-in fixed inset-0 z-[500] bg-black/45 sm:hidden"
          onClick={() => onSnapChange("peek")}
        />
      )}

      <section
        ref={sheetRef}
        className={`nearby-sheet nearby-sheet--${snap} sm:hidden`}
        aria-label="Заправки рядом"
      >
        <span className="nearby-sheet__glow" aria-hidden />

        <button
          type="button"
          onClick={handlePeekClick}
          onPointerDown={onPeekPointerDown}
          onPointerMove={onPeekPointerMove}
          onPointerUp={onPeekPointerUp}
          onPointerCancel={onPeekPointerUp}
          aria-expanded={expanded}
          className="nearby-sheet__peek"
        >
          <span className="nearby-sheet__handle" aria-hidden />
          <span className="nearby-sheet__peek-icon" aria-hidden>
            {listMode === "favorites" ? (
              <StarIcon className="h-5 w-5" filled={favoriteCount > 0} />
            ) : (
              <FuelPumpIcon className="h-5 w-5" />
            )}
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-bold text-white">
              {peekTitle}
            </span>
            <span className="block truncate text-xs text-ink-muted">{peekHint}</span>
          </span>
          <span className="nearby-sheet__chevron" aria-hidden>
            {expanded ? (
              <ChevronDownIcon className="h-5 w-5" />
            ) : (
              <ChevronUpIcon className="h-5 w-5" />
            )}
          </span>
        </button>

        <div className="nearby-sheet__body" aria-hidden={!expanded}>
            <div
              className="nearby-sheet__segments no-scrollbar"
              role="tablist"
              aria-label="Список заправок"
            >
              {LIST_MODE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={listMode === tab.id}
                  tabIndex={expanded ? 0 : -1}
                  onClick={() => onListModeChange(tab.id)}
                  className={`nearby-sheet__segment ${
                    listMode === tab.id ? "nearby-sheet__segment--active" : ""
                  }`}
                >
                  {tab.short}
                  {tab.id === "favorites" && favoriteCount > 0 && (
                    <span className="nearby-sheet__segment-badge">{favoriteCount}</span>
                  )}
                </button>
              ))}
            </div>

            {onSortByChange && (
              <div className="mb-2 flex items-center gap-2 px-3">
                <SortControl
                  value={sortBy}
                  onChange={onSortByChange}
                  className="min-w-0 flex-1"
                />
                {listMode === "near" && (
                  <RadiusSelect value={radiusKm} onChange={setRadiusKm} />
                )}
              </div>
            )}

            <StationList
              stations={source}
              userLocation={userLocation}
              mapCenter={mapCenter}
              onSelect={onSelect}
              mode={listMode}
              embedded
              radiusKm={radiusKm}
              sortBy={sortBy}
              cheapestOnly={cheapestOnly}
              fuelType={fuelType}
              emergencyActive={emergencyActive}
            />
        </div>
      </section>
    </>
  );
}
