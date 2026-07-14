"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { distanceKm, formatDistance } from "@/lib/geo";
import {
  bestPrice,
  QUEUE_LABELS,
  STATUS_HEX,
  STATUS_SHORT,
  type FuelType,
  type StationStatus,
} from "@/lib/types";
import { comparePrice, PRICE_LEVEL_HEX } from "@/lib/priceLevel";
import { displayName } from "@/lib/brands";
import { isFavorite as checkIsFavorite } from "@/lib/favorites";
import type { SortBy } from "./Filters";
import StatusBadge, { STATUS_GLYPH } from "./StatusBadge";
import BrandBadge from "./BrandBadge";
import StationMetaRow from "./StationMetaRow";
import { FuelPumpIcon, StarIcon } from "./Icons";
import { NEAR_RADIUS_DEFAULT_KM } from "@/lib/useNearRadius";
import { hapticTick } from "@/lib/haptics";

export type ListMode = "near" | "recent" | "fuel" | "favorites";

// Единый порядок/подписи вкладок списка — общие для десктопного MapSidebar и
// мобильного MobileNearbySheet, чтобы не путать привычку между экранами.
export const LIST_MODE_TABS: { id: ListMode; label: string; short: string }[] = [
  { id: "near", label: "Рядом", short: "Рядом" },
  { id: "fuel", label: "Есть топливо", short: "Есть" },
  { id: "recent", label: "Свежие", short: "Свежие" },
  { id: "favorites", label: "Избранные", short: "★" },
];

const NEAR_MAX = 50;

/** Позиция скролла по вкладкам — переживает сворачивание листа. */
const tabScrollMemory = new Map<ListMode, number>();

interface StationListProps {
  stations: StationStatus[];
  userLocation: [number, number] | null;
  mapCenter: [number, number];
  onSelect: (s: StationStatus) => void;
  /** Наведение курсора на карточку или прокрутка списка до неё — подсвечивает
      соответствующий маркер на карте (см. MapLibreMapView.tsx: hoveredId). */
  onHighlight?: (id: string | null) => void;
  mode?: ListMode;
  embedded?: boolean;
  /** Радиус поиска для near, км (см. RadiusSelect.tsx / lib/useNearRadius.ts). */
  radiusKm?: number;
  /** Критерий сортировки для near/favorites (см. Filters.tsx) — по умолчанию расстояние. */
  sortBy?: SortBy;
  /** Топ-3 самых дешёвых по выбранному топливу (чип "Топ-3 дешевле" в Filters). */
  cheapestOnly?: boolean;
  fuelType?: FuelType | "all";
  /** Режим "Срочно: бензин" — подсвечивает отметки младше часа (см. B3). */
  emergencyActive?: boolean;
  /** Светлая тема (десктопный сайдбар карты, см. MapSidebar.tsx) — по умолчанию тёмная. */
  light?: boolean;
  /** Список скрыт за карточкой станции (см. MapSidebar/MobileNearbySheet), но
      не размонтирован — явно сохраняем и восстанавливаем scrollTop сами, а не
      полагаемся на браузер: побочные изменения размеров вокруг (например,
      счётчики над списком) могут сдвинуть его при повторном показе. */
  frozen?: boolean;
  /** Идёт самая первая загрузка станций (см. AppShell::mapDataReady) — вместо
      пустого списка/спиннера показываем skeleton-карточки. */
  firstLoad?: boolean;
  /** Потянуть список вниз от самого верха — принудительно обновить (передаёт
      только мобильный лист, см. MobileNearbySheet). Без этого проп жест не активен. */
  onPullRefresh?: () => void;
  /** Свайп карточки — добавить/убрать из избранного (передаёт только мобильный
      лист). Без этого проп жест не активен, карточка ведёт себя как раньше. */
  onToggleFavorite?: (id: string) => void;
}

const PULL_THRESHOLD_PX = 64;
const PULL_MAX_PX = 96;
const SWIPE_MAX_PX = 88;
const SWIPE_THRESHOLD_PX = 64;

const SKELETON_ROWS = 5;

function StationListSkeleton({ light, embedded }: { light: boolean; embedded: boolean }) {
  const block = light ? "bg-black/10" : "bg-white/10";
  return (
    <ul
      className={`thin-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pt-1 sm:px-4 ${
        embedded ? "pb-3" : "pb-36 sm:pb-28"
      }`}
      aria-hidden
    >
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <li
          key={i}
          className={`flex animate-pulse gap-3 p-3.5 sm:p-4 ${
            light ? "station-card-light" : "glass-card"
          }`}
        >
          <span className={`h-11 w-11 shrink-0 rounded-2xl ${block}`} />
          <div className="min-w-0 flex-1 space-y-2 py-0.5">
            <div className={`h-3.5 w-3/5 rounded ${block}`} />
            <div className={`h-3 w-2/5 rounded ${block}`} />
            <div className={`h-3 w-4/5 rounded ${block}`} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function priceForSort(s: StationStatus, fuelType?: FuelType | "all"): number {
  const price =
    fuelType && fuelType !== "all" ? s.prices[fuelType] : bestPrice(s.prices)?.price;
  return typeof price === "number" && price > 0 ? price : Infinity;
}

function freshTime(s: StationStatus): number {
  return s.last_report_at ? new Date(s.last_report_at).getTime() : 0;
}

function applySortBy<T extends StationStatus & { dist: number }>(
  list: T[],
  sortBy: SortBy | undefined,
  fuelType: FuelType | "all" | undefined
): T[] {
  if (sortBy === "fresh") {
    return [...list].sort((a, b) => freshTime(b) - freshTime(a));
  }
  if (sortBy === "price") {
    return [...list].sort(
      (a, b) => priceForSort(a, fuelType) - priceForSort(b, fuelType)
    );
  }
  return [...list].sort((a, b) => a.dist - b.dist);
}

const EMPTY_TEXT: Record<ListMode, { title: string; hint: string }> = {
  near: {
    title: "Здесь пока нет заправок",
    hint: "Увеличьте радиус поиска выше, сдвиньте карту или удержите палец на карте — «Добавить заправку».",
  },
  recent: {
    title: "Нет свежих отметок в этом месте",
    hint: "Отметьте ситуацию — помогите другим водителям узнать, где есть топливо.",
  },
  fuel: {
    title: "Рядом нет АЗС с подтверждённым топливом",
    hint: "Попробуйте увеличить область или проверьте отметки на карте.",
  },
  favorites: {
    title: "Нет избранных заправок",
    hint: "Нажмите ★ в карточке АЗС — и следите за ситуацией на своих заправках.",
  },
};

export default function StationList({
  stations,
  userLocation,
  mapCenter,
  onSelect,
  onHighlight,
  mode = "near",
  embedded = false,
  radiusKm = NEAR_RADIUS_DEFAULT_KM,
  sortBy = "distance",
  cheapestOnly = false,
  fuelType = "all",
  emergencyActive = false,
  light = false,
  frozen = false,
  firstLoad = false,
  onPullRefresh,
  onToggleFavorite,
}: StationListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [swipe, setSwipe] = useState<{ id: string; dx: number } | null>(null);
  const [undo, setUndo] = useState<{ id: string; wasFavorite: boolean } | null>(null);
  const swipeRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevModeRef = useRef(mode);
  // Непрерывно запоминаем позицию скролла на каждый scroll-жест, а не
  // разово в момент скрытия — к моменту, когда сработает эффект на
  // `frozen`, скрывающий класс на родителе (см. MapSidebar/MobileNearbySheet)
  // уже применён в том же коммите React, и el.scrollTop к этому времени уже
  // читается как 0 (нет layout'а). Значение из последнего реального скролла
  // всегда актуально на момент скрытия.
  const savedScrollRef = useRef(0);
  const prevFrozenRef = useRef(frozen);
  const ref = userLocation ?? mapCenter;

  // Карточки станций для scroll-подсветки (см. updateScrollHighlight ниже) —
  // ref-коллбэки на каждом <li> регистрируют/снимают себя сами при перерисовке.
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const highlightRafRef = useRef<number | null>(null);

  // При скролле подсвечиваем на карте станцию, чья карточка ближе всего к
  // верхнему краю списка — так на карте видно, какие заправки сейчас в
  // фокусе, даже без наведения мышью (актуально и для touch-скролла).
  const updateScrollHighlight = () => {
    if (!onHighlight) return;
    const el = listRef.current;
    if (!el) return;
    const containerTop = el.getBoundingClientRect().top;
    let closestId: string | null = null;
    let closestDist = Infinity;
    for (const [id, li] of itemRefs.current) {
      const dist = Math.abs(li.getBoundingClientRect().top - containerTop);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    }
    onHighlight(closestId);
  };

  const handleScroll = () => {
    if (!frozen && listRef.current) savedScrollRef.current = listRef.current.scrollTop;
    if (onHighlight) {
      if (highlightRafRef.current != null) cancelAnimationFrame(highlightRafRef.current);
      highlightRafRef.current = requestAnimationFrame(() => {
        highlightRafRef.current = null;
        updateScrollHighlight();
      });
    }
  };

  useLayoutEffect(() => {
    return () => {
      if (highlightRafRef.current != null) cancelAnimationFrame(highlightRafRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && !frozen && prevFrozenRef.current) {
      el.scrollTop = savedScrollRef.current;
    }
    prevFrozenRef.current = frozen;
  }, [frozen]);

  // Pull-to-refresh — тянем список вниз от самого верха. Активен только если
  // хост передал onPullRefresh (только мобильный лист, см. MobileNearbySheet)
  // и список не заморожен (открыта карточка станции поверх).
  useEffect(() => {
    if (!onPullRefresh || frozen) return;
    const el = listRef.current;
    if (!el) return;

    let startY = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      tracking = el.scrollTop <= 0;
      startY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      if (el.scrollTop > 0) {
        tracking = false;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startY;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      e.preventDefault();
      setPullDistance(Math.min(PULL_MAX_PX, delta * 0.5));
    };
    const onTouchEnd = () => {
      if (!tracking) return;
      tracking = false;
      setPullDistance((d) => {
        if (d >= PULL_THRESHOLD_PX) {
          hapticTick();
          setPullRefreshing(true);
          onPullRefresh();
          window.setTimeout(() => setPullRefreshing(false), 800);
        }
        return 0;
      });
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onPullRefresh, frozen]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // Свайп карточки — добавить/убрать из избранного, со снэкбаром "Отменить".
  // Направление не важно (влево/вправо) — единственное действие, как в
  // почтовых клиентах с одним свайп-жестом.
  const commitFavoriteSwipe = (id: string) => {
    if (!onToggleFavorite) return;
    const wasFavorite = checkIsFavorite(id);
    onToggleFavorite(id);
    hapticTick();
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndo({ id, wasFavorite });
    undoTimerRef.current = setTimeout(() => setUndo(null), 4500);
  };

  const handleUndo = () => {
    if (!undo || !onToggleFavorite) return;
    onToggleFavorite(undo.id);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndo(null);
  };

  const onItemTouchStart = (id: string) => (e: React.TouchEvent) => {
    if (!onToggleFavorite) return;
    const t = e.touches[0];
    swipeRef.current = { id, startX: t.clientX, startY: t.clientY, active: true };
  };

  const onItemTouchMove = (e: React.TouchEvent) => {
    const drag = swipeRef.current;
    if (!drag?.active) return;
    const t = e.touches[0];
    const dx = t.clientX - drag.startX;
    const dy = t.clientY - drag.startY;
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
      // Вертикальный жест — отдаём его нативному скроллу списка.
      swipeRef.current = null;
      setSwipe(null);
      return;
    }
    if (Math.abs(dx) < 6) return;
    setSwipe({ id: drag.id, dx: Math.max(-SWIPE_MAX_PX, Math.min(SWIPE_MAX_PX, dx)) });
  };

  const onItemTouchEnd = () => {
    const drag = swipeRef.current;
    swipeRef.current = null;
    if (!drag) return;
    setSwipe((cur) => {
      if (cur && cur.id === drag.id && Math.abs(cur.dx) >= SWIPE_THRESHOLD_PX) {
        commitFavoriteSwipe(cur.id);
      }
      return null;
    });
  };

  // Референс цен для сравнения "дёшево/дорого" — все станции текущей
  // выборки (не только отфильтрованный/отсортированный подсписок ниже).
  const priceReference = useMemo(() => stations.map((s) => s.prices), [stations]);

  const withDist = stations.map((s) => ({
    ...s,
    dist: distanceKm(ref[0], ref[1], s.lat, s.lng),
  }));

  let sorted: typeof withDist;
  if (mode === "recent") {
    sorted = withDist
      .filter((s) => s.last_report_at && !s.stale)
      .sort(
        (a, b) =>
          new Date(b.last_report_at as string).getTime() -
          new Date(a.last_report_at as string).getTime()
      )
      .slice(0, 40);
  } else if (mode === "fuel") {
    const filtered = withDist.filter(
      (s) => s.status === "yes" || s.status === "low"
    );
    // Режим "Срочно: бензин" — многоуровневая сортировка: расстояние → свежесть → цена.
    sorted = (
      emergencyActive
        ? [...filtered].sort((a, b) => {
            if (a.dist !== b.dist) return a.dist - b.dist;
            const freshDiff = freshTime(b) - freshTime(a);
            if (freshDiff !== 0) return freshDiff;
            return priceForSort(a, fuelType) - priceForSort(b, fuelType);
          })
        : [...filtered].sort((a, b) => a.dist - b.dist)
    ).slice(0, 40);
  } else if (mode === "favorites") {
    sorted = applySortBy(withDist, sortBy, fuelType);
  } else {
    const inRadius = applySortBy(
      withDist.filter((s) => s.dist <= radiusKm),
      sortBy,
      fuelType
    );
    sorted =
      inRadius.length > 0
        ? inRadius.slice(0, NEAR_MAX)
        : applySortBy(withDist, sortBy, fuelType).slice(0, NEAR_MAX);
  }

  if (cheapestOnly && fuelType !== "all") {
    sorted = [...sorted]
      .filter((s) => typeof s.prices[fuelType] === "number" && s.prices[fuelType]! > 0)
      .sort((a, b) => priceForSort(a, fuelType) - priceForSort(b, fuelType))
      .slice(0, 3);
  }

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const prev = prevModeRef.current;
    if (prev !== mode) {
      tabScrollMemory.set(prev, el.scrollTop);
      prevModeRef.current = mode;
      el.scrollTop = tabScrollMemory.get(mode) ?? 0;
    }
  }, [mode]);

  useLayoutEffect(() => {
    const el = listRef.current;
    return () => {
      if (el) tabScrollMemory.set(mode, el.scrollTop);
    };
  }, [mode]);

  if (firstLoad && stations.length === 0) {
    return <StationListSkeleton light={light} embedded={embedded} />;
  }

  if (sorted.length === 0) {
    return (
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-3 px-6 pt-4 text-center ${
          embedded ? "pb-6" : "pb-36"
        }`}
      >
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-fuel/15 text-brand-fuel"
          aria-hidden
        >
          <FuelPumpIcon className="h-7 w-7" />
        </span>
        <p
          className={`text-base font-semibold ${light ? "text-paper-ink" : "text-white"}`}
        >
          {EMPTY_TEXT[mode].title}
        </p>
        <p
          className={`max-w-xs text-sm leading-relaxed ${
            light ? "text-paper-muted" : "text-ink-muted"
          }`}
        >
          {EMPTY_TEXT[mode].hint}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
    <ul
      ref={listRef}
      onScroll={handleScroll}
      onMouseLeave={() => onHighlight?.(null)}
      className={`thin-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pt-1 sm:px-4 ${
        embedded ? "pb-3" : "pb-36 sm:pb-28"
      }`}
    >
      {onPullRefresh && (pullDistance > 0 || pullRefreshing) && (
        <li
          className="flex items-center justify-center overflow-hidden"
          style={{
            height: pullRefreshing ? 36 : pullDistance,
            transition: pullRefreshing ? "height 0.15s ease" : undefined,
          }}
          aria-hidden
        >
          <span
            className={`h-4 w-4 rounded-full border-2 ${
              light ? "border-paper-muted" : "border-ink-muted"
            } border-t-transparent ${
              pullRefreshing || pullDistance >= PULL_THRESHOLD_PX ? "animate-spin" : ""
            }`}
          />
        </li>
      )}
      {sorted.map((s, i) => {
        const price = bestPrice(s.prices);
        const priceCompare = price
          ? comparePrice(price.fuel, price.price, priceReference)
          : null;
        const rankBadge = cheapestOnly && fuelType !== "all" && (
          <span className="station-rank-badge" aria-hidden>
            #{i + 1}
          </span>
        );
        const conflictDot = s.conflicting && (
          <span className="station-conflict-dot" title="Данные расходятся" aria-hidden />
        );
        const conflictBadge = s.conflicting && (
          <span className="station-conflict-badge station-conflict-badge--list">спорно</span>
        );

        const isSwiping = swipe?.id === s.id;
        const swipeBackground = onToggleFavorite && isSwiping && (
          <div
            className={`absolute inset-0 z-0 flex items-center rounded-2xl bg-brand-fuel/15 px-5 text-brand-fuel ${
              swipe.dx < 0 ? "justify-end" : "justify-start"
            }`}
            aria-hidden
          >
            <StarIcon
              className="h-5 w-5"
              filled={Math.abs(swipe.dx) >= SWIPE_THRESHOLD_PX}
            />
          </div>
        );
        const swipeHandlers = onToggleFavorite
          ? {
              onTouchStart: onItemTouchStart(s.id),
              onTouchMove: onItemTouchMove,
              onTouchEnd: onItemTouchEnd,
              onTouchCancel: onItemTouchEnd,
            }
          : {};
        const swipeStyle = isSwiping
          ? { transform: `translateX(${swipe.dx}px)`, transition: "none" as const }
          : undefined;

        if (light) {
          return (
            <li
              key={s.id}
              ref={(el) => {
                if (el) itemRefs.current.set(s.id, el);
                else itemRefs.current.delete(s.id);
              }}
              className="relative"
            >
              {swipeBackground}
              <button
                type="button"
                // Без этого фокус по клику сам скроллит список (частично
                // видимая кнопка попадает в зону видимости целиком) ещё до
                // того, как карточка станции скроет список — из-за этого
                // терялась исходная позиция прокрутки (см. frozen выше).
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(s)}
                onMouseEnter={() => onHighlight?.(s.id)}
                className={`station-card-light group relative z-10 ${
                  onToggleFavorite ? "touch-pan-y" : ""
                }`}
                style={swipeStyle}
                {...swipeHandlers}
              >
                <span className="relative shrink-0">
                  <BrandBadge brand={s.brand} name={s.name} size={44} />
                  {conflictDot}
                  {rankBadge}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="station-status-pill"
                      style={{
                        color: STATUS_HEX[s.status],
                        background: `${STATUS_HEX[s.status]}1f`,
                      }}
                    >
                      <span
                        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-black leading-none text-white"
                        style={{ background: STATUS_HEX[s.status] }}
                        aria-hidden
                      >
                        {STATUS_GLYPH[s.status]}
                      </span>
                      {STATUS_SHORT[s.status]}
                    </span>
                    {conflictBadge}
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-paper-muted">
                      {formatDistance(s.dist)}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-1 font-semibold leading-snug text-paper-ink group-hover:text-brand-fuelDim">
                    {displayName(s)}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-paper-muted">
                    {price && (
                      <span
                        className="inline-flex items-center gap-1 font-semibold tabular-nums"
                        style={{
                          color: priceCompare
                            ? PRICE_LEVEL_HEX[priceCompare.level]
                            : undefined,
                        }}
                      >
                        {price.fuel} · {price.price.toFixed(2)} ₽/л
                      </span>
                    )}
                    {s.queue && s.queue !== "none" && <span>{QUEUE_LABELS[s.queue]}</span>}
                    {s.limit_liters ? <span>лимит {s.limit_liters} л</span> : null}
                  </div>
                  <StationMetaRow station={s} light />
                </div>
              </button>
            </li>
          );
        }

        return (
        <li
          key={s.id}
          ref={(el) => {
            if (el) itemRefs.current.set(s.id, el);
            else itemRefs.current.delete(s.id);
          }}
          className="relative"
        >
          {swipeBackground}
          <button
            type="button"
            // См. комментарий у аналогичной light-кнопки выше — предотвращает
            // авто-скролл списка к фокусу до того, как список скроется.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(s)}
            onMouseEnter={() => onHighlight?.(s.id)}
            className={`glass-card group relative z-10 flex w-full cursor-pointer gap-3 p-3.5 text-left transition hover:border-white/15 sm:p-4 ${
              onToggleFavorite ? "touch-pan-y" : ""
            }`}
            style={swipeStyle}
            {...swipeHandlers}
          >
            <span className="relative shrink-0">
              <BrandBadge brand={s.brand} name={s.name} size={44} />
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[#161a33]"
                style={{
                  background: STATUS_HEX[s.status],
                  boxShadow: `0 0 8px ${STATUS_HEX[s.status]}66`,
                }}
                aria-hidden
              />
              {conflictDot}
              {rankBadge}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 font-semibold leading-snug text-white group-hover:text-brand-fuel">
                  {displayName(s)}
                </span>
                <span className="shrink-0 text-xs font-medium tabular-nums text-brand-accent">
                  {formatDistance(s.dist)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={s.status} compact />
                {conflictBadge}
                {emergencyActive &&
                  s.last_report_at &&
                  Date.now() - new Date(s.last_report_at).getTime() < 3600_000 && (
                    <span className="rounded-full bg-fuel-yes/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-fuel-yes">
                      обновлено &lt; 1 ч
                    </span>
                  )}
                {price && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums"
                    style={{
                      color: priceCompare
                        ? PRICE_LEVEL_HEX[priceCompare.level]
                        : undefined,
                    }}
                  >
                    {priceCompare && priceCompare.level !== "unknown" && (
                      <span
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: PRICE_LEVEL_HEX[priceCompare.level] }}
                        aria-hidden
                      />
                    )}
                    {price.price.toFixed(2)} ₽/л
                  </span>
                )}
                {s.queue && s.queue !== "none" && (
                  <span className="text-xs text-traffic-slow">
                    {QUEUE_LABELS[s.queue]}
                  </span>
                )}
                {s.limit_liters ? (
                  <span className="text-xs text-ink-muted">
                    лимит {s.limit_liters} л
                  </span>
                ) : null}
              </div>
              <StationMetaRow station={s} />
              {s.address && (
                <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">
                  {s.address}
                </span>
              )}
            </div>
          </button>
        </li>
        );
      })}
    </ul>
    {undo && (
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
        <div className="undo-snackbar pointer-events-auto">
          <span>{undo.wasFavorite ? "Убрано из избранного" : "Добавлено в избранное"}</span>
          <button type="button" onClick={handleUndo} className="undo-snackbar__action">
            Отменить
          </button>
        </div>
      </div>
    )}
    </div>
  );
}
