"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getClientId } from "@/lib/clientId";
import { SITE_NAME } from "@/lib/site";
import {
  computeVerdict,
  confidence,
  FRESHNESS_HEX,
  FRESHNESS_LABEL,
  FRESH_WINDOW_MS,
  PRICE_FRESH_MS,
  timeAgo,
} from "@/lib/freshness";
import {
  estimateQueue,
  QUEUE_CHANCE_HEX,
  QUEUE_CHANCE_LABEL,
} from "@/lib/queue";
import { comparePrice, PRICE_LEVEL_HEX, PRICE_LEVEL_LABEL } from "@/lib/priceLevel";
import { displayName } from "@/lib/brands";
import {
  fetchOsrmRoute,
  formatEta,
  formatRouteDistance,
} from "@/lib/route";
import {
  bestPrice,
  QUEUE_LABELS,
  STATUS_HEX,
  type FuelPrices,
  type Report,
  type StationStatus,
} from "@/lib/types";
import StatusBadge from "./StatusBadge";
import BrandBadge from "./BrandBadge";
import VerdictBadge from "./VerdictBadge";
import QuickReportBar from "./QuickReportBar";
import {
  ClockIcon,
  CloseIcon,
  CrosshairIcon,
  PlusIcon,
  RouteIcon,
  StarIcon,
  ThumbsUpIcon,
} from "./Icons";
import RouteButtons from "./RouteButtons";
import StatusTimeline from "./StatusTimeline";
import ShareButton from "./ShareButton";
import { shareStationUrl } from "@/lib/navigation";

interface StationPanelProps {
  station: StationStatus;
  onClose: () => void;
  onReport: () => void;
  refreshKey: number;
  onChanged: () => void;
  userLocation: [number, number] | null;
  onRouteGeometry: (geom: GeoJSON.LineString | null) => void;
  onRequestLocation: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  /** Цены соседних станций в текущей области карты — для оценки "дёшево/дорого". */
  priceReference: FuelPrices[];
  /** Встроена в лист «Рядом» (MobileNearbySheet) или в сайдбар (MapSidebar)
      вместо отдельной панели поверх карты — тогда свайп-ручка не нужна:
      хост уже сам управляет своим раскрытием/закрытием. */
  embedded?: boolean;
}

export default function StationPanel({
  station,
  onClose,
  onReport,
  refreshKey,
  onChanged,
  userLocation,
  onRouteGeometry,
  onRequestLocation,
  isFavorite,
  onToggleFavorite,
  priceReference,
  embedded = false,
}: StationPanelProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distanceM: number;
    durationS: number;
  } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showOldReports, setShowOldReports] = useState(false);
  const [priceConfirming, setPriceConfirming] = useState(false);
  const [priceConfirmed, setPriceConfirmed] = useState(false);
  const routeAbortRef = useRef<AbortController | null>(null);
  // Свайп вниз — сворачивает карточку на мобильном (bottom sheet); на
  // десктопе (статичный сайдбар) жест отключён. Есть два входа в один и тот
  // же драг: (1) хват за шапку в любой момент, (2) продолжение тяги вниз,
  // когда лента отчётов уже докручена до самого верха (см. scrollRef ниже).
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dismissDragRef = useRef<{
    el: HTMLElement;
    startY: number;
    lastY: number;
    lastT: number;
    velocity: number;
    moved: boolean;
  } | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    };
  }, []);

  const HEAD_DRAG_THRESHOLD = 8;
  const DISMISS_DISTANCE_PX = 90;
  const DISMISS_VELOCITY = 0.6;

  const isMobileSheet = () =>
    typeof window !== "undefined" && !window.matchMedia("(min-width: 640px)").matches;

  const beginDismissDrag = (el: HTMLElement, y: number, t: number) => {
    el.classList.remove("overlay-sheet-up");
    el.style.transition = "none";
    dismissDragRef.current = { el, startY: y, lastY: y, lastT: t, velocity: 0, moved: false };
  };

  const moveDismissDrag = (y: number, t: number) => {
    const drag = dismissDragRef.current;
    if (!drag) return;
    const delta = Math.max(0, y - drag.startY);
    if (delta > HEAD_DRAG_THRESHOLD) drag.moved = true;
    const dt = t - drag.lastT;
    if (dt > 0) drag.velocity = (y - drag.lastY) / dt;
    drag.lastY = y;
    drag.lastT = t;
    if (drag.moved) drag.el.style.transform = `translateY(${delta}px)`;
  };

  const endDismissDrag = (y: number) => {
    const drag = dismissDragRef.current;
    dismissDragRef.current = null;
    if (!drag) return;
    const delta = Math.max(0, y - drag.startY);
    if (drag.moved && (delta > DISMISS_DISTANCE_PX || drag.velocity > DISMISS_VELOCITY)) {
      drag.el.style.transition = "transform 0.2s ease-in";
      drag.el.style.transform = "translateY(100%)";
      dismissTimeoutRef.current = setTimeout(() => onCloseRef.current(), 200);
      return;
    }
    drag.el.style.transition = "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)";
    drag.el.style.transform = "";
  };

  const onHeadPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!isMobileSheet()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    const el = e.currentTarget.closest<HTMLElement>(".station-sheet-aside");
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    beginDismissDrag(el, e.clientY, e.timeStamp);
  };

  const onHeadPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    moveDismissDrag(e.clientY, e.timeStamp);
  };

  const onHeadPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    endDismissDrag(e.clientY);
  };

  // Продолжение свайпа вниз, когда лента отчётов дотянута до самого верха —
  // без этого пришлось бы отпускать палец и хватать заново за шапку.
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    let active = false;
    let capturing = false;
    let startY = 0;
    let startT = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (!isMobileSheet()) return;
      active = true;
      capturing = false;
      startY = e.touches[0].clientY;
      startT = e.timeStamp;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active) return;
      const y = e.touches[0].clientY;

      if (!capturing) {
        if (scrollEl.scrollTop > 0 || y <= startY) return;
        const el = scrollEl.closest<HTMLElement>(".station-sheet-aside");
        if (!el) return;
        capturing = true;
        beginDismissDrag(el, startY, startT);
      }

      e.preventDefault();
      moveDismissDrag(y, e.timeStamp);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      if (!capturing) return;
      capturing = false;
      endDismissDrag(e.changedTouches[0]?.clientY ?? startY);
    };

    scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollEl.addEventListener("touchmove", onTouchMove, { passive: false });
    scrollEl.addEventListener("touchend", onTouchEnd);
    scrollEl.addEventListener("touchcancel", onTouchEnd);
    return () => {
      scrollEl.removeEventListener("touchstart", onTouchStart);
      scrollEl.removeEventListener("touchmove", onTouchMove);
      scrollEl.removeEventListener("touchend", onTouchEnd);
      scrollEl.removeEventListener("touchcancel", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?station_id=${station.id}`);
      const json = await res.json();
      if (!res.ok) {
        setReports([]);
        return;
      }
      setReports(json.reports ?? []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [station.id]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    routeAbortRef.current?.abort();
    setRouteInfo(null);
    setRouteError(null);
    onRouteGeometry(null);
    setPriceConfirmed(false);
    setShowOldReports(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station.id]);

  useEffect(() => {
    return () => routeAbortRef.current?.abort();
  }, []);

  const now = Date.now();
  const freshConfirms = reports
    .filter((r) => now - new Date(r.created_at).getTime() <= FRESH_WINDOW_MS)
    .reduce((sum, r) => sum + (r.confirms ?? 0), 0);
  const conf = confidence({
    lastReportAt: station.last_report_at,
    reportsCount: station.reports_count,
    confirms: freshConfirms,
  });
  const verdict = computeVerdict(station, freshConfirms);

  const queueEstimate = useMemo(() => estimateQueue(reports), [reports]);

  // Умная лента: свежие (< 24 ч) видны сразу, более старые — по клику.
  const DAY_MS = 24 * 60 * 60 * 1000;
  const freshReports = reports.filter(
    (r) => now - new Date(r.created_at).getTime() < DAY_MS
  );
  const oldReports = reports.filter(
    (r) => now - new Date(r.created_at).getTime() >= DAY_MS
  );

  const priceEntries = useMemo(
    () => Object.entries(station.prices) as [keyof typeof station.prices, number][],
    [station]
  );
  const fuelTypesWithoutPrice = useMemo(
    () => station.fuel_types.filter((f) => !(f in station.prices)),
    [station]
  );
  const mainPrice = bestPrice(station.prices);
  const priceCompare = useMemo(
    () =>
      mainPrice ? comparePrice(mainPrice.fuel, mainPrice.price, priceReference) : null,
    [mainPrice, priceReference]
  );
  // "Серийный номер" талона в углу шапки — хвост id станции, реальный
  // идентификатор (можно сослаться на него в репорте о проблеме), а не
  // декоративная цифра.
  const ticketSerial = station.id.slice(-4).toUpperCase();

  const buildRoute = async () => {
    if (!userLocation) {
      onRequestLocation();
      return;
    }
    routeAbortRef.current?.abort();
    const ctrl = new AbortController();
    routeAbortRef.current = ctrl;
    setRouteError(null);
    setRouteLoading(true);
    try {
      const r = await fetchOsrmRoute(
        userLocation,
        [station.lat, station.lng],
        ctrl.signal
      );
      if (!r) {
        setRouteError("Не удалось построить маршрут — откройте в навигаторе ниже.");
        onRouteGeometry(null);
        return;
      }
      setRouteInfo({ distanceM: r.distanceM, durationS: r.durationS });
      onRouteGeometry(r.geometry);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setRouteError("Маршрут недоступен — откройте в навигаторе ниже.");
      onRouteGeometry(null);
    } finally {
      setRouteLoading(false);
    }
  };

  const confirmPriceClick = async () => {
    if (!station.price_report_id || priceConfirming) return;
    setPriceConfirming(true);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-client-id": getClientId() },
        body: JSON.stringify({ report_id: station.price_report_id, kind: "price" }),
      });
      if (res.ok) {
        setPriceConfirmed(true);
        onChanged();
      }
    } catch {
      // молча — это второстепенное действие, не мешаем пользователю повторной попыткой
    } finally {
      setPriceConfirming(false);
    }
  };

  const confirm = async (reportId: string) => {
    setConfirmError(null);
    setConfirmingId(reportId);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-client-id": getClientId() },
        body: JSON.stringify({ report_id: reportId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setConfirmError(json.error ?? "Не удалось подтвердить отчёт");
        return;
      }
      await load();
      onChanged();
    } catch {
      setConfirmError("Сеть недоступна — попробуйте позже");
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="station-sheet flex h-full min-h-0 flex-col">
      {!embedded && (
        <>
          <span className="station-sheet__glow sm:hidden" aria-hidden />
          <span className="station-sheet__handle sm:hidden" aria-hidden />
        </>
      )}

      <header
        className="station-sheet__head shrink-0"
        onPointerDown={onHeadPointerDown}
        onPointerMove={onHeadPointerMove}
        onPointerUp={onHeadPointerUp}
        onPointerCancel={onHeadPointerUp}
      >
        <div className="flex items-start gap-3">
          <span
            className="relative shrink-0 rounded-[0.875rem] p-0.5"
            style={{
              background: `linear-gradient(135deg, ${STATUS_HEX[station.status]}88, transparent)`,
            }}
          >
            <BrandBadge brand={station.brand} name={station.name} size={44} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-balance font-display text-base font-bold leading-snug text-white sm:text-lg">
              {displayName(station)}
            </h2>
            {station.address && (
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted sm:text-sm">
                {station.address}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={station.status} compact large />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="ticket-serial" title="Код станции">
              №{ticketSerial}
            </span>
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
                className={`station-sheet__icon-btn ${
                  isFavorite ? "station-sheet__icon-btn--active" : ""
                }`}
              >
                <StarIcon className="h-5 w-5" filled={isFavorite} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть карточку заправки"
                className="station-sheet__icon-btn"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="station-sheet__divider mx-4" />

      <div
        ref={scrollRef}
        className="station-sheet__scroll thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="station-sheet__content space-y-3">
          <div>
            <VerdictBadge verdict={verdict} />
            <div className="report-count">
              <ClockIcon className="h-3.5 w-3.5" />
              {station.reports_count} отчётов · {freshConfirms} подтверждений
            </div>
          </div>

          <div className="hero-metrics">
            <div
              className="hero-metric"
              style={{ "--metric-color": "#38bdf8" } as React.CSSProperties}
            >
              <span className="hero-metric__value">
                {mainPrice ? mainPrice.price.toFixed(2) : "—"}
              </span>
              <span className="hero-metric__label">Цена</span>
              <span className="hero-metric__sub">
                {mainPrice ? `${mainPrice.fuel} ₽/л` : "нет данных"}
              </span>
            </div>
            <div
              className="hero-metric"
              style={
                {
                  "--metric-color":
                    queueEstimate.hasData && queueEstimate.confidence >= 20
                      ? QUEUE_CHANCE_HEX[queueEstimate.chance]
                      : "#6b7280",
                } as React.CSSProperties
              }
            >
              <span className="hero-metric__value">
                {queueEstimate.hasData && queueEstimate.confidence >= 20
                  ? `${queueEstimate.probability}%`
                  : "—"}
              </span>
              <span className="hero-metric__label">Очередь</span>
              <span className="hero-metric__sub">
                {queueEstimate.hasData && queueEstimate.confidence >= 20
                  ? QUEUE_CHANCE_LABEL[queueEstimate.chance]
                  : "нет данных"}
              </span>
            </div>
            <div
              className="hero-metric"
              style={{ "--metric-color": FRESHNESS_HEX[conf.level] } as React.CSSProperties}
            >
              <span className="hero-metric__value">{conf.score}</span>
              <span className="hero-metric__label">Свежесть</span>
              <span className="hero-metric__sub">{FRESHNESS_LABEL[conf.level]}</span>
            </div>
          </div>

          <QuickReportBar
            stationId={station.id}
            onSubmitted={onChanged}
            primaryFuelType={station.fuel_types[0]}
          />

          <section className="station-sheet__card !p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted">
              Топливо и цены
            </h3>
            {priceEntries.length > 0 || fuelTypesWithoutPrice.length > 0 || station.limit_liters ? (
              <ul className="flex flex-col gap-2">
                {priceEntries.map(([fuel, price]) => (
                  <li key={fuel} className="flex items-baseline gap-2">
                    <span className="whitespace-nowrap text-sm font-semibold text-white">
                      {fuel}
                    </span>
                    <span
                      aria-hidden
                      className="min-w-2 flex-1 -translate-y-1 border-b border-dotted border-white/20"
                    />
                    <span className="whitespace-nowrap font-mono text-[0.9375rem] font-bold tabular-nums text-white">
                      {price.toFixed(2)} ₽/л
                    </span>
                  </li>
                ))}
                {fuelTypesWithoutPrice.map((f) => (
                  <li key={f} className="flex items-baseline gap-2">
                    <span className="whitespace-nowrap text-sm font-medium text-ink-muted">
                      {f}
                    </span>
                    <span
                      aria-hidden
                      className="min-w-2 flex-1 -translate-y-1 border-b border-dotted border-white/15"
                    />
                    <span className="whitespace-nowrap font-mono text-[0.8125rem] font-medium text-ink-muted">
                      нет данных
                    </span>
                  </li>
                ))}
                {station.limit_liters ? (
                  <li className="flex items-baseline gap-2">
                    <span className="whitespace-nowrap text-sm font-semibold text-white">
                      Лимит
                    </span>
                    <span
                      aria-hidden
                      className="min-w-2 flex-1 -translate-y-1 border-b border-dotted border-white/20"
                    />
                    <span className="whitespace-nowrap font-mono text-[0.9375rem] font-bold tabular-nums text-white">
                      {station.limit_liters} л/чел
                    </span>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">
                Нет данных о цене — сообщите её в отчёте.
              </p>
            )}
            {station.price_updated_at && priceEntries.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-xs text-ink-muted">
                  Цена на {timeAgo(station.price_updated_at)}
                  {Date.now() - new Date(station.price_updated_at).getTime() >
                    PRICE_FRESH_MS && " (может быть неактуальна)"}
                </p>
                {station.price_report_id && (
                  <button
                    type="button"
                    onClick={() => void confirmPriceClick()}
                    disabled={priceConfirming || priceConfirmed}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-1.5 text-xs font-medium text-brand-accent transition-[background-color,transform] hover:bg-white/5 active:scale-[0.96] disabled:opacity-50"
                  >
                    <ThumbsUpIcon className="h-3.5 w-3.5" />
                    {priceConfirmed
                      ? "Спасибо!"
                      : `Цена верна (${station.price_confirms})`}
                  </button>
                )}
              </div>
            )}
            {priceCompare && priceEntries.length > 0 && (
              <div className="mt-2.5 flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: PRICE_LEVEL_HEX[priceCompare.level],
                    boxShadow: `0 0 8px ${PRICE_LEVEL_HEX[priceCompare.level]}88`,
                  }}
                  aria-hidden
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: PRICE_LEVEL_HEX[priceCompare.level] }}
                >
                  {PRICE_LEVEL_LABEL[priceCompare.level]}
                  {priceCompare.diffPct != null &&
                    priceCompare.level !== "average" &&
                    ` (${priceCompare.diffPct > 0 ? "+" : ""}${priceCompare.diffPct}%)`}
                </span>
              </div>
            )}
          </section>

          <div className="station-actions">
            <div className="station-actions__row">
              <button
                type="button"
                onClick={buildRoute}
                disabled={routeLoading}
                className="station-actions__secondary"
              >
                {routeLoading ? (
                  <>
                    <span className="h-2 w-2 animate-pulse-dot rounded-full bg-brand-accent" />
                    Строим…
                  </>
                ) : (
                  <>
                    <RouteIcon className="h-5 w-5 shrink-0" />
                    {routeInfo ? "Перестроить" : "Маршрут"}
                  </>
                )}
              </button>
              <ShareButton
                variant="station"
                url={shareStationUrl(station.id)}
                title={station.name}
                text={`${station.name} — наличие топлива на карте «${SITE_NAME}»`}
                label="Поделиться"
                copiedLabel="Скопировано"
                className="flex-1"
              />
            </div>

            {routeInfo && (
              <p className="flex items-center justify-center gap-2 text-sm tabular-nums text-white">
                <span className="font-semibold text-brand-accent">
                  {formatRouteDistance(routeInfo.distanceM)}
                </span>
                <span className="text-ink-muted">·</span>
                <span>≈ {formatEta(routeInfo.durationS)}</span>
              </p>
            )}
            {!userLocation && !routeError && (
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
                <CrosshairIcon className="h-3.5 w-3.5" />
                Включите геолокацию для маршрута
              </p>
            )}
            {routeError && (
              <p className="text-center text-xs text-fuel-no">{routeError}</p>
            )}
          </div>

          <RouteButtons station={station} />

          <StatusTimeline reports={reports} />

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted">
              Последние отчёты
            </h3>
            {loading ? (
              <ul className="space-y-2" aria-live="polite" aria-label="Загрузка отчётов">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="station-sheet__card !p-3 station-skeleton">
                    <div className="station-skeleton__line station-skeleton__line--sm" />
                    <div className="station-skeleton__line station-skeleton__line--md" />
                    <div className="station-skeleton__line station-skeleton__line--lg" />
                  </li>
                ))}
              </ul>
            ) : reports.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Пока нет отчётов. Станьте первым!
              </p>
            ) : (
              <ul className="space-y-2">
                {confirmError && (
                  <li className="rounded-xl border border-fuel-no/30 bg-fuel-no/10 px-3 py-2 text-sm text-fuel-no">
                    {confirmError}
                  </li>
                )}
                {freshReports.map((r) => (
                  <li key={r.id} className="station-sheet__card !p-3">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={r.status} />
                      <span className="text-sm text-ink-muted">
                        {timeAgo(r.created_at)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
                      <span>{QUEUE_LABELS[r.queue]}</span>
                      {r.limit_liters && <span>лимит {r.limit_liters} л</span>}
                      {r.fuel_types.length > 0 && (
                        <span>{r.fuel_types.join(", ")}</span>
                      )}
                      {r.canister && <span>только в канистру</span>}
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-base text-white">{r.comment}</p>
                    )}
                    {r.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.photo_url}
                        alt="Фото с заправки"
                        className="mt-2 max-h-40 rounded-xl object-cover outline outline-1 outline-white/10"
                      />
                    )}
                    {now - new Date(r.created_at).getTime() <= FRESH_WINDOW_MS && (
                      <button
                        type="button"
                        onClick={() => void confirm(r.id)}
                        disabled={confirmingId === r.id}
                        className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-accent transition-[background-color,transform] hover:bg-white/5 active:scale-[0.96] disabled:opacity-50"
                      >
                        <ThumbsUpIcon className="h-4 w-4" />
                        {confirmingId === r.id
                          ? "Отправка…"
                          : `Подтвердить (${r.confirms})`}
                      </button>
                    )}
                  </li>
                ))}

                {oldReports.length > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setShowOldReports((v) => !v)}
                      aria-expanded={showOldReports}
                      className="w-full rounded-lg px-2 py-2 text-center text-sm font-medium text-ink-muted transition-colors hover:bg-white/5"
                    >
                      {showOldReports
                        ? "Свернуть старые отчёты"
                        : `Показать ещё ${oldReports.length} старых`}
                    </button>
                  </li>
                )}

                {showOldReports &&
                  oldReports.map((r) => (
                    <li key={r.id} className="station-sheet__card !p-3 opacity-70">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={r.status} />
                        <span className="text-sm text-ink-muted">
                          {timeAgo(r.created_at)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
                        <span>{QUEUE_LABELS[r.queue]}</span>
                        {r.limit_liters && <span>лимит {r.limit_liters} л</span>}
                        {r.fuel_types.length > 0 && (
                          <span>{r.fuel_types.join(", ")}</span>
                        )}
                        {r.canister && <span>только в канистру</span>}
                      </div>
                      {r.comment && (
                        <p className="mt-2 text-base text-white">{r.comment}</p>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className="station-sheet__footer shrink-0">
        <div className="station-sheet__divider mb-2.5" aria-hidden />
        <button
          type="button"
          onClick={onReport}
          className="station-actions__primary"
        >
          <PlusIcon className="h-5 w-5" />
          Сообщить ситуацию
        </button>
      </div>
    </div>
  );
}
