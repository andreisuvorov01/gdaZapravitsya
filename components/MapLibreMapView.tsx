"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import { Protocol } from "pmtiles";
import themeLayers from "protomaps-themes-base";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  bestPrice,
  STATUS_HEX,
  type BBox,
  type FuelStatus,
  type FuelType,
  type QueueLevel,
  type StationStatus,
} from "@/lib/types";
import { clampBBoxSpan } from "@/lib/bbox";
import { buildClusterMarkerEl, type ClusterCounts } from "@/lib/clusterIcon";
import { STATUS_GLYPH } from "./StatusBadge";
import { CrosshairIcon, MinusIcon, PlusIcon } from "./Icons";
import MapSlowLoadHint from "./MapSlowLoadHint";

export type MapTheme = "light" | "dark";

interface MapViewProps {
  stations: StationStatus[];
  onBoundsChange: (bbox: BBox) => void;
  onSelect: (station: StationStatus) => void;
  onCenterChange?: (center: [number, number]) => void;
  userLocation: [number, number] | null;
  flyTarget: [number, number] | null;
  center: [number, number];
  zoom: number;
  selectedId?: string | null;
  /** Станция, подсвеченная наведением/прокруткой в списке (см. StationList.tsx) —
      подсвечивает маркер без перецентровки карты, в отличие от selectedId. */
  hoveredId?: string | null;
  theme?: MapTheme;
  route?: GeoJSON.LineString | null;
  /** Компактный режим (вкладка «Ситуация»): без кнопок zoom. */
  compact?: boolean;
  /** Долгое нажатие на карту — добавить заправку. */
  onLongPress?: (lat: number, lng: number) => void;
  /** Центрировать карту на пользователе (кнопка «Найти себя»). */
  onLocate?: () => void;
  locating?: boolean;
  /** Топливо, выбранное в фильтре — цена этого вида показывается на маркере при приближении. */
  priceFuelType?: FuelType | null;
}

// Базовая карта — OpenFreeMap (бесплатно, без ключа, без лимитов, CORS).
const OPENFREEMAP_LIGHT =
  process.env.NEXT_PUBLIC_MAP_STYLE || "https://tiles.openfreemap.org/styles/liberty";
const PMTILES_URL = process.env.NEXT_PUBLIC_PMTILES_URL || "";
// ZXY-эндпоинт `pmtiles serve` (см. docs/TILES.md) — обычный vector-источник,
// без протокола pmtiles:// и без отдельного хоста/CORS, если он проксируется
// с того же домена, что и сам сайт. Имеет приоритет над PMTILES_URL.
const TILES_URL = process.env.NEXT_PUBLIC_TILES_URL || "";
const TILES_MAXZOOM = Number(process.env.NEXT_PUBLIC_TILES_MAXZOOM) || 15;
// Наш self-host архив вырезан строго по границе РФ на зумах z9+ (детальные
// дороги/здания есть только внутри России — остальной мир там не нужен и
// раздувал бы файл). Отдельный "мировой" источник — грубый (z0-8), но
// покрывает всю Землю: за пределами РФ MapLibre сам растянет (overzoom)
// последний доступный тайл этого источника вместо серого фона. Опционален —
// без него всё работает как раньше, просто без карты за границей РФ.
const WORLD_TILES_URL = process.env.NEXT_PUBLIC_WORLD_TILES_URL || "";
const WORLD_TILES_MAXZOOM = 8;
// Self-host копия шрифтов/спрайта (npm run map-assets, см. docs/TILES.md) —
// раньше эти два ресурса тянулись напрямую с protomaps.github.io даже в
// self-host режиме карты, и зависший без VPN GitHub Pages ломал self-host
// тайлы заодно с ним (см. инцидент 2026-07-11: MapLibre "load"/"idle" ждут
// загрузку спрайта, и без VPN так и не наступали, вызывая фолбэк на
// OpenFreeMap — тоже недоступный без VPN).
const PM_GLYPHS = "/map-assets/fonts/{fontstack}/{range}.pbf";
const PM_SPRITE_LIGHT = "/map-assets/sprites/v4/light";

// Максимум HTML-маркеров с логотипами — остальное кликабельно через слой
// station-points, но без своей иконки. При отдалении несгруппированные (не
// попавшие в кластер) одиночные станции по определению разрежены — их
// вполне может набраться больше сотни на широкий вьюпорт, и старый лимит 96
// (рассчитанный на плотный вид крупным планом) обрезал их по расстоянию от
// центра экрана, поэтому маркеры пропадали ближе к краям.
const MAX_HTML_MARKERS = 300;
/** Сколько маркеров создаём за один кадр. */
const MARKER_BATCH_SIZE = 20;
/** Ниже этого zoom — только кластеры, без HTML-маркеров (см. clusterMaxZoom). */
const CLUSTER_MAX_ZOOM = 13;
/** От этого zoom на маркере показываются доп. детали (очередь, цена) — см. .azs-marker__queue/__price в globals.css. */
const MARKER_DETAIL_ZOOM = 15;
/**
 * Пока видимая область не крупнее города с ближним пригородом (~0.75° по
 * большей стороне вьюпорта — широте или долготе), рисуем маркеры и
 * донат-кластеры как обычно. Стоит отдалиться сильнее — точек и кластеров
 * на экране становится на порядок больше, и карта заметно тормозит, поэтому
 * отрисовку точек полностью выключаем и показываем вместо них плашку.
 */
const REGION_DISABLE_SPAN_DEG = 0.75;

let pmtilesRegistered = false;
function ensurePmtiles() {
  if (pmtilesRegistered || typeof window === "undefined") return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesRegistered = true;
}

const PROTOMAPS_ATTRIBUTION =
  '<a href="https://protomaps.com" target="_blank" rel="noreferrer">Protomaps</a> © <a href="https://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>';

// Runtime-фолбэк self-host → OpenFreeMap: если свой pmtiles serve/nginx
// сломан (см. инцидент 2026-07-10 — файлы не докачались, nginx не
// проксировал /tiles/), карта не должна просто оставаться пустой до
// следующего деплоя. После срабатывания фолбэка self-host не трогаем
// SELF_HOST_RETRY_COOLDOWN_MS — чтобы не долбить лежащий сервер на каждой
// перезагрузке страницы, а потом сама попробует его снова.
const SELF_HOST_FALLBACK_KEY = "benzin:tiles-fallback-until";
const SELF_HOST_RETRY_COOLDOWN_MS = 5 * 60 * 1000;
const SELF_HOST_ERROR_THRESHOLD = 3;
const SELF_HOST_LOAD_TIMEOUT_MS = 6000;
// Отдельные тайлы, которые не падают с ошибкой, а просто зависают (медленный/
// перегруженный self-host) — тоже повод уйти на запасной источник. Ловим это
// уже после первой загрузки стиля: как только начинается подгрузка тайлов
// self-host источника, взводим таймер на SELF_HOST_SLOW_TILE_MS; если карта
// не успевает угомониться ("idle" — все источники догружены) до его
// срабатывания, засчитываем "медленную" загрузку. Несколько таких подряд —
// тот же сигнал, что и явные ошибки тайлов.
const SELF_HOST_SLOW_TILE_MS = 5000;
const SELF_HOST_SLOW_LOAD_THRESHOLD = 2;

// TILES_URL/WORLD_TILES_URL в .env — относительные пути (см. .env.example),
// а стиль карты собирается как обычный JS-объект и идёт в new maplibregl.Map()
// напрямую, без fetch style.json — то есть без "базового URL", относительно
// которого браузер мог бы разрешить относительный tiles-шаблон. MapLibre
// пытается резолвить его сам (в т.ч. в контексте воркера) и либо падает с
// ошибкой, либо (при резолве через new URL()) percent-encode'ит фигурные
// скобки {z}/{x}/{y} в %7Bz%7D/..., так что тайл никогда не совпадает ни с
// одним реальным путём — self-host в итоге не делает вообще ни одного
// сетевого запроса и почти сразу проваливается в фолбэк на OpenFreeMap (см.
// инцидент "self-host карта не грузится на телефонах" 2026-07-11). Чиним
// простой строковой конкатенацией с origin — не через URL API, чтобы не
// портить {z}/{x}/{y}.
function absoluteTileURL(url: string): string {
  if (!url || /^https?:\/\//i.test(url) || typeof window === "undefined") return url;
  return `${window.location.origin}${url}`;
}

function shouldSkipSelfHost(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const until = Number(sessionStorage.getItem(SELF_HOST_FALLBACK_KEY) || 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

function markSelfHostFailed() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      SELF_HOST_FALLBACK_KEY,
      String(Date.now() + SELF_HOST_RETRY_COOLDOWN_MS)
    );
  } catch {
    // ignore — в худшем случае self-host попробуется ещё раз раньше срока
  }
}

function buildStyle(): { style: StyleSpecification | string; selfHosted: boolean } {
  const skipSelfHost = shouldSkipSelfHost();
  if (TILES_URL && !skipSelfHost) {
    // `pmtiles serve` за реверс-прокси — обычный ZXY, URL известен заранее,
    // поэтому источник собирается тут же, без похода за TileJSON.
    const sources: NonNullable<StyleSpecification["sources"]> = {
      protomaps: {
        type: "vector",
        tiles: [absoluteTileURL(TILES_URL)],
        minzoom: 9,
        maxzoom: TILES_MAXZOOM,
        attribution: PROTOMAPS_ATTRIBUTION,
      },
    };
    let layers = themeLayers("protomaps", "light", "ru");
    if (WORLD_TILES_URL) {
      sources.protomaps_world = {
        type: "vector",
        tiles: [absoluteTileURL(WORLD_TILES_URL)],
        maxzoom: WORLD_TILES_MAXZOOM,
        attribution: PROTOMAPS_ATTRIBUTION,
      };
      // Слои мирового источника рисуются первыми (снизу), с префиксом id —
      // themeLayers() даёт фиксированные id, без префикса они бы конфликтовали
      // с одноимёнными слоями источника "protomaps" в одном style.layers.
      // Свой "background" (сплошная заливка без источника/фильтра) держим
      // только у мирового набора — второй такой же слой из набора "protomaps"
      // красился бы поверх и глушил мировую подложку целиком, на любом зуме.
      const worldLayers = themeLayers("protomaps_world", "light", "ru").map(
        (l) => ({ ...l, id: `world_${l.id}` })
      );
      layers = [...worldLayers, ...layers.filter((l) => l.id !== "background")];
    }
    return {
      selfHosted: true,
      style: {
        version: 8,
        glyphs: absoluteTileURL(PM_GLYPHS),
        sprite: absoluteTileURL(PM_SPRITE_LIGHT),
        sources,
        layers,
      },
    };
  }
  if (!PMTILES_URL || skipSelfHost) return { style: OPENFREEMAP_LIGHT, selfHosted: false };
  ensurePmtiles();
  return {
    selfHosted: true,
    style: {
      version: 8,
      glyphs: absoluteTileURL(PM_GLYPHS),
      sprite: absoluteTileURL(PM_SPRITE_LIGHT),
      sources: {
        protomaps: {
          type: "vector",
          url: `pmtiles://${absoluteTileURL(PMTILES_URL)}`,
          attribution: PROTOMAPS_ATTRIBUTION,
        },
      },
      layers: themeLayers("protomaps", "light", "ru"),
    },
  };
}

function stationsToFC(list: StationStatus[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: list.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      properties: {
        id: s.id,
        status: s.status,
        stale: s.stale,
        brand: s.brand ?? "",
        name: s.name,
        conflicting: s.conflicting,
      },
    })),
  };
}

// Цвет мини-бейджа очереди на маркере (шкала от предупреждения до тревоги).
const QUEUE_BADGE_HEX: Partial<Record<QueueLevel, string>> = {
  small: "#FFB020",
  big: "#FF9100",
  hours: "#FF3D00",
};

const MARKER_PUMP_PATHS = [
  "M3 21h12",
  "M5 21V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v16",
  "M3 9h10",
  "M15 9l2.5 2.5a2 2 0 0 1 .6 1.4V17a1.5 1.5 0 0 0 3 0V8.5L18 6",
];
const SVG_NS = "http://www.w3.org/2000/svg";

function buildPumpIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "azs-marker__pump");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  for (const d of MARKER_PUMP_PATHS) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  return svg;
}

// Создаёт DOM-маркер заправки: светящийся кружок цвета статуса со значком
// колонки (брендинг сети виден в карточке станции и в списке через
// BrandBadge, на самой карте статус важнее логотипа — их за раз до сотни).
// queue/price — опциональные детали, видимые только при достаточном зуме
// (см. data-zoom-tier на контейнере карты и .azs-marker__queue/__price в CSS).
function buildMarkerEl(
  brand: string,
  name: string,
  status: FuelStatus,
  queue: QueueLevel | null,
  price: { fuel: FuelType; price: number } | null
): HTMLDivElement {
  const root = document.createElement("div");
  root.className = "azs-marker";
  root.title = brand || name;
  root.style.setProperty("--st", STATUS_HEX[status]);

  const badge = document.createElement("div");
  badge.className = "azs-marker__badge";
  badge.appendChild(buildPumpIcon());

  // Маленький значок статуса с символом (✓ ! ✕ ?) — статус читается без опоры на цвет.
  const dot = document.createElement("span");
  dot.className = "azs-marker__status";
  dot.textContent = STATUS_GLYPH[status];
  dot.style.background = STATUS_HEX[status];

  root.appendChild(badge);
  root.appendChild(dot);

  const queueHex = queue ? QUEUE_BADGE_HEX[queue] : undefined;
  if (queueHex) {
    const queueBadge = document.createElement("span");
    queueBadge.className = "azs-marker__queue";
    queueBadge.style.background = queueHex;
    root.appendChild(queueBadge);
  }

  if (price) {
    const priceBadge = document.createElement("span");
    priceBadge.className = "azs-marker__price";
    priceBadge.textContent = price.price.toFixed(price.price % 1 === 0 ? 0 : 1);
    root.appendChild(priceBadge);
  }

  return root;
}

export default function MapLibreMapView({
  stations,
  onBoundsChange,
  onSelect,
  onCenterChange,
  userLocation,
  flyTarget,
  center,
  zoom,
  selectedId = null,
  hoveredId = null,
  theme: _mapTheme = "light",
  route = null,
  compact = false,
  onLongPress,
  onLocate,
  locating = false,
  priceFuelType = null,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const readyRef = useRef(false);
  // Отрисовка точек/донатов приостановлена — область крупнее Московской области.
  const [pointsPaused, setPointsPaused] = useState(false);
  const pointsPausedRef = useRef(false);
  const stationsRef = useRef(stations);
  const selectedIdRef = useRef(selectedId);
  const hoveredIdRef = useRef(hoveredId);
  const onSelectRef = useRef(onSelect);
  const onBoundsRef = useRef(onBoundsChange);
  const onCenterRef = useRef(onCenterChange);
  const routeRef = useRef<GeoJSON.LineString | null>(route);
  const onLongPressRef = useRef(onLongPress);
  const priceFuelTypeRef = useRef(priceFuelType);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // HTML-маркеры одиночных АЗС, ключ — id заправки.
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  // Донат-маркеры кластеров, ключ — координаты (cluster_id нестабилен между setData).
  const clusterMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const clusterMetaRef = useRef<Map<string, { coords: [number, number] }>>(
    new Map()
  );
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  stationsRef.current = stations;
  selectedIdRef.current = selectedId;
  hoveredIdRef.current = hoveredId;
  onSelectRef.current = onSelect;
  onBoundsRef.current = onBoundsChange;
  onCenterRef.current = onCenterChange;
  onLongPressRef.current = onLongPress;
  priceFuelTypeRef.current = priceFuelType;

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    const { style: initialStyle, selfHosted: usingSelfHost } = buildStyle();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: [center[1], center[0]], // MapLibre: [lng, lat]
      zoom,
      attributionControl: false,
      fadeDuration: 0,
      renderWorldCopies: false,
      // Без этого MapLibre рендерит canvas на полном devicePixelRatio — на
      // телефонах это обычно 3, то есть GPU закрашивает в 9 раз больше
      // пикселей на каждый кадр пана/зума, чем на условном 1x-экране. Кап в
      // 2 почти не заметен на карте (мелкий текст/линии, не фото), а на
      // экранах с pixelRatio 1-2 (десктоп, большинство Android) вообще ничего
      // не меняет — Math.min не опускает ниже фактического значения.
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    });
    mapRef.current = map;

    // Self-host отвалился (nginx/pmtiles serve легли или файлы не докачаны) —
    // переключаемся на OpenFreeMap прямо в рантайме, без пересборки фронта.
    // "styledata" ниже уже переустанавливает source/слои станций и маршрута
    // при смене стиля, отдельно про это заботиться не нужно.
    let selfHostFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (usingSelfHost) {
      let selfHostErrors = 0;
      let fellBack = false;
      const fallbackToOpenFreeMap = () => {
        if (fellBack || destroyed) return;
        fellBack = true;
        markSelfHostFailed();
        map.setStyle(OPENFREEMAP_LIGHT);
      };
      // Готовность self-host тайлов отслеживаем по своим источникам
      // ("sourcedata" + isSourceLoaded), а не по map "load"/"idle" — оба ждут
      // ещё и спрайт/шрифты, и зависший внешний хост для них не должен
      // считаться зависшим self-host (см. комментарий у PM_GLYPHS выше).
      const requiredSources = WORLD_TILES_URL
        ? ["protomaps", "protomaps_world"]
        : ["protomaps"];
      const loadedSources = new Set<string>();

      selfHostFallbackTimer = setTimeout(() => {
        if (loadedSources.size < requiredSources.length) fallbackToOpenFreeMap();
      }, SELF_HOST_LOAD_TIMEOUT_MS);
      map.on("error", (e) => {
        const sourceId = (e as unknown as { sourceId?: string }).sourceId;
        if (sourceId !== "protomaps" && sourceId !== "protomaps_world") return;
        selfHostErrors++;
        if (selfHostErrors >= SELF_HOST_ERROR_THRESHOLD) fallbackToOpenFreeMap();
      });

      // Вотчдог на "тихо зависшие" тайлы (без явной ошибки) — см. комментарий
      // у SELF_HOST_SLOW_TILE_MS выше.
      let slowTileTimer: ReturnType<typeof setTimeout> | null = null;
      let slowLoads = 0;
      const clearSlowTileTimer = () => {
        if (slowTileTimer) {
          clearTimeout(slowTileTimer);
          slowTileTimer = null;
        }
      };
      map.on("dataloading", (e) => {
        const sourceId = (e as unknown as { sourceId?: string }).sourceId;
        if (sourceId !== "protomaps" && sourceId !== "protomaps_world") return;
        if (slowTileTimer) return; // уже отслеживаем текущую партию подгрузки
        slowTileTimer = setTimeout(() => {
          slowTileTimer = null;
          slowLoads++;
          if (slowLoads >= SELF_HOST_SLOW_LOAD_THRESHOLD) fallbackToOpenFreeMap();
        }, SELF_HOST_SLOW_TILE_MS);
      });
      // Партия тайлов конкретного self-host источника догрузилась — снимаем
      // оба вотчдога именно по этому сигналу, а не по глобальному "idle"
      // (который, в отличие от него, зависит ещё и от спрайта).
      map.on("sourcedata", (e) => {
        const data = e as unknown as { sourceId?: string; isSourceLoaded?: boolean };
        if (!data.sourceId || !requiredSources.includes(data.sourceId)) return;
        if (!data.isSourceLoaded) return;
        loadedSources.add(data.sourceId);
        if (loadedSources.size === requiredSources.length && selfHostFallbackTimer) {
          clearTimeout(selfHostFallbackTimer);
          selfHostFallbackTimer = null;
        }
        clearSlowTileTimer();
      });
    }

    const zoomIn = () => map.zoomIn({ duration: 200 });
    const zoomOut = () => map.zoomOut({ duration: 200 });
    (map as unknown as { __zoomIn?: () => void; __zoomOut?: () => void }).__zoomIn = zoomIn;
    (map as unknown as { __zoomOut?: () => void }).__zoomOut = zoomOut;

    // Кластеры рисуем слоями (их сбрасывает setStyle — переустанавливаем в styledata).
    const installClusters = () => {
      if (!map.getSource("stations")) {
        map.addSource("stations", {
          type: "geojson",
          data: stationsToFC(stationsRef.current),
          cluster: true,
          // Радиус = диаметр значка маркера (.azs-marker__badge, 38px) —
          // ровно расстояние между центрами, на котором два кружка начинают
          // касаться. Правило: коснулись — группируем в кластер; не
          // коснулись — рисуем каждую заправку своим маркером.
          clusterRadius: 38,
          clusterMaxZoom: CLUSTER_MAX_ZOOM,
          clusterProperties: {
            yes: ["+", ["case", ["==", ["get", "status"], "yes"], 1, 0]],
            low: ["+", ["case", ["==", ["get", "status"], "low"], 1, 0]],
            no: ["+", ["case", ["==", ["get", "status"], "no"], 1, 0]],
            unknown: ["+", ["case", ["==", ["get", "status"], "unknown"], 1, 0]],
          },
        });
      }

      // Слой кластеров невидим — визуал теперь донат-DOM-маркер (см. syncClusterMarkers),
      // слой нужен только чтобы queryRenderedFeatures находил кластеры в вьюпорте.
      if (!map.getLayer("clusters")) {
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "stations",
          filter: ["has", "point_count"],
          paint: {
            "circle-radius": ["step", ["get", "point_count"], 17, 10, 21, 50, 27],
            "circle-opacity": 0,
            "circle-stroke-width": 0,
          },
        });
      }
      // Невидимый слой для быстрого queryRenderedFeatures (только видимая область).
      if (!map.getLayer("station-points")) {
        map.addLayer({
          id: "station-points",
          type: "circle",
          source: "stations",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": 10,
            "circle-opacity": 0,
            "circle-stroke-width": 0,
          },
        });
      }
    };

    // Линия маршрута (OSRM). Источник переживает смену стиля, слои — нет,
    // поэтому переустанавливаем их в обработчике styledata.
    const emptyFC: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    const routeToFC = (
      line: GeoJSON.LineString | null
    ): GeoJSON.FeatureCollection =>
      line
        ? { type: "FeatureCollection", features: [{ type: "Feature", geometry: line, properties: {} }] }
        : emptyFC;

    const installRoute = () => {
      if (!map.getSource("route")) {
        map.addSource("route", {
          type: "geojson",
          data: routeToFC(routeRef.current),
        });
      }
      if (!map.getLayer("route-casing")) {
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#0A0D1F",
            "line-width": ["interpolate", ["linear"], ["zoom"], 8, 6, 16, 12],
            "line-opacity": 0.5,
          },
        });
      }
      if (!map.getLayer("route-line")) {
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#00D4AA",
            "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3.5, 16, 7],
          },
        });
      }
    };

    // Карта скрыта (display:none в режиме «Список» на мобильном) — контейнер 0×0.
    const isHidden = () => {
      const el = containerRef.current;
      return !el || el.clientWidth === 0 || el.clientHeight === 0;
    };

    // Проверяет, не крупнее ли видимая область Московской области, и если
    // состояние сменилось — обновляет реф (для sync-функций) и React state
    // (для плашки). Вызывается один раз за цикл синхронизации, из syncAll.
    const updatePointsPaused = () => {
      if (destroyed || mapRef.current !== map) return pointsPausedRef.current;
      const bounds = map.getBounds();
      const latSpan = bounds.getNorth() - bounds.getSouth();
      const lngSpan = bounds.getEast() - bounds.getWest();
      const paused = Math.max(latSpan, lngSpan) > REGION_DISABLE_SPAN_DEG;
      if (paused !== pointsPausedRef.current) {
        pointsPausedRef.current = paused;
        setPointsPaused(paused);
      }
      return paused;
    };

    // Синхронизация HTML-маркеров одиночных АЗС с тем, что сейчас в источнике.
    let syncRaf: number | null = null;
    let markerBatchRaf: number | null = null;

    const cancelMarkerBatch = () => {
      if (markerBatchRaf != null) {
        cancelAnimationFrame(markerBatchRaf);
        markerBatchRaf = null;
      }
    };

    const syncMarkers = () => {
      if (destroyed || mapRef.current !== map) return;
      if (isHidden()) return;
      let hasStationsSource = false;
      try {
        hasStationsSource = Boolean(map.getSource("stations"));
      } catch {
        return;
      }
      if (!hasStationsSource) return;

      if (pointsPausedRef.current) {
        cancelMarkerBatch();
        for (const [id, marker] of markersRef.current) {
          marker.remove();
          markersRef.current.delete(id);
        }
        return;
      }

      const zoomNow = map.getZoom();
      if (containerRef.current) {
        containerRef.current.dataset.zoomTier =
          zoomNow >= MARKER_DETAIL_ZOOM ? "detail" : "overview";
      }

      // Ниже порога кластеризации HTML-маркер получают только станции, которые
      // supercluster не сгруппировал ни с кем на этом зуме (невидимый слой
      // station-points, filter: !has(point_count)) — одиночная заправка без
      // соседей рядом должна быть видна всегда, а не пропадать вместе с
      // переходом в режим кластеров (раньше здесь был безусловный ранний
      // выход, и такие точки не показывались вообще никак).
      let allowedIds: Set<string> | null = null;
      if (zoomNow < CLUSTER_MAX_ZOOM) {
        let unclustered: maplibregl.MapGeoJSONFeature[] = [];
        try {
          unclustered = map.queryRenderedFeatures(undefined, {
            layers: ["station-points"],
          });
        } catch {
          return;
        }
        allowedIds = new Set(
          unclustered.map((f) => String(f.properties?.id ?? "")).filter(Boolean)
        );
      }

      const bounds = map.getBounds();
      const pad = 0.015;
      const south = bounds.getSouth() - pad;
      const north = bounds.getNorth() + pad;
      const west = bounds.getWest() - pad;
      const east = bounds.getEast() + pad;
      const center = map.getCenter();

      const unique = stationsRef.current
        .filter(
          (s) =>
            s.lat >= south &&
            s.lat <= north &&
            s.lng >= west &&
            s.lng <= east &&
            (allowedIds === null || allowedIds.has(s.id))
        )
        .map((s) => {
          const dLat = s.lat - center.lat;
          const dLng = s.lng - center.lng;
          return {
            id: s.id,
            station: s,
            coords: [s.lng, s.lat] as [number, number],
            dist: dLat * dLat + dLng * dLng,
          };
        })
        .sort((a, b) => a.dist - b.dist)
        .slice(0, MAX_HTML_MARKERS);

      const seen = new Set<string>();
      let batchIndex = 0;

      const runBatch = () => {
        if (destroyed || mapRef.current !== map) return;
        const end = Math.min(batchIndex + MARKER_BATCH_SIZE, unique.length);
        for (let i = batchIndex; i < end; i++) {
          const { id, station, coords } = unique[i];
          seen.add(id);

          let marker = markersRef.current.get(id);
          const isSelected = selectedIdRef.current === id;
          if (!marker) {
            const activeFuel = priceFuelTypeRef.current;
            const stationPrice = activeFuel
              ? station.prices[activeFuel]
                ? { fuel: activeFuel, price: station.prices[activeFuel]! }
                : null
              : bestPrice(station.prices);
            const el = buildMarkerEl(
              station.brand ?? "",
              station.name,
              station.status,
              station.queue && station.queue !== "none" ? station.queue : null,
              stationPrice
            );
            el.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const st = stationsRef.current.find((s) => s.id === id);
              if (st) onSelectRef.current(st);
            });
            marker = new maplibregl.Marker({ element: el, anchor: "center" })
              .setLngLat(coords)
              .addTo(map);
            markersRef.current.set(id, marker);
          } else {
            marker.setLngLat(coords);
          }
          marker.getElement().classList.toggle("azs-marker--selected", isSelected);
          marker
            .getElement()
            .classList.toggle("azs-marker--hovered", hoveredIdRef.current === id);
          marker
            .getElement()
            .classList.toggle("azs-marker--conflict", Boolean(station.conflicting));
        }
        batchIndex = end;
        if (batchIndex < unique.length) {
          markerBatchRaf = requestAnimationFrame(runBatch);
        } else {
          markerBatchRaf = null;
          for (const [id, marker] of markersRef.current) {
            if (!seen.has(id)) {
              marker.remove();
              markersRef.current.delete(id);
            }
          }
        }
      };

      cancelMarkerBatch();
      if (unique.length === 0) {
        for (const [id, marker] of markersRef.current) {
          marker.remove();
          markersRef.current.delete(id);
        }
        return;
      }
      runBatch();
    };

    // Синхронизация донат-маркеров кластеров с текущим вьюпортом.
    const syncClusterMarkers = () => {
      if (destroyed || mapRef.current !== map) return;
      if (isHidden()) return;
      let hasStationsSource = false;
      try {
        hasStationsSource = Boolean(map.getSource("stations"));
      } catch {
        return;
      }
      if (!hasStationsSource) return;

      if (pointsPausedRef.current) {
        for (const [id, marker] of clusterMarkersRef.current) {
          marker.remove();
          clusterMarkersRef.current.delete(id);
        }
        clusterMetaRef.current.clear();
        return;
      }

      const zoomNow = map.getZoom();
      // На крупном масштабе кластеров нет — источник отдаёт одиночные точки.
      if (zoomNow >= CLUSTER_MAX_ZOOM) {
        for (const [id, marker] of clusterMarkersRef.current) {
          marker.remove();
          clusterMarkersRef.current.delete(id);
        }
        clusterMetaRef.current.clear();
        return;
      }

      let features: maplibregl.MapGeoJSONFeature[] = [];
      try {
        features = map.queryRenderedFeatures(undefined, { layers: ["clusters"] });
      } catch {
        return;
      }

      const seen = new Set<string>();
      for (const feature of features) {
        const props = feature.properties ?? {};
        const clusterId = Number(props.cluster_id);
        if (!Number.isFinite(clusterId)) continue;

        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        // Ключ по координатам, а не по cluster_id: supercluster переиспользует id между
        // перестройками индекса (см. setData), из-за чего один и тот же id может достаться
        // другому кластеру и DOM-маркер молча "телепортируется" не туда при клике.
        const key = `${coords[0].toFixed(4)}:${coords[1].toFixed(4)}`;
        seen.add(key);

        const counts: ClusterCounts = {
          yes: Number(props.yes) || 0,
          low: Number(props.low) || 0,
          no: Number(props.no) || 0,
          unknown: Number(props.unknown) || 0,
        };
        const total = counts.yes + counts.low + counts.no + counts.unknown;
        const label = String(props.point_count_abbreviated ?? props.point_count ?? total);
        const sig = `${counts.yes}-${counts.low}-${counts.no}-${counts.unknown}-${label}`;

        clusterMetaRef.current.set(key, { coords });

        let marker = clusterMarkersRef.current.get(key);
        if (!marker) {
          const el = buildClusterMarkerEl(counts, total, label);
          el.dataset.sig = sig;

          const fallbackZoom = () => {
            const meta = clusterMetaRef.current.get(key);
            if (!meta) return;
            map.easeTo({
              center: meta.coords,
              zoom: Math.max(map.getZoom() + 2, CLUSTER_MAX_ZOOM + 1),
              duration: 400,
            });
          };

          // Зум по клику — сразу по границам всех точек кластера, а не
          // фиксированным шагом: плотный кластер раскрывается за один тап,
          // редкий не перелетает мимо. cluster_id запрашиваем заново прямо в
          // момент клика — кэшировать его на маркере нельзя, см. комментарий
          // про key по координатам выше (id переиспользуется между
          // перестройками индекса supercluster).
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const meta = clusterMetaRef.current.get(key);
            const src = map.getSource("stations") as GeoJSONSource | undefined;
            if (!meta || !src) {
              fallbackZoom();
              return;
            }
            let liveFeature: maplibregl.MapGeoJSONFeature | undefined;
            try {
              const pt = map.project(meta.coords);
              liveFeature = map.queryRenderedFeatures(
                [
                  [pt.x - 6, pt.y - 6],
                  [pt.x + 6, pt.y + 6],
                ],
                { layers: ["clusters"] }
              )[0];
            } catch {
              liveFeature = undefined;
            }
            const liveId = Number(liveFeature?.properties?.cluster_id);
            const liveCount = Number(liveFeature?.properties?.point_count) || 0;
            if (!liveFeature || !Number.isFinite(liveId)) {
              fallbackZoom();
              return;
            }
            void src
              .getClusterLeaves(liveId, liveCount || 200, 0)
              .then((leaves) => {
                if (destroyed || mapRef.current !== map) return;
                if (!clusterMarkersRef.current.has(key)) return;
                if (!leaves || leaves.length === 0) {
                  fallbackZoom();
                  return;
                }
                const bounds = new maplibregl.LngLatBounds();
                for (const leaf of leaves) {
                  bounds.extend(
                    (leaf.geometry as GeoJSON.Point).coordinates as [number, number]
                  );
                }
                map.fitBounds(bounds, {
                  padding: 72,
                  maxZoom: Math.max(CLUSTER_MAX_ZOOM + 3, map.getZoom() + 3),
                  duration: 450,
                });
              })
              .catch(() => {
                if (!destroyed && mapRef.current === map) fallbackZoom();
              });
          });

          marker = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat(coords)
            .addTo(map);
          clusterMarkersRef.current.set(key, marker);
        } else {
          marker.setLngLat(coords);
          const el = marker.getElement();
          if (el.dataset.sig !== sig) {
            el.replaceChildren(...buildClusterMarkerEl(counts, total, label).childNodes);
            el.dataset.sig = sig;
          }
        }
      }

      for (const [id, marker] of clusterMarkersRef.current) {
        if (!seen.has(id)) {
          marker.remove();
          clusterMarkersRef.current.delete(id);
          clusterMetaRef.current.delete(id);
        }
      }
    };

    const syncAll = () => {
      updatePointsPaused();
      syncMarkers();
      syncClusterMarkers();
    };

    const scheduleSyncMarkers = () => {
      if (destroyed) return;
      if (syncRaf != null) cancelAnimationFrame(syncRaf);
      syncRaf = requestAnimationFrame(() => {
        syncRaf = null;
        if (destroyed) return;
        syncAll();
        // После отрисовки тайлов — повтор (queryRenderedFeatures раньше давал пустоту).
        map.once("idle", () => {
          if (!destroyed && mapRef.current === map) syncAll();
        });
      });
    };
    // Доступ к sync из других замыканий/эффектов.
    (map as unknown as { __sync?: () => void }).__sync = syncAll;

    map.on("load", () => {
      if (destroyed) return;
      setMapReady(true);
      installClusters();
      installRoute();

      const mapCanvas = map.getCanvas();
      mapCanvas.setAttribute("role", "img");
      mapCanvas.setAttribute("aria-label", "Интерактивная карта заправок");

      map.on("click", "station-points", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const id = String(feature.properties?.id ?? "");
        const st = stationsRef.current.find((s) => s.id === id);
        if (st) onSelectRef.current(st);
      });
      map.on("mouseenter", "station-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "station-points", () => {
        map.getCanvas().style.cursor = "";
      });

      readyRef.current = true;
      syncAll();
    });

    // После смены/перезагрузки базового стиля переустанавливаем слои.
    map.on("styledata", () => {
      if (destroyed || mapRef.current !== map || !map.isStyleLoaded()) return;
      if (!map.getSource("stations")) {
        installClusters();
        const src = map.getSource("stations") as GeoJSONSource | undefined;
        src?.setData(stationsToFC(stationsRef.current));
      }
      if (!map.getSource("route")) installRoute();
      if (readyRef.current) scheduleSyncMarkers();
    });

    map.on("moveend", () => {
      if (readyRef.current) scheduleSyncMarkers();
    });
    map.on("zoomend", () => {
      if (readyRef.current) scheduleSyncMarkers();
    });

    const emitBounds = () => {
      if (destroyed || mapRef.current !== map) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (destroyed || mapRef.current !== map || isHidden()) return;
        const b = map.getBounds();
        const clamped: BBox = [
          b.getSouth(),
          b.getWest(),
          b.getNorth(),
          b.getEast(),
        ];
        onBoundsRef.current(clampBBoxSpan(clamped));
        const c = map.getCenter();
        onCenterRef.current?.([c.lat, c.lng]);
      }, 220);
    };
    map.on("moveend", emitBounds);
    // Ранняя подгрузка данных ещё во время перелёта к новому региону.
    let movePrefetchTimer: ReturnType<typeof setTimeout> | null = null;
    map.on("move", () => {
      if (!readyRef.current || destroyed) return;
      if (movePrefetchTimer) clearTimeout(movePrefetchTimer);
      movePrefetchTimer = setTimeout(emitBounds, 380);
    });
    map.once("idle", emitBounds);

    // Контейнер меняет размер (показ/скрытие в режиме «Список») — корректно ресайзим.
    let wasHidden = isHidden();
    const ro = new ResizeObserver(() => {
      const hidden = isHidden();
      if (!hidden) {
        map.resize();
        // Если карта только что снова стала видимой — пересоберём маркеры.
        if (wasHidden && readyRef.current) scheduleSyncMarkers();
      }
      wasHidden = hidden;
    });
    if (containerRef.current) ro.observe(containerRef.current);

    // Долгое нажатие — добавить заправку.
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let pressStart: { x: number; y: number } | null = null;
    const LONG_MS = 550;
    const MOVE_TOL = 12;

    const clearPress = () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      pressStart = null;
    };

    const onPressStart = (clientX: number, clientY: number) => {
      if (!onLongPressRef.current) return;
      if (pressTimer) clearTimeout(pressTimer);
      pressStart = { x: clientX, y: clientY };
      pressTimer = setTimeout(() => {
        if (!pressStart || destroyed) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = pressStart.x - rect.left;
        const y = pressStart.y - rect.top;
        const lngLat = map.unproject([x, y]);
        onLongPressRef.current?.(lngLat.lat, lngLat.lng);
        clearPress();
      }, LONG_MS);
    };

    const onPressMove = (clientX: number, clientY: number) => {
      if (!pressStart || !pressTimer) return;
      const dx = clientX - pressStart.x;
      const dy = clientY - pressStart.y;
      if (dx * dx + dy * dy > MOVE_TOL * MOVE_TOL) clearPress();
    };

    const canvas = map.getCanvas();
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onPressStart(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onPressMove(t.clientX, t.clientY);
    };
    const onTouchEnd = () => clearPress();
    const onMouseDown = (e: MouseEvent) => onPressStart(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => onPressMove(e.clientX, e.clientY);
    const onMouseUp = () => clearPress();

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);

    return () => {
      destroyed = true;
      clearPress();
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      setMapReady(false);
      ro.disconnect();
      if (selfHostFallbackTimer) clearTimeout(selfHostFallbackTimer);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (movePrefetchTimer) clearTimeout(movePrefetchTimer);
      cancelMarkerBatch();
      if (syncRaf != null) cancelAnimationFrame(syncRaf);
      readyRef.current = false;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- ref Map стабилен на время жизни карты
      for (const m of markersRef.current.values()) m.remove();
      markersRef.current.clear();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- ref Map стабилен на время жизни карты
      for (const m of clusterMarkersRef.current.values()) m.remove();
      clusterMarkersRef.current.clear();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- ref Map стабилен на время жизни карты
      clusterMetaRef.current.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обновление данных заправок.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("stations") as GeoJSONSource | undefined;
    if (!src) return;
    src.setData(stationsToFC(stations));
    const sync = () => {
      (map as unknown as { __sync?: () => void }).__sync?.();
      if (map.isStyleLoaded()) {
        map.once("idle", () => {
          (map as unknown as { __sync?: () => void }).__sync?.();
        });
      }
    };
    sync();
  }, [stations]);

  // Маршрут OSRM: обновляем источник и подгоняем карту под линию.
  useEffect(() => {
    routeRef.current = route;
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("route") as GeoJSONSource | undefined;
    const fc: GeoJSON.FeatureCollection = route
      ? {
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: route, properties: {} }],
        }
      : { type: "FeatureCollection", features: [] };
    if (src) src.setData(fc);
    if (!route || route.coordinates.length === 0) return;
    // Подгоняем границы карты под маршрут (с отступами под панель/доки).
    const bounds = new maplibregl.LngLatBounds();
    for (const c of route.coordinates) {
      bounds.extend(c as [number, number]);
    }
    map.fitBounds(bounds, {
      padding: { top: 90, bottom: 120, left: 40, right: 40 },
      maxZoom: 15,
      duration: 600,
    });
  }, [route]);

  // Местоположение пользователя — отдельный синий маркер.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "user-marker";
      userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" });
    }
    userMarkerRef.current.setLngLat([userLocation[1], userLocation[0]]).addTo(map);
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTarget) return;
    map.flyTo({
      center: [flyTarget[1], flyTarget[0]],
      zoom: Math.max(map.getZoom(), 13),
      duration: 600,
    });
  }, [flyTarget]);

  // Подсветка выбранной заправки + центрирование.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    // Обновляем класс выделения на маркерах.
    for (const [id, marker] of markersRef.current) {
      marker.getElement().classList.toggle("azs-marker--selected", id === selectedId);
    }
    if (!selectedId) return;
    const st = stationsRef.current.find((s) => s.id === selectedId);
    if (!st) return;
    map.easeTo({
      center: [st.lng, st.lat],
      zoom: Math.max(map.getZoom(), 15),
      duration: 400,
    });
    (map as unknown as { __sync?: () => void }).__sync?.();
  }, [selectedId]);

  // Подсветка станции, наведённой/прокрученной в списке — только класс на
  // маркере, без перецентровки карты (в отличие от selectedId выше).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    for (const [id, marker] of markersRef.current) {
      marker.getElement().classList.toggle("azs-marker--hovered", id === hoveredId);
    }
  }, [hoveredId]);

  const handleZoomIn = () => {
    (mapRef.current as unknown as { __zoomIn?: () => void })?.__zoomIn?.();
  };
  const handleZoomOut = () => {
    (mapRef.current as unknown as { __zoomOut?: () => void })?.__zoomOut?.();
  };

  return (
    <div className="contents">
      <div className="relative h-full w-full">
        <div ref={containerRef} className="map-canvas h-full w-full" />
        <MapSlowLoadHint waiting={!mapReady} />
        {mapReady && pointsPaused && (
          <div className="map-points-paused pointer-events-none absolute inset-x-0 z-[450] flex justify-center px-4">
            <div className="glass-dock max-w-xs rounded-full px-4 py-2.5 text-center text-xs font-medium text-ink-muted sm:max-w-sm sm:text-sm">
              Отрисовка заправок отключена для оптимизации — приблизьте карту
            </div>
          </div>
        )}
      </div>
      {!compact && (
        <div
          className="map-zoom-controls map-zoom-controls--paper glass-dock"
          role="group"
          aria-label="Масштаб и геолокация"
        >
          {onLocate && (
            <>
              <button
                type="button"
                className={`map-zoom-btn${userLocation ? " map-zoom-btn--active" : ""}${locating ? " map-zoom-btn--busy" : ""}`}
                onClick={onLocate}
                disabled={locating}
                title="Найти себя"
                aria-label="Найти себя на карте"
              >
                <CrosshairIcon className="h-5 w-5" />
              </button>
              <div className="map-zoom-sep" aria-hidden />
            </>
          )}
          <button
            type="button"
            className="map-zoom-btn"
            onClick={handleZoomIn}
            disabled={!mapReady}
            aria-label="Приблизить карту"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
          <div className="map-zoom-sep" aria-hidden />
          <button
            type="button"
            className="map-zoom-btn"
            onClick={handleZoomOut}
            disabled={!mapReady}
            aria-label="Отдалить карту"
          >
            <MinusIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
