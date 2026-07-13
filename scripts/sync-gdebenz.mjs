import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { loadEnv } from "./load-env.mjs";
import {
  FETCH_TRANSPORTS,
  HTTP_RESPONSE_DELAY_MS,
  MAX_RETRIES,
  PROXY_POOL,
  REQUEST_TIMEOUT_MS,
  RETRY_DELAY_MS,
  closeTransports,
  describeFetchError,
  nextProxy,
  requestJson,
  responseDelayForTransport,
  sleep,
  waitAfterResponse,
} from "./lib/gdebenz-http.mjs";
import { mapGdebenzStatus, parseFuels } from "./lib/gdebenz-parse.mjs";
import { withRetry } from "./lib/db-retry.mjs";
import { closePool, getPool } from "./lib/db.mjs";

loadEnv();

// ---------------------------------------------------------------------------
// Станции + грубый текущий статус: обход тайлового API gdebenz.ru
// (`/api/stations`), upsert найденных станций в Supabase, одна запись
// статуса на станцию за прогон.
//
// Богатая история отметок по станции (лента `/api/comments/<id>/recent`)
// вынесена в отдельный, более быстрый скрипт — scripts/sync-gdebenz-comments.mjs
// — он читает список станций уже отсюда (по `gdebenz_id`, который этот
// скрипт проставляет при upsert) и не делает тайловый обход вообще.
// ---------------------------------------------------------------------------

const API_BASE = "https://gdebenz.ru/api/stations";
const SYNTHETIC_BASE = 1_000_000_000;
const DENSITY_MODE = process.env.DENSITY_MODE || "full";

// Размер тайла в градусах. ~1.2°×1.2° гарантированно ниже лимита bbox_too_large
// и без скрытого ограничения числа строк на ответ.
const TILE_LAT = Number(process.env.TILE_LAT) || 1.2;
const TILE_LON = Number(process.env.TILE_LON) || 1.2;

/** Размер батча для upsert/insert. */
const BATCH = Number(process.env.BATCH) || 500;
/** Размер чанка для select osm_id -> uuid. */
const SELECT_CHUNK = Number(process.env.SELECT_CHUNK) || 1000;
const DEFAULT_SYNC_CONCURRENCY = process.platform === "win32" ? 1 : 2;
const SYNC_CONCURRENCY = Math.max(1, Number(process.env.SYNC_CONCURRENCY) || DEFAULT_SYNC_CONCURRENCY);

const RUSSIA_POLYGON_URL = new URL("./data/russia-adm0-simplified.geojson", import.meta.url);
const TILE_SAMPLE_FRACTIONS = [0.1, 0.3, 0.5, 0.7, 0.9];
let russiaPolygonPromise;

async function loadRussiaPolygon() {
  if (!russiaPolygonPromise) {
    russiaPolygonPromise = (async () => {
      const raw = await readFile(RUSSIA_POLYGON_URL, "utf8");
      const geojson = JSON.parse(raw);
      const sources =
        geojson?.type === "FeatureCollection"
          ? geojson.features
          : geojson?.type === "Feature"
            ? [geojson]
            : [geojson];

      const polygons = [];
      let south = Infinity;
      let west = Infinity;
      let north = -Infinity;
      let east = -Infinity;

      for (const source of sources) {
        const geometry = source?.geometry || source;
        if (!geometry?.type || !Array.isArray(geometry.coordinates)) continue;

        const pushPolygon = (rings) => {
          if (!Array.isArray(rings) || !rings.length) return;
          let polySouth = Infinity;
          let polyWest = Infinity;
          let polyNorth = -Infinity;
          let polyEast = -Infinity;

          for (const ring of rings) {
            if (!Array.isArray(ring)) continue;
            for (const point of ring) {
              const lon = Number(point?.[0]);
              const lat = Number(point?.[1]);
              if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
              if (lat < polySouth) polySouth = lat;
              if (lat > polyNorth) polyNorth = lat;
              if (lon < polyWest) polyWest = lon;
              if (lon > polyEast) polyEast = lon;
            }
          }

          if (!Number.isFinite(polySouth) || !Number.isFinite(polyWest) || !Number.isFinite(polyNorth) || !Number.isFinite(polyEast)) {
            return;
          }

          polygons.push({
            rings,
            bbox: { south: polySouth, west: polyWest, north: polyNorth, east: polyEast },
          });

          if (polySouth < south) south = polySouth;
          if (polyWest < west) west = polyWest;
          if (polyNorth > north) north = polyNorth;
          if (polyEast > east) east = polyEast;
        };

        if (geometry.type === "Polygon") {
          pushPolygon(geometry.coordinates);
        } else if (geometry.type === "MultiPolygon") {
          for (const rings of geometry.coordinates) pushPolygon(rings);
        }
      }

      if (!polygons.length) {
        throw new Error(`Не удалось прочитать полигон РФ из ${RUSSIA_POLYGON_URL.pathname}`);
      }

      return { polygons, bbox: { south, west, north, east } };
    })();
  }

  return russiaPolygonPromise;
}

function rectIntersectsRect(a, b) {
  return a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south;
}

function pointOnSegment(point, a, b) {
  const [x, y] = point;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
  if (Math.abs(cross) > 1e-12) return false;
  const dot = (x - x1) * (x - x2) + (y - y1) * (y - y2);
  return dot <= 1e-12;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (pointOnSegment(point, a, b)) return true;
    const intersects =
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  if (!Array.isArray(polygon) || !polygon.length) return false;
  if (!pointInRing(point, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(point, polygon[i])) return false;
  }
  return true;
}

function pointInRussia(point, russia) {
  return russia.polygons.some(({ rings, bbox }) => {
    const [lon, lat] = point;
    if (lon < bbox.west || lon > bbox.east || lat < bbox.south || lat > bbox.north) return false;
    return pointInPolygon(point, rings);
  });
}

function tileSamplePoints(tile) {
  const latSpan = tile.north - tile.south;
  const lonSpan = tile.east - tile.west;
  const points = [];
  for (const latFrac of TILE_SAMPLE_FRACTIONS) {
    for (const lonFrac of TILE_SAMPLE_FRACTIONS) {
      points.push([tile.west + lonSpan * lonFrac, tile.south + latSpan * latFrac]);
    }
  }
  return points;
}

function tileTouchesRussia(tile, russia) {
  if (!rectIntersectsRect(tile, russia.bbox)) return false;
  const samples = tileSamplePoints(tile);
  return russia.polygons.some(({ rings, bbox }) => {
    if (!rectIntersectsRect(tile, bbox)) return false;
    return samples.some((point) => pointInPolygon(point, rings));
  });
}

// Макро-регионы, покрывающие Россию (south, west, north, east).
// Каждый разбивается на тайлы TILE_LAT×TILE_LON; финальная отсечка по
// границе РФ — отдельным полигоном (см. tileTouchesRussia), так что
// прямоугольники ниже могут свободно перекрываться/заходить за границу.
//
// Первые 7 регионов — основная (западная и южно-сибирская) полоса расселения.
// Регионы ниже добавлены отдельно, т.к. раньше здесь не было покрытия для
// северов и Дальнего Востока за Хабаровским/Приморским краем (несмотря на
// прежний комментарий про "кластеры вокруг городов" — по факту их не было):
// Ямал/Ненецкий АО/Воркута, Таймыр/Норильск, Якутия, Магаданская область,
// Камчатка, Чукотка (включая кусок за антимеридианом) и Сахалин. Это
// увеличивает число тайлов (и, соответственно, нагрузку на gdebenz.ru) —
// сознательный компромисс в пользу полноты покрытия.
const MACRO_REGIONS = [
  { south: 50.0, west: 27.5, north: 60.5, east: 45.5 },
  { south: 58.0, west: 27.0, north: 69.5, east: 45.5 },
  { south: 43.0, west: 37.0, north: 48.5, east: 45.5 },
  { south: 51.0, west: 52.0, north: 60.5, east: 66.5 },
  { south: 53.0, west: 66.0, north: 59.5, east: 88.0 },
  { south: 51.0, west: 88.0, north: 58.5, east: 116.0 },
  { south: 43.0, west: 128.0, north: 55.5, east: 142.0 },
  // Ямал, Ненецкий АО, север Коми (Салехард, Новый Уренгой, Воркута, Нарьян-Мар)
  { south: 62.0, west: 45.0, north: 68.5, east: 78.0 },
  // Таймыр / Норильск
  { south: 68.0, west: 85.0, north: 71.0, east: 93.0 },
  // Якутия (Якутск, Мирный, Нерюнгри, Ленск + арктическое побережье)
  { south: 55.5, west: 105.0, north: 73.5, east: 145.0 },
  // Магаданская область
  { south: 59.0, west: 145.0, north: 63.5, east: 156.5 },
  // Камчатка + Корякия
  { south: 50.0, west: 155.0, north: 62.5, east: 168.0 },
  // Чукотка (основная часть, до антимеридиана)
  { south: 62.0, west: 168.0, north: 70.5, east: 180.0 },
  // Чукотка за антимеридианом (о. Врангеля, Уэлен, восточная оконечность)
  { south: 64.0, west: -180.0, north: 71.5, east: -168.5 },
  // Сахалин
  { south: 45.5, west: 141.5, north: 54.7, east: 145.0 },
];

// ---------------------------------------------------------------------------
// Утилиты
// ---------------------------------------------------------------------------

const roundCoord = (n) => Number(n.toFixed(6));

function stableSyntheticOsmId(row) {
  const input = [row?.lat, row?.lon, row?.brand, row?.name, row?.addr].join("|");
  const hash = createHash("sha256").update(input).digest("hex").slice(0, 12);
  return SYNTHETIC_BASE + (Number.parseInt(hash, 16) % 8_000_000_000);
}

function osmIdFor(row) {
  const s = String(row?.osm_id || "").trim();
  if (/^\d+$/.test(s)) return Number(s);
  const m = s.match(/^osm-(\d+)$/);
  if (m) return Number(m[1]);
  return stableSyntheticOsmId(row);
}

function tilesFor({ south, west, north, east }) {
  const tiles = [];
  for (let lat = south; lat < north; lat += TILE_LAT) {
    const lat2 = Math.min(lat + TILE_LAT, north);
    for (let lon = west; lon < east; lon += TILE_LON) {
      const lon2 = Math.min(lon + TILE_LON, east);
      tiles.push({
        south: roundCoord(lat),
        west: roundCoord(lon),
        north: roundCoord(lat2),
        east: roundCoord(lon2),
      });
    }
  }
  return tiles;
}

// Счётчик тайлов, для которых не удалось получить данные ни одной попыткой
// (в т.ч. с прокси). Раньше такие тайлы молча превращались в [] и терялись
// в общей сводке — станции внутри них просто никогда не появлялись в БД без
// единой явной ошибки. Сбрасывается в начале runSync(), читается в конце.
let tilesFailedCount = 0;

/** Запрос одного тайла. Возвращает массив станций. */
export async function fetchTile(tile, depth = 0) {
  const { south, west, north, east } = tile;
  const url = `${API_BASE}?lat1=${south}&lon1=${west}&lat2=${north}&lon2=${east}`;

  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    // Новый прокси на каждую попытку: если текущий заблокирован/протух,
    // повтор автоматически пойдёт через следующий из пула.
    const proxyUrl = nextProxy();
    try {
      const res = await requestJson(url, controller.signal, proxyUrl);

      await waitAfterResponse(res, responseDelayForTransport(res.transport));

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = res.data;

      if (data && !Array.isArray(data) && data.detail === "bbox_too_large") {
        if (depth > 6) {
          console.warn(`  bbox_too_large на макс. глубине, пропуск тайла ${url}`);
          tilesFailedCount++;
          return [];
        }
        const midLat = roundCoord((south + north) / 2);
        const midLon = roundCoord((west + east) / 2);
        const sub = [
          { south, west, north: midLat, east: midLon },
          { south, west: midLon, north: midLat, east },
          { south: midLat, west, north, east: midLon },
          { south: midLat, west: midLon, north, east },
        ];
        const out = [];
        for (const s of sub) {
          await sleep(HTTP_RESPONSE_DELAY_MS);
          out.push(...(await fetchTile(s, depth + 1)));
        }
        return out;
      }

      if (!Array.isArray(data)) return [];
      return data;
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  console.warn(
    `  Не удалось получить тайл после ${MAX_RETRIES} попыток (${describeFetchError(lastErr)}): ${url}`
  );
  tilesFailedCount++;
  return [];
}

// ---------------------------------------------------------------------------
// Основная логика синка (экспортируется для cron-роута)
// ---------------------------------------------------------------------------

export async function runSync({ log = console.log } = {}) {
  const pool = getPool();
  const russia = await loadRussiaPolygon();
  tilesFailedCount = 0;

  if (PROXY_POOL.length > 0) {
    log(`Прокси: ${PROXY_POOL.length} шт. в пуле, ротация round-robin по попыткам запроса тайла`);
  }

  try {
    let tiles = [];
    const bboxEnv = process.env.SYNC_BBOX?.trim();
    if (bboxEnv) {
      const p = bboxEnv.split(",").map(Number);
      if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) {
        throw new Error(`Неверный SYNC_BBOX (ожидается "south,west,north,east"): ${bboxEnv}`);
      }
      const requestedTiles = tilesFor({ south: p[0], west: p[1], north: p[2], east: p[3] });
      tiles = requestedTiles.filter((tile) => tileTouchesRussia(tile, russia));
      log(`Режим SYNC_BBOX: ${bboxEnv} → тайлов: ${tiles.length}/${requestedTiles.length}`);
    } else {
      for (const r of MACRO_REGIONS) {
        const baseTiles = tilesFor(r);
        const selectedTiles = DENSITY_MODE === "full" ? baseTiles : baseTiles.filter((_, i) => i % 4 === 0);
        tiles.push(...selectedTiles);
      }
      const beforeFilter = tiles.length;
      tiles = tiles.filter((tile) => tileTouchesRussia(tile, russia));
      const removedTiles = beforeFilter - tiles.length;
      const modeLabel = DENSITY_MODE === "full" ? "Полный" : "Выборочный";
      log(`${modeLabel} обход РФ: макро-регионов ${MACRO_REGIONS.length}, тайлов ${tiles.length}, отброшено по границе: ${removedTiles}`);
    }

    const byOsm = new Map();
    let tilesFetched = 0;
    let rawRows = 0;
    let filteredOutside = 0;
    let nextTileIndex = 0;
    const workerCount = Math.min(SYNC_CONCURRENCY, tiles.length);
    if (workerCount > 1) {
      log(`Параллелизм: ${workerCount} воркера, транспорты: ${FETCH_TRANSPORTS.join(",")}`);
    }

    async function processTile(tile) {
      const rows = await fetchTile(tile);
      tilesFetched++;
      rawRows += rows.length;
      for (const r of rows) {
        if (!r || r.lat == null || r.lon == null) continue;
        const lat = Number(r.lat);
        const lon = Number(r.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        if (!pointInRussia([lon, lat], russia)) {
          filteredOutside++;
          continue;
        }
        const key2 = r.osm_id != null ? String(r.osm_id) : `${r.lat},${r.lon}`;
        const prev = byOsm.get(key2);
        if (!prev || (!prev.status && r.status)) byOsm.set(key2, r);
      }
      if (tilesFetched % 10 === 0 || tilesFetched === tiles.length) {
        log(`Тайлы: ${tilesFetched}/${tiles.length}, станций собрано: ${byOsm.size}`);
      }
    }

    const workers = Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = nextTileIndex++;
        if (index >= tiles.length) return;
        await processTile(tiles[index]);
      }
    });
    await Promise.all(workers);
    log(`Получено строк: ${rawRows}, вне РФ отфильтровано: ${filteredOutside}, уникальных станций: ${byOsm.size}`);

    const stationRows = [];
    const osmIds = [];
    const meta = [];
    for (const r of byOsm.values()) {
      const osm_id = osmIdFor(r);
      osmIds.push(osm_id);
      const brand = (r.brand || "").trim() || null;
      const name = (r.name || "").trim() || brand || "АЗС";
      stationRows.push({
        name,
        brand,
        lat: r.lat,
        lng: r.lon,
        address: (r.addr || "").trim() || null,
        source: "osm",
        osm_id,
        // Исходный id на gdebenz.ru (числовой или "usr_...") — отдельно от
        // нашего bigint osm_id, который для "usr_..." станций синтетический
        // и не годится для запроса gdebenz API. Нужен для
        // scripts/sync-gdebenz-comments.mjs.
        gdebenz_id: r.osm_id != null ? String(r.osm_id) : null,
      });
      meta.push({ osm_id, status: r.status, fuels_now: r.fuels_now });
    }

    let upserted = 0;
    for (let i = 0; i < stationRows.length; i += BATCH) {
      const chunk = stationRows.slice(i, i + BATCH);
      await withRetry(
        () =>
          pool.query(
            `insert into public.stations (name, brand, lat, lng, address, source, osm_id, gdebenz_id)
             select x.name, x.brand, x.lat, x.lng, x.address, x.source, x.osm_id, x.gdebenz_id
             from jsonb_to_recordset($1::jsonb) as x(
               name text, brand text, lat double precision, lng double precision,
               address text, source text, osm_id bigint, gdebenz_id text
             )
             on conflict (osm_id) do update set
               name = excluded.name,
               brand = excluded.brand,
               lat = excluded.lat,
               lng = excluded.lng,
               address = excluded.address,
               gdebenz_id = excluded.gdebenz_id`,
            [JSON.stringify(chunk)]
          ),
        { label: "stations upsert" }
      );
      upserted += chunk.length;
      log(`Станции upsert: ${upserted}/${stationRows.length}`);
    }

    const osmToUuid = new Map();
    for (let i = 0; i < osmIds.length; i += SELECT_CHUNK) {
      const slice = osmIds.slice(i, i + SELECT_CHUNK);
      const { rows } = await withRetry(
        () => pool.query(`select id, osm_id from public.stations where osm_id = any($1::bigint[])`, [slice]),
        { label: "stations select" }
      );
      for (const row of rows) osmToUuid.set(Number(row.osm_id), row.id);
    }
    log(`Сопоставлено станций: ${osmToUuid.size}`);

    // Чистим только по-настоящему устаревшие строки (>2 суток) — они уже вне
    // окна свежести (3ч) и вне окна выборки карты (24ч), так что удаление не
    // влияет на текущий статус, только на размер таблицы. Раньше здесь стоял
    // безусловный delete по client_id='gdebenz' перед каждой вставкой — при
    // узком SYNC_BBOX (см. cron-роут) он сносил отчёты по всей России, а
    // вставлялись новые только для станций текущего охвата, из-за чего все
    // остальные регионы мгновенно "теряли" данные после каждого точечного синка.
    {
      const cutoffIso = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      await withRetry(
        () =>
          pool.query(`delete from public.reports where client_id = 'gdebenz' and created_at < $1`, [
            cutoffIso,
          ]),
        { label: "reports cleanup" }
      );
    }

    // Предыдущее состояние gdebenz-отчёта по каждой станции (после миграции
    // 0006_gdebenz_dedupe.sql и логики ниже на станцию должна приходиться
    // максимум одна строка client_id='gdebenz' — берём самую свежую, если
    // где-то ещё остался дубль). Нужно, чтобы не пересоздавать отчёт (и не
    // сбрасывать "свежесть" на карте) для станций, где статус/очередь/топливо
    // по факту не изменились с прошлого прогона синка.
    const prevByStation = new Map();
    {
      const stationIds = [...osmToUuid.values()];
      for (let i = 0; i < stationIds.length; i += SELECT_CHUNK) {
        const slice = stationIds.slice(i, i + SELECT_CHUNK);
        const { rows } = await withRetry(
          () =>
            pool.query(
              `select id, station_id, status, queue, fuel_types, created_at
               from public.reports
               where client_id = 'gdebenz' and station_id = any($1::uuid[])
               order by created_at desc`,
              [slice]
            ),
          { label: "reports prev-state select" }
        );
        for (const row of rows) {
          if (!prevByStation.has(row.station_id)) prevByStation.set(row.station_id, row);
        }
      }
      log(`Предыдущих gdebenz-отчётов найдено: ${prevByStation.size}`);
    }

    const fuelsKey = (list) => [...list].sort().join(",");

    const nowIso = new Date().toISOString();
    const newRows = [];
    const changedRows = [];
    let unchangedCount = 0;
    let unknownStatusCount = 0;
    const unknownStatusSamples = new Set();
    for (const m of meta) {
      const mapped = mapGdebenzStatus(m.status);
      if (!mapped) {
        if (m.status) {
          unknownStatusCount++;
          unknownStatusSamples.add(String(m.status));
        }
        continue;
      }
      const uuid = osmToUuid.get(m.osm_id);
      if (!uuid) continue;
      const fuel_types = parseFuels(m.fuels_now);
      const prev = prevByStation.get(uuid);
      if (
        prev &&
        prev.status === mapped.status &&
        prev.queue === mapped.queue &&
        fuelsKey(prev.fuel_types) === fuelsKey(fuel_types)
      ) {
        // Ничего не изменилось с прошлого прогона — оставляем существующую
        // строку как есть, чтобы её created_at (а значит и "свежесть" на
        // карте) не переписывался без реальной причины.
        unchangedCount++;
        continue;
      }
      const row = {
        station_id: uuid,
        status: mapped.status,
        fuel_types,
        queue: mapped.queue,
        confirms: 0,
        client_id: "gdebenz",
        created_at: nowIso,
      };
      if (prev) changedRows.push({ ...row, id: prev.id });
      else newRows.push(row);
    }
    if (unknownStatusCount > 0) {
      log(
        `Внимание: ${unknownStatusCount} станций с неизвестным статусом gdebenz пропущено (значения: ${[...unknownStatusSamples].join(", ")})`
      );
    }
    log(
      `Статусы: без изменений ${unchangedCount}, изменилось ${changedRows.length}, новых ${newRows.length}`
    );

    let reportsInserted = 0;
    for (let i = 0; i < newRows.length; i += BATCH) {
      const chunk = newRows.slice(i, i + BATCH);
      await withRetry(
        () =>
          pool.query(
            `insert into public.reports (station_id, status, fuel_types, queue, confirms, client_id, created_at)
             select x.station_id, x.status, x.fuel_types, x.queue, x.confirms, x.client_id, x.created_at
             from jsonb_to_recordset($1::jsonb) as x(
               station_id uuid, status text, fuel_types text[], queue text,
               confirms int, client_id text, created_at timestamptz
             )`,
            [JSON.stringify(chunk)]
          ),
        { label: "reports insert" }
      );
      reportsInserted += chunk.length;
      log(`Статусы insert: ${reportsInserted}/${newRows.length}`);
    }

    // Обновление на месте по первичному ключу id — тот же jsonb-batch приём,
    // что и в public.bulk_update_last_report_at (db/schema.sql): один запрос
    // на пачку вместо отдельного UPDATE на строку.
    let reportsUpdated = 0;
    for (let i = 0; i < changedRows.length; i += BATCH) {
      const chunk = changedRows.slice(i, i + BATCH);
      await withRetry(
        () =>
          pool.query(
            `update public.reports r set
               status = x.status,
               fuel_types = x.fuel_types,
               queue = x.queue,
               confirms = x.confirms,
               created_at = x.created_at
             from jsonb_to_recordset($1::jsonb) as x(
               id uuid, status text, fuel_types text[], queue text,
               confirms int, created_at timestamptz
             )
             where r.id = x.id`,
            [JSON.stringify(chunk)]
          ),
        { label: "reports update" }
      );
      reportsUpdated += chunk.length;
      log(`Статусы update: ${reportsUpdated}/${changedRows.length}`);
    }

    const summary = {
      tilesFetched,
      tilesFailed: tilesFailedCount,
      rawRows,
      filteredOutside,
      uniqueStations: byOsm.size,
      stationsUpserted: upserted,
      mapped: osmToUuid.size,
      reportsInserted,
      reportsUpdated,
      reportsUnchanged: unchangedCount,
      unknownStatusCount,
    };
    log(
      `Готово. Тайлов: ${tilesFetched}, станций upsert: ${upserted}, статусов вставлено: ${reportsInserted}, обновлено: ${reportsUpdated}, без изменений: ${unchangedCount}.`
    );
    if (tilesFailedCount > 0) {
      log(
        `Внимание: ${tilesFailedCount}/${tiles.length} тайлов не удалось получить ни одной попыткой — станции внутри них не попали в этот прогон. ` +
          (PROXY_POOL.length > 0
            ? `Проверьте живость прокси в пуле.`
            : `Если это регулярно — вероятна блокировка/троттлинг по IP на стороне gdebenz.ru, попробуйте PROXY_URL/PROXY_LIST (см. SYNC.md).`)
      );
    }
    return summary;
  } finally {
    await closeTransports();
    await closePool();
  }
}

let isMain;
try {
  isMain = process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`;
} catch {
  isMain = false;
}

if (isMain || process.argv[1]?.endsWith("sync-gdebenz.mjs")) {
  const argBbox = process.argv
    .slice(2)
    .map((a) => (a.startsWith("--bbox=") ? a.slice("--bbox=".length) : a))
    .find((a) => a && !a.startsWith("-"));
  if (argBbox) process.env.SYNC_BBOX = argBbox.trim();

  runSync().catch((e) => {
    console.error("Ошибка синка:", e.message);
    process.exit(1);
  });
}
