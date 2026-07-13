"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getClientId } from "@/lib/clientId";
import { brandMatches } from "@/lib/brands";
import { findCityBySlug, CITY_PRESETS } from "@/lib/cities";
import { maxBotTrackUrl, telegramChannelUrl } from "@/lib/site";
import {
  bboxAroundPoint,
  bboxNearlyEqual,
  bboxCacheKey,
  bboxFromLineString,
  clampBBoxSpan,
  expandBBox,
} from "@/lib/bbox";
import { mergeStationLists } from "@/lib/stationMap";
import { readUserLocation, saveUserLocation } from "@/lib/userLocation";
import { dedupeStationsByLocation } from "@/lib/stationDedup";
import { GEO_FAIL_HINT, getCurrentPositionWithCallbacks } from "@/lib/geolocation";
import { initVkBridge, isVkEnvironment } from "@/lib/vkBridge";
import { fetchOsrmRoute } from "@/lib/route";
import { stationsAlongRoute } from "@/lib/routeCorridor";
import {
  cacheFavoriteStations,
  isOffline,
  readFavoriteStationsCache,
} from "@/lib/favoritesOffline";
import { checkFavoriteStatusChanges } from "@/lib/favoriteAlerts";
import type { BBox, FuelPrices, FuelStatus, StationStatus } from "@/lib/types";
import { type FilterState } from "./Filters";
import MapDock from "./MapDock";
import { type ListMode } from "./StationList";
import Legend from "./Legend";
import SiteHeader from "./SiteHeader";
import { MapLoadFallback } from "./MapSlowLoadHint";
import InstallChip from "./InstallChip";
import LegalBar from "./LegalBar";
import {
  getFavoriteIds,
  isFavorite as checkFavorite,
  subscribeFavorites,
  toggleFavorite,
} from "@/lib/favorites";
import {
  ListIcon,
  MapIcon,
  StarIcon,
} from "./Icons";
import type { MapTheme } from "./MapLibreMapView";
import MobileNearbySheet, {
  type NearbySheetSnap,
} from "./MobileNearbySheet";

/** Карта всегда светлая. */
const MAP_THEME: MapTheme = "light";

const MapView = dynamic(() => import("./MapLibreMapView"), {
  ssr: false,
  loading: () => <MapLoadFallback />,
});

const ListView = dynamic(() => import("./ListView"), {
  loading: () => (
    <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-ink-muted">
      Загрузка списка…
    </div>
  ),
});

const StationPanel = dynamic(() => import("./StationPanel"));

const ReportForm = dynamic(() => import("./ReportForm"), { ssr: false });

const Onboarding = dynamic(() => import("./Onboarding"), { ssr: false });

const AddStationSheet = dynamic(() => import("./AddStationSheet"), { ssr: false });

// По умолчанию открываем Москву — там основная база данных по заправкам.
const DEFAULT_CENTER: [number, number] = [55.7558, 37.6173];
const DEFAULT_ZOOM = 11;
const DEFAULT_BBOX: BBox = [55.55, 37.35, 55.95, 37.95];
const LIST_RADIUS_KM = 15;
// Кэш станций по bbox (stationCacheRef) иначе растёт без границ за долгую
// сессию панорамирования — держим только недавно посещённые области.
// Запись читается ниже только пока не старше 60с (см. cacheFresh) — TTL
// чуть больше этого порога, дольше держать её бессмысленно.
const STATION_CACHE_MAX_AGE_MS = 90_000;
const STATION_CACHE_MAX_ENTRIES = 200;

type ViewMode = "map" | "list";

export default function AppShell({ demoMode }: { demoMode: boolean }) {
  const [stations, setStations] = useState<StationStatus[]>([]);
  const [selected, setSelected] = useState<StationStatus | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [listMode, setListMode] = useState<ListMode>("near");
  const [mobileListMode, setMobileListMode] = useState<ListMode>("near");
  const [mobileSheetSnap, setMobileSheetSnap] = useState<NearbySheetSnap>("peek");
  const [filters, setFilters] = useState<FilterState>({
    fuelType: "all",
    brand: "all",
    onlyAvailable: false,
    status: "all",
    sortBy: "distance",
    cheapestOnly: false,
  });
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [panelRefresh, setPanelRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  // Геометрия маршрута OSRM (рисуется на карте), и раскрытие фильтров на мобильном.
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(
    null
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteStations, setFavoriteStations] = useState<StationStatus[]>([]);
  const [favBump, setFavBump] = useState(0);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mapDataReady, setMapDataReady] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeStations, setRouteStations] = useState<StationStatus[]>([]);
  const [addStationPin, setAddStationPin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [offlineBanner, setOfflineBanner] = useState(false);

  const bboxRef = useRef<BBox | null>(null);
  const pendingStationId = useRef<string | null>(null);
  const emergencyPrevFilters = useRef<FilterState | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<{ bbox: BBox; at: number } | null>(null);
  const showLoadingRef = useRef(true);
  const geoInitRef = useRef(false);
  const lastSaveRef = useRef(0);
  // Троттлинг watchPosition-колбэка (см. startWatch ниже) — телефонный GPS
  // с enableHighAccuracy присылает новый фикс примерно раз в секунду, каждый
  // из них дёргал бы setUserLocation и перерисовку синего маркера/части
  // AppShell даже при дрожании координат на месте в пределах пары метров.
  // На десктопе это не проявлялось: там геолокация обычно даёт один грубый
  // фикс через Wi-Fi, а не непрерывный поток от GPS-чипа.
  const lastAppliedPosRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const stationCacheRef = useRef<
    Map<string, { at: number; stations: StationStatus[] }>
  >(new Map());

  // Избранные заправки — id в localStorage, статусы подтягиваем с API.
  useEffect(() => {
    setFavoriteIds(getFavoriteIds());
    return subscribeFavorites(setFavoriteIds);
  }, []);

  useEffect(() => {
    if (favoriteIds.length === 0) {
      setFavoriteStations([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/stations?ids=${encodeURIComponent(favoriteIds.join(","))}`, {
      headers: { "x-client-id": getClientId() },
    })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setFavoriteStations(j.stations ?? []);
      })
      .catch(() => {
        if (!cancelled) setFavoriteStations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [favoriteIds, panelRefresh, favBump]);

  useEffect(() => {
    if (favoriteStations.length > 0) {
      cacheFavoriteStations(favoriteStations);
      checkFavoriteStatusChanges(favoriteStations);
    }
  }, [favoriteStations]);

  useEffect(() => {
    const applyOfflineCache = () => {
      if (!isOffline() || favoriteIds.length === 0) return;
      const cached = readFavoriteStationsCache();
      if (cached?.stations.length) {
        setFavoriteStations(cached.stations);
        setOfflineBanner(true);
      }
    };
    applyOfflineCache();
    window.addEventListener("offline", applyOfflineCache);
    const onOnline = () => setOfflineBanner(false);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", applyOfflineCache);
      window.removeEventListener("online", onOnline);
    };
  }, [favoriteIds.length]);

  useEffect(() => {
    if (!loadError) return;
    const timer = window.setTimeout(() => setLoadError(null), 9000);
    return () => window.clearTimeout(timer);
  }, [loadError]);

  // Живое и точное отслеживание местоположения устройства.
  // В VK webview watchPosition не работает — используем разовое получение.
  const startWatch = useCallback(() => {
    if (isVkEnvironment()) return; // VK webview не поддерживает watchPosition
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (watchIdRef.current != null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Пропускаем ре-рендер, если это дрожание GPS на месте: телефон
        // присылает новый фикс ~раз в секунду, и без этого порога каждый
        // такой фикс двигал бы синий маркер и перерисовывал часть AppShell.
        const prev = lastAppliedPosRef.current;
        const now = Date.now();
        if (prev) {
          const dLat = lat - prev.lat;
          const dLng = (lng - prev.lng) * Math.cos((lat * Math.PI) / 180);
          const movedMeters = Math.sqrt(dLat * dLat + dLng * dLng) * 111_320;
          if (movedMeters < 8 && now - prev.at < 4000) return;
        }
        lastAppliedPosRef.current = { lat, lng, at: now };
        setUserLocation([lat, lng]);
        if (now - lastSaveRef.current > 30000) {
          saveUserLocation(lat, lng);
          lastSaveRef.current = now;
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const citySlug = params.get("city");
    const stationId = params.get("station");
    const brand = params.get("brand");
    if (citySlug) {
      const c = findCityBySlug(citySlug);
      if (c) setFlyTarget([c.lat, c.lng]);
    }
    if (stationId) pendingStationId.current = stationId;
    // Переход со страниц сетей (/?brand=…) сразу применяет фильтр по сети.
    if (brand) setFilters((f) => ({ ...f, brand }));
  }, []);

  // Инициализация VK Bridge (только внутри VK Mini App, безопасный no-op вне ВК).
  useEffect(() => {
    initVkBridge();
  }, []);

  useEffect(() => {
    const id = pendingStationId.current;
    if (!id || stations.length === 0) return;
    const st = stations.find((s) => s.id === id);
    if (st) {
      setSelected(st);
      setFlyTarget([st.lat, st.lng]);
      pendingStationId.current = null;
    }
  }, [stations]);

  const fetchStations = useCallback(async (bbox: BBox) => {
    const viewBBox = clampBBoxSpan(bbox);
    const queryBBox = expandBBox(viewBBox, 0.28);
    const prev = bboxRef.current;
    const last = lastFetchRef.current;
    if (
      prev &&
      bboxNearlyEqual(prev, viewBBox) &&
      last &&
      bboxNearlyEqual(last.bbox, viewBBox) &&
      Date.now() - last.at < 4000
    ) {
      return;
    }

    bboxRef.current = viewBBox;
    // Отменяем предыдущий незавершённый запрос сразу — иначе, если этот вызов
    // обслужится из кэша и вернётся раньше (ниже), старый запрос для уже
    // покинутой области долетит позже и замусорит текущий стейт станций.
    fetchAbortRef.current?.abort();

    const cacheKey = bboxCacheKey(queryBBox);
    const cached = stationCacheRef.current.get(cacheKey);
    const cacheFresh = cached && Date.now() - cached.at < 60_000;
    const cacheWarm = cached && Date.now() - cached.at < 15_000;

    if (cacheFresh) {
      const keepBBox = expandBBox(viewBBox, 0.22);
      setStations((prevStations) =>
        mergeStationLists(prevStations, cached.stations, keepBBox)
      );
      setMapDataReady(true);
      lastFetchRef.current = { bbox: viewBBox, at: Date.now() };
      if (cacheWarm) return;
    }

    const ac = new AbortController();
    fetchAbortRef.current = ac;

    const showSpinner = showLoadingRef.current && !cacheFresh;
    if (showSpinner) {
      setLoading(true);
      setLoadError(null);
    }

    try {
      const [s, w, n, e] = queryBBox;
      const res = await fetch(`/api/stations?bbox=${s},${w},${n},${e}`, {
        signal: ac.signal,
        headers: { "x-client-id": getClientId() },
      });
      let json: { stations?: StationStatus[]; error?: string };
      try {
        json = await res.json();
      } catch {
        // Прокси/nginx перед приложением иногда отдаёт свою HTML-страницу
        // ошибки (502/504) вместо JSON от Next.js — res.json() в этом случае
        // кидает SyntaxError с сырым текстом парсера ("Unexpected token '<'"),
        // который не стоит показывать пользователю как есть.
        throw new Error("Не удалось загрузить заправки");
      }
      if (!res.ok) {
        const msg = String(json.error ?? "");
        // При слишком большой области не пугаем пользователя — оставляем текущие метки.
        if (res.status === 400 && /bbox|област/i.test(msg)) return;
        throw new Error(msg || `Ошибка ${res.status}`);
      }
      const incoming = (json.stations ?? []) as StationStatus[];
      const keepBBox = expandBBox(viewBBox, 0.22);
      const cache = stationCacheRef.current;
      const now = Date.now();
      // Кэш растёт с каждой новой посещённой областью и никогда не очищался
      // сам по себе — за долгую сессию панорамирования по карте это давало
      // неограниченный рост памяти вкладки. Чистим устаревшие записи и
      // подрезаем по размеру (FIFO по порядку вставки) перед каждой записью.
      for (const [key, entry] of cache) {
        if (now - entry.at > STATION_CACHE_MAX_AGE_MS) cache.delete(key);
      }
      cache.delete(cacheKey);
      while (cache.size >= STATION_CACHE_MAX_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey === undefined) break;
        cache.delete(oldestKey);
      }
      cache.set(cacheKey, { at: now, stations: incoming });
      setStations((prevStations) =>
        mergeStationLists(prevStations, incoming, keepBBox)
      );
      setLoadError(null);
      setMapDataReady(true);
      lastFetchRef.current = { bbox: viewBBox, at: Date.now() };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Сетевые сбои (обрыв соединения, таймаут) — fetch() кидает TypeError
      // ("Failed to fetch" и т.п.), это не ошибка данных: не пугаем пользователя
      // баннером поверх карты, оставляем то, что уже загружено.
      if (err instanceof TypeError) return;
      setLoadError(
        err instanceof Error ? err.message : "Не удалось загрузить заправки"
      );
    } finally {
      if (!ac.signal.aborted && showSpinner) {
        setLoading(false);
        showLoadingRef.current = false;
      }
    }
  }, []);

  const refresh = useCallback(() => {
    if (bboxRef.current) fetchStations(bboxRef.current);
    setPanelRefresh((k) => k + 1);
  }, [fetchStations]);

  const applyUserPosition = useCallback(
    (lat: number, lng: number, persist: boolean) => {
      if (persist) saveUserLocation(lat, lng);
      setUserLocation([lat, lng]);
      setMapCenter([lat, lng]);
      setFlyTarget([lat, lng]);
      fetchStations(bboxAroundPoint(lat, lng, LIST_RADIUS_KM));
      startWatch();
    },
    [fetchStations, startWatch]
  );

  const fetchNearUser = useCallback(() => {
    const ref = userLocation ?? mapCenter;
    fetchStations(bboxAroundPoint(ref[0], ref[1], LIST_RADIUS_KM));
  }, [userLocation, mapCenter, fetchStations]);

  // Старт: геолокация или сохранённая позиция; Москва — только fallback.
  useEffect(() => {
    if (geoInitRef.current) return;
    geoInitRef.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get("city") || params.get("station")) {
      fetchStations(DEFAULT_BBOX);
      return () => fetchAbortRef.current?.abort();
    }

    const saved = readUserLocation();
    if (saved) {
      const [lat, lng] = saved;
      setUserLocation(saved);
      setMapCenter(saved);
      setFlyTarget(saved);
      fetchStations(bboxAroundPoint(lat, lng, LIST_RADIUS_KM));
      startWatch();
    }

    // Внутри VK используем VK Bridge геолокацию (работает в webview),
    // иначе — браузерный API.
    getCurrentPositionWithCallbacks(
      (lat, lng) => {
        applyUserPosition(lat, lng, true);
      },
      () => {
        if (!saved) fetchStations(DEFAULT_BBOX);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );

    return () => fetchAbortRef.current?.abort();
  }, [applyUserPosition, fetchStations, startWatch]);

  useEffect(() => {
    if (viewMode === "list") fetchNearUser();
  }, [viewMode, fetchNearUser]);

  useEffect(() => {
    if (mobileSheetSnap === "expanded") fetchNearUser();
  }, [mobileSheetSnap, fetchNearUser]);

  // Авто-обновление: периодически перечитываем текущий bbox, пока карта открыта.
  // Не теряем выбор и не двигаем карту; экономим запросы при скрытой вкладке.
  // Раньше это было подстраховкой на случай пропущенного realtime-события
  // (Supabase Realtime канал "reports-stream" с дебаунсом 4с) — после перехода
  // на self-hosted Postgres без REST/Realtime-слоя это единственный механизм
  // обновления, поэтому интервал сокращён с 180с до 20с.
  useEffect(() => {
    const POLL_MS = 20000;
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible")
        return;
      if (bboxRef.current) fetchStations(bboxRef.current);
      setPanelRefresh((k) => k + 1);
    };
    const start = () => {
      if (!timer) timer = setInterval(tick, POLL_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tick();
        start();
      } else {
        stop();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchStations]);

  const filterStations = useCallback(
    (list: StationStatus[], opts?: { ignoreStatus?: boolean }) =>
      dedupeStationsByLocation(
        list.filter((s) => {
          if (!brandMatches(s.brand, s.name, filters.brand)) return false;
          if (
            filters.onlyAvailable &&
            !(s.status === "yes" || s.status === "low")
          ) {
            return false;
          }
          if (
            !opts?.ignoreStatus &&
            filters.status !== "all" &&
            s.status !== filters.status
          ) {
            return false;
          }
          if (filters.fuelType !== "all") {
            if (s.status === "no") return false;
            if (
              s.fuel_types.length > 0 &&
              !s.fuel_types.includes(filters.fuelType)
            ) {
              return false;
            }
          }
          return true;
        })
      ),
    [filters]
  );

  const visible = useMemo(
    () => filterStations(stations),
    [stations, filterStations]
  );

  const favoriteVisible = useMemo(
    () => filterStations(favoriteStations),
    [favoriteStations, filterStations]
  );

  const routeVisible = useMemo(
    () => filterStations(routeStations),
    [routeStations, filterStations]
  );

  const listStations =
    routeGeometry && routeStations.length > 0 ? routeVisible : visible;

  const listSource = listMode === "favorites" ? favoriteVisible : visible;

  const activeFilterCount =
    (filters.fuelType !== "all" ? 1 : 0) +
    (filters.brand !== "all" ? 1 : 0) +
    (filters.onlyAvailable ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0);

  const statusCounts = useMemo(() => {
    const c: Record<FuelStatus, number> = {
      yes: 0,
      low: 0,
      no: 0,
      unknown: 0,
    };
    for (const s of filterStations(stations, { ignoreStatus: true })) c[s.status]++;
    return c;
  }, [stations, filterStations]);

  // Цены станций текущей области карты — референс для бейджа "дешевле/дороже
  // рядом" в карточке заправки (см. lib/priceLevel.ts).
  const priceReference: FuelPrices[] = useMemo(
    () => stations.map((s) => s.prices),
    [stations]
  );

  // Доля станций без отметок в текущей области — признак малоактивного
  // региона (баннер "станьте первым", см. A6 ниже).
  const unknownShare = useMemo(() => {
    if (stations.length === 0) return 0;
    return stations.filter((s) => s.status === "unknown").length / stations.length;
  }, [stations]);

  const flyTo = (lat: number, lng: number) => {
    setFlyTarget([lat, lng]);
    setMapCenter([lat, lng]);
    setViewMode("map");
    setMobileSheetSnap("peek");
  };

  const locate = () => {
    setGeoError(null);
    setLocating(true);
    // Внутри VK используем VK Bridge геолокацию (работает в webview),
    // иначе — браузерный API.
    getCurrentPositionWithCallbacks(
      (lat, lng) => {
        const loc: [number, number] = [lat, lng];
        setUserLocation(loc);
        setFlyTarget(loc);
        saveUserLocation(loc[0], loc[1]);
        setLocating(false);
        setGeoError(null);
        startWatch();
      },
      () => {
        setLocating(false);
        setGeoError(GEO_FAIL_HINT);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const selectStation = (s: StationStatus) => {
    setSelected(s);
    setShowForm(false);
    setViewMode("map");
    setMobileSheetSnap("peek");
    setFlyTarget([s.lat, s.lng]);
  };

  const closeSelected = () => {
    setSelected(null);
  };

  const clearRoute = () => {
    setRouteGeometry(null);
    setRouteStations([]);
    setRouteOpen(false);
  };

  const handleToggleFavorite = (stationId: string) => {
    toggleFavorite(stationId);
    setFavBump((n) => n + 1);
  };

  const activateEmergencyFuel = () => {
    if (emergencyActive) {
      setEmergencyActive(false);
      if (emergencyPrevFilters.current) {
        setFilters(emergencyPrevFilters.current);
        emergencyPrevFilters.current = null;
      }
      return;
    }
    emergencyPrevFilters.current = filters;
    setFilters({
      fuelType: "all",
      brand: "all",
      onlyAvailable: true,
      status: "all",
      sortBy: "distance",
      cheapestOnly: false,
    });
    setEmergencyActive(true);
    setMobileListMode("fuel");
    setMobileSheetSnap("peek");
    setRouteOpen(false);
    clearRoute();
    if (!userLocation) locate();
    else fetchNearUser();
  };

  const toggleRoutePlanner = () => {
    if (routeGeometry) {
      clearRoute();
      return;
    }
    setRouteOpen((open) => !open);
    setEmergencyActive(false);
  };

  const planRoute = useCallback(
    async (destLat: number, destLng: number) => {
      const from = userLocation ?? mapCenter;
      setRouteLoading(true);
      setRouteStations([]);
      try {
        const result = await fetchOsrmRoute(from, [destLat, destLng]);
        if (!result) {
          setLoadError("Не удалось построить маршрут — попробуйте позже");
          return;
        }
        setRouteGeometry(result.geometry);
        setRouteOpen(false);
        const routeBBox = bboxFromLineString(result.geometry);
        const queryBBox = expandBBox(clampBBoxSpan(routeBBox), 0.28);
        const [s, w, n, e] = queryBBox;
        const res = await fetch(`/api/stations?bbox=${s},${w},${n},${e}`, {
          headers: { "x-client-id": getClientId() },
        });
        const json = (await res.json()) as { stations?: StationStatus[] };
        const loaded = json.stations ?? [];
        setStations((prev) => mergeStationLists(prev, loaded, routeBBox));
        const along = stationsAlongRoute(loaded, result.geometry);
        setRouteStations(along);
        setFlyTarget([destLat, destLng]);
        setMobileListMode("near");
        setMobileSheetSnap("expanded");
      } catch {
        setLoadError("Маршрут временно недоступен");
      } finally {
        setRouteLoading(false);
      }
    },
    [userLocation, mapCenter]
  );

  const handleLongPress = (lat: number, lng: number) => {
    setAddStationPin({ lat, lng });
  };

  const handleStationCreated = (stationId: string) => {
    setAddStationPin(null);
    pendingStationId.current = stationId;
    refresh();
  };

  const openMobileFavorites = () => {
    setMobileListMode("favorites");
    setMobileSheetSnap("expanded");
    fetchNearUser();
  };

  const viewSwitch = (mode: ViewMode, Icon: typeof MapIcon, label: string) => (
    <button
      type="button"
      aria-pressed={viewMode === mode}
      aria-label={label}
      onClick={() => setViewMode(mode)}
      className={`view-switch__btn ${viewMode === mode ? "view-switch__btn--active" : ""}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex h-full flex-col bg-surface-map">
      <a
        href="#o-karte"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:rounded-lg focus:bg-brand-fuel focus:px-3 focus:py-2 focus:text-ink-dark"
      >
        О карте и городах
      </a>
      <a
        href="#map-region"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:rounded-lg focus:bg-brand-fuel focus:px-3 focus:py-2 focus:text-ink-dark"
      >
        Перейти к карте
      </a>

      <SiteHeader
        tools={
          <>
            <div
              className="view-switch hidden sm:flex"
              role="group"
              aria-label="Режим просмотра"
            >
              {viewSwitch("map", MapIcon, "Карта")}
              {viewSwitch("list", ListIcon, "Список")}
            </div>
            <button
              type="button"
              onClick={openMobileFavorites}
              aria-label={
                favoriteIds.length > 0
                  ? `Избранные заправки: ${favoriteIds.length}`
                  : "Избранные заправки"
              }
              className="header-icon-btn relative sm:hidden"
            >
              <StarIcon
                className="h-[18px] w-[18px]"
                filled={favoriteIds.length > 0}
              />
              {favoriteIds.length > 0 && (
                <span className="header-icon-btn__badge" aria-hidden>
                  {favoriteIds.length > 9 ? "9+" : favoriteIds.length}
                </span>
              )}
            </button>
            <div className="hidden sm:block">
              <InstallChip />
            </div>
          </>
        }
      />

      {demoMode && (
        <div className="shrink-0 bg-brand-fuel/10 px-4 py-1.5 text-center text-sm text-brand-fuel">
          Демо-режим — на сервере не задан DATABASE_URL (Postgres на этом же VPS).
        </div>
      )}

      {loadError && (
        <div
          className="shrink-0 bg-brand-fuel/10 px-4 py-2 text-center text-sm text-ink"
          role="status"
        >
          <span>
            {loadError}. Попробуйте изменить масштаб карты или обновить страницу.
          </span>
          <button
            type="button"
            onClick={() => setLoadError(null)}
            className="ml-2 underline decoration-brand-fuel/50 underline-offset-2 hover:text-white"
          >
            Закрыть
          </button>
        </div>
      )}

      {geoError && (
        <div
          className="shrink-0 bg-fuel-no/10 px-4 py-2 text-center text-sm text-fuel-no"
          role="status"
        >
          <span>{geoError}</span>
          <button
            type="button"
            onClick={() => setGeoError(null)}
            className="ml-2 underline decoration-fuel-no/50 underline-offset-2 hover:text-white"
          >
            Закрыть
          </button>
        </div>
      )}

      {offlineBanner && (
        <div
          className="shrink-0 bg-brand-accent/10 px-4 py-2 text-center text-sm text-brand-accent"
          role="status"
        >
          Офлайн — показаны сохранённые статусы избранных заправок
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 sm:pb-0">
        <main
          id="map-region"
          className={`relative min-h-0 min-w-0 flex-1 ${
            viewMode === "list" ? "hidden sm:block" : ""
          }`}
        >
          <MapView
            stations={visible}
            onBoundsChange={fetchStations}
            onSelect={selectStation}
            onCenterChange={setMapCenter}
            onLongPress={handleLongPress}
            userLocation={userLocation}
            flyTarget={flyTarget}
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            selectedId={selected?.id ?? null}
            theme={MAP_THEME}
            route={routeGeometry}
            onLocate={locate}
            locating={locating}
            priceFuelType={filters.fuelType !== "all" ? filters.fuelType : null}
          />

          <MapDock
            onFly={flyTo}
            filters={filters}
            onFiltersChange={setFilters}
            filtersOpen={filtersOpen}
            onFiltersOpenChange={setFiltersOpen}
            collapsed={dockCollapsed}
            onCollapsedChange={setDockCollapsed}
            activeFilterCount={activeFilterCount}
            statusCounts={statusCounts}
            total={visible.length}
            loading={loading}
            emergencyActive={emergencyActive}
            onEmergencyFuel={activateEmergencyFuel}
            routeOpen={routeOpen}
            routeActive={Boolean(routeGeometry)}
            onToggleRoute={toggleRoutePlanner}
            onPlanRoute={planRoute}
            routeLoading={routeLoading}
            routeStationCount={routeStations.length}
          />

          {/* Пустое состояние — только после первой загрузки данных */}
          {mapDataReady && !loading && visible.length === 0 && !selected && (
            <div className="map-empty-state pointer-events-none absolute inset-x-0 z-[450] flex justify-center px-4">
              <div className="map-empty-state__card glass-dock pointer-events-auto text-center">
                <p className="text-base font-semibold text-white">
                  В этом месте пока нет свежих отметок
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  Уменьшите масштаб или сдвиньте карту — рядом могут быть
                  заправки с отчётами пользователей.
                </p>
              </div>
            </div>
          )}

          {/* Малоактивный регион — большинство станций без отметок вообще */}
          {mapDataReady &&
            !loading &&
            visible.length > 0 &&
            unknownShare > 0.8 &&
            !selected && (
              <div className="map-empty-state pointer-events-none absolute inset-x-0 z-[450] flex justify-center px-4">
                <div className="map-empty-state__card glass-dock pointer-events-auto text-center">
                  <p className="text-base font-semibold text-white">
                    В этом районе мало отметок
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                    Станьте первым или откройте город с активностью
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {["moskva", "krasnodar"].map((slug) => {
                      const city = CITY_PRESETS.find((c) => c.slug === slug);
                      if (!city) return null;
                      return (
                        <button
                          key={slug}
                          type="button"
                          onClick={() => flyTo(city.lat, city.lng)}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                        >
                          {city.name}
                        </button>
                      );
                    })}
                    <a
                      href={telegramChannelUrl("empty_region")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-brand-fuel/40 bg-brand-fuel/10 px-3 py-1.5 text-sm font-medium text-brand-fuel transition-colors hover:bg-brand-fuel/20"
                    >
                      Telegram
                    </a>
                    <a
                      href={maxBotTrackUrl("empty_region")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                      MAX
                    </a>
                  </div>
                </div>
              </div>
            )}

          <Legend />
          <LegalBar />
        </main>

        {viewMode === "list" && (
          <div className="hidden min-h-0 min-w-0 flex-1 sm:flex sm:w-[30rem] sm:max-w-[30rem] sm:flex-none lg:w-[34rem] lg:max-w-[34rem]">
            <ListView
              stations={listSource}
              userLocation={userLocation}
              mapCenter={mapCenter}
              listMode={listMode}
              filters={filters}
              onFiltersChange={setFilters}
              onListModeChange={setListMode}
              onFly={flyTo}
              onSelect={selectStation}
              favoriteCount={favoriteIds.length}
              emergencyActive={emergencyActive}
            />
          </div>
        )}

        {selected && (
          <aside className="station-sheet-aside overlay-sheet-up">
            <StationPanel
              station={selected}
              onClose={closeSelected}
              onReport={() => setShowForm(true)}
              refreshKey={panelRefresh}
              onChanged={refresh}
              userLocation={userLocation}
              onRouteGeometry={setRouteGeometry}
              onRequestLocation={locate}
              isFavorite={checkFavorite(selected.id)}
              onToggleFavorite={() => handleToggleFavorite(selected.id)}
              priceReference={priceReference}
            />
          </aside>
        )}
      </div>

      {showForm && selected && (
        <ReportForm
          station={selected}
          onClose={() => setShowForm(false)}
          onSubmitted={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      <MobileNearbySheet
        stations={listStations}
        favoriteStations={favoriteVisible}
        userLocation={userLocation}
        mapCenter={mapCenter}
        listMode={mobileListMode}
        onListModeChange={setMobileListMode}
        snap={mobileSheetSnap}
        onSnapChange={(next) => {
          // Пока открыта карточка станции, лист «Рядом» виден только как
          // узкая полоса снизу — раскрыть его поверх карточки нельзя (он
          // всё равно окажется скрыт за ней по z-index).
          if (selected && next === "expanded") return;
          setMobileSheetSnap(next);
        }}
        onSelect={selectStation}
        favoriteCount={favoriteIds.length}
        hidden={showForm}
        statusCounts={statusCounts}
        routeHint={
          routeGeometry && routeStations.length > 0
            ? `${routeStations.length} АЗС по маршруту`
            : null
        }
        sortBy={filters.sortBy}
        onSortByChange={(sortBy) => setFilters({ ...filters, sortBy })}
        cheapestOnly={filters.cheapestOnly}
        fuelType={filters.fuelType}
        emergencyActive={emergencyActive}
      />

      {addStationPin && (
        <AddStationSheet
          lat={addStationPin.lat}
          lng={addStationPin.lng}
          onClose={() => setAddStationPin(null)}
          onCreated={handleStationCreated}
        />
      )}

      <Onboarding />
    </div>
  );
}
