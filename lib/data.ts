import { unstable_cache } from "next/cache";
import { aggregateStation, PRICE_MAX_AGE_MS, type LatestPriceReport } from "./freshness";
import { bboxCacheKey } from "./bbox";
import { dedupeStationsByLocation } from "./stationDedup";
import { getDb, isDbConfigured } from "./db";
import {
  addDemoReport,
  confirmDemoPrice,
  confirmDemoReport,
  getDemoReports,
  getRegisteredInBBox,
  registerStations,
  seedSampleReportsIfEmpty,
} from "./demo-store";
import { fetchFuelStations } from "./osm";
import type {
  BBox,
  CreateReportPayload,
  FuelPrices,
  Report,
  ReportForStatus,
  Station,
  StationStatus,
} from "./types";

// Слой доступа к данным. Прозрачно переключается между локальным Postgres
// (если настроен DATABASE_URL) и демо-хранилищем в памяти.

const STATION_COLS = "id,name,brand,lat,lng,address,source";
const REPORT_STATUS_COLS =
  "id,station_id,status,fuel_types,limit_liters,queue,prices,confirms,created_at";
const REPORT_FULL_COLS =
  "id,station_id,status,fuel_types,limit_liters,queue,prices,comment,photo_url,confirms,canister,price_confirms,created_at";

// Общий кэш bbox → станции на весь процесс (не per-request!). Деплой —
// standalone-процесс на одной VPS (не serverless с изолированными
// инстансами), поэтому обычный Map в памяти процесса уже даёт тот же эффект,
// что и внешний Redis, но без отдельного процесса и его памяти — все запросы
// от всех пользователей обслуживает один и тот же процесс.
// Кэшируется сам Promise, а не только результат: если несколько одинаковых
// bbox-запросов (от разных пользователей или от повторного панорамирования)
// прилетают, пока первый ещё не отработал, все они получают один и тот же
// промис вместо параллельных походов в БД (request coalescing).
// VPS в проде — 2 ГБ RAM (на ней же ещё pmtiles serve 13 ГБ тайлов и nginx),
// а один плотный город (Москва — 1000+ станций) может весить больше 1 МБ на
// запись, поэтому лимит по числу записей держим маленьким.
const STATIONS_CACHE_TTL_MS = 15_000;
const STATIONS_CACHE_MAX_ENTRIES = 100;
const stationsCache = new Map<string, { at: number; promise: Promise<StationStatus[]> }>();

function invalidateStationsCache(): void {
  stationsCache.clear();
}

function getCachedStations(
  bbox: BBox,
  limit: number,
  loader: () => Promise<StationStatus[]>
): Promise<StationStatus[]> {
  const key = `${bboxCacheKey(bbox)}:${limit}`;
  const now = Date.now();

  const cached = stationsCache.get(key);
  if (cached && now - cached.at < STATIONS_CACHE_TTL_MS) {
    return cached.promise;
  }

  for (const [k, entry] of stationsCache) {
    if (now - entry.at > STATIONS_CACHE_TTL_MS) stationsCache.delete(k);
  }
  stationsCache.delete(key);
  while (stationsCache.size >= STATIONS_CACHE_MAX_ENTRIES) {
    const oldestKey = stationsCache.keys().next().value;
    if (oldestKey === undefined) break;
    stationsCache.delete(oldestKey);
  }

  // Провалившийся запрос не должен "застревать" закэшированным на 15с — следующий
  // запрос должен получить шанс повторить попытку сразу же.
  const promise = loader().catch((err) => {
    stationsCache.delete(key);
    throw err;
  });
  stationsCache.set(key, { at: now, promise });
  return promise;
}

// Заправки + агрегированный статус в пределах bbox.
// limit — защита от аномально широкого bbox, а не способ ограничить плотный
// город: Москва в одном экране (DEFAULT_BBOX) — уже 1000+ станций, старый
// лимит 500 без сортировки молча резал больше половины из них. Кластеризация
// маркеров на клиенте (MapLibreMapView) рассчитана на тысячи точек, так что
// сама по себе большая выборка не проблема.
export async function getStationsWithStatus(
  bbox: BBox,
  limit = 3000
): Promise<StationStatus[]> {
  if (!isDbConfigured()) {
    // Демо-режим. Краснодар уже зарегистрирован (bundled из OSM).
    let known = getRegisteredInBBox(bbox, limit);

    if (known.length > 0) {
      // Есть данные по области — отдаём сразу, а свежие из OSM подтягиваем
      // в фоне для следующего запроса (не блокируем ответ).
      void fetchFuelStations(bbox)
        .then((list) => registerStations(list))
        .catch(() => {});
    } else {
      // Нет данных — пытаемся загрузить из OSM синхронно.
      try {
        const fetched = await fetchFuelStations(bbox);
        registerStations(fetched);
      } catch {
        // OSM недоступен — оставляем что есть (возможно, пусто)
      }
      known = getRegisteredInBBox(bbox, limit);
    }

    seedSampleReportsIfEmpty(known.map((s) => s.id));
    const ids = known.map((s) => s.id);
    const byStation = groupReports(getDemoReports(ids));
    const priceMap = await getLatestPricesByIds(ids);
    return dedupeStationsByLocation(
      known.map((s) =>
        aggregateStation(s, byStation.get(s.id) ?? [], Date.now(), priceMap.get(s.id) ?? null)
      )
    );
  }

  const db = getDb();
  if (!db) return [];

  return getCachedStations(bbox, limit, async () => {
    const [south, west, north, east] = bbox;
    // Заправки в пределах bbox.
    const { rows: list }: { rows: Station[] } = await db.query<Station>(
      `select ${STATION_COLS} from public.stations
       where lat >= $1 and lat <= $2 and lng >= $3 and lng <= $4
       limit $5`,
      [south, north, west, east, limit]
    );
    if (list.length === 0) return [];

    // Свежие отчёты для этих заправок. В отличие от PostgREST, у обычного
    // параметризованного `= any($1::uuid[])` нет ограничения на длину URL,
    // так что чанкинг по id (как было нужно раньше) больше не требуется.
    const ids = list.map((s) => s.id);
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // Без comment/photo_url — они не нужны для агрегации статуса на карте,
    // только для ленты отчётов конкретной АЗС (см. getStationReports).
    const [{ rows: reports }, priceMap] = await Promise.all([
      db.query<ReportForStatus>(
        `select ${REPORT_STATUS_COLS} from public.reports
         where station_id = any($1::uuid[]) and created_at >= $2
         order by created_at desc`,
        [ids, sinceIso]
      ),
      getLatestPricesByIds(ids),
    ]);

    const byStation = groupReports(reports);
    return dedupeStationsByLocation(
      list.map((s) =>
        aggregateStation(s, byStation.get(s.id) ?? [], Date.now(), priceMap.get(s.id) ?? null)
      )
    );
  });
}

// Поиск станций по подстроке в названии/бренде/адресе — без привязки к bbox
// (для фида ботов: "найди АЗС по названию").
export async function searchStationsByName(
  query: string,
  limit = 30
): Promise<StationStatus[]> {
  const q = query.trim();
  if (!q) return [];

  if (!isDbConfigured()) {
    const needle = q.toLowerCase();
    const all = getRegisteredInBBox([-90, -180, 90, 180], 5000);
    const matched = all
      .filter(
        (s) =>
          s.name.toLowerCase().includes(needle) ||
          (s.brand ?? "").toLowerCase().includes(needle) ||
          (s.address ?? "").toLowerCase().includes(needle)
      )
      .slice(0, limit);
    if (matched.length === 0) return [];
    seedSampleReportsIfEmpty(matched.map((s) => s.id));
    const matchedIds = matched.map((s) => s.id);
    const byStation = groupReports(getDemoReports(matchedIds));
    const priceMap = await getLatestPricesByIds(matchedIds);
    return matched.map((s) =>
      aggregateStation(s, byStation.get(s.id) ?? [], Date.now(), priceMap.get(s.id) ?? null)
    );
  }

  const db = getDb();
  if (!db) return [];

  // Экранируем спецсимволы LIKE, чтобы буквальные % и _ в запросе
  // не вели себя как wildcard.
  const pattern = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  const { rows: list }: { rows: Station[] } = await db.query<Station>(
    `select ${STATION_COLS} from public.stations
     where name ilike $1 or brand ilike $1 or address ilike $1
     limit $2`,
    [pattern, limit]
  );
  if (list.length === 0) return [];

  const ids = list.map((s) => s.id);
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ rows: reports }, priceMap] = await Promise.all([
    db.query<ReportForStatus>(
      `select ${REPORT_STATUS_COLS} from public.reports
       where station_id = any($1::uuid[]) and created_at >= $2
       order by created_at desc`,
      [ids, sinceIso]
    ),
    getLatestPricesByIds(ids),
  ]);

  const byStation = groupReports(reports);
  return dedupeStationsByLocation(
    list.map((s) =>
      aggregateStation(s, byStation.get(s.id) ?? [], Date.now(), priceMap.get(s.id) ?? null)
    )
  );
}

// Заправки по списку id (для избранного — без привязки к bbox карты).
export async function getStationsByIds(ids: string[]): Promise<StationStatus[]> {
  const unique = [...new Set(ids)].filter(Boolean).slice(0, 50);
  if (unique.length === 0) return [];

  if (!isDbConfigured()) {
    const known = getRegisteredInBBox([-90, -180, 90, 180], 5000).filter((s) =>
      unique.includes(s.id)
    );
    seedSampleReportsIfEmpty(known.map((s) => s.id));
    const knownIds = known.map((s) => s.id);
    const byStation = groupReports(getDemoReports(knownIds));
    const priceMap = await getLatestPricesByIds(knownIds);
    return unique
      .map((id) => known.find((s) => s.id === id))
      .filter((s): s is Station => Boolean(s))
      .map((s) =>
        aggregateStation(s, byStation.get(s.id) ?? [], Date.now(), priceMap.get(s.id) ?? null)
      );
  }

  const db = getDb();
  if (!db) return [];

  const { rows: stations }: { rows: Station[] } = await db.query<Station>(
    `select ${STATION_COLS} from public.stations where id = any($1::uuid[])`,
    [unique]
  );
  if (stations.length === 0) return [];

  const stationIds = stations.map((s) => s.id);
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ rows: reports }, priceMap] = await Promise.all([
    db.query<ReportForStatus>(
      `select ${REPORT_STATUS_COLS} from public.reports
       where station_id = any($1::uuid[]) and created_at >= $2
       order by created_at desc`,
      [stationIds, sinceIso]
    ),
    getLatestPricesByIds(stationIds),
  ]);

  const byStation = groupReports(reports);
  const byId = new Map(stations.map((s) => [s.id, s]));
  return unique
    .map((id) => byId.get(id))
    .filter((s): s is Station => Boolean(s))
    .map((s) =>
      aggregateStation(s, byStation.get(s.id) ?? [], Date.now(), priceMap.get(s.id) ?? null)
    );
}

// Кэшированная выборка заправок города для SEO-страницы /azs/[city].
// Тяжёлый запрос (~900мс на холодный рендер) кэшируется по slug города на 5
// минут, поэтому повторные заходы не бьют в БД заново. Тег
// `city-stations:<slug>` позволяет точечно сбросить кэш при необходимости.
export function getCityStationsCached(
  slug: string,
  bbox: BBox,
  limit = 60
): Promise<StationStatus[]> {
  return unstable_cache(
    () => getStationsWithStatus(bbox, limit),
    ["city-stations", slug],
    { revalidate: 300, tags: [`city-stations:${slug}`] }
  )();
}

// Лента отчётов одной заправки.
export async function getStationReports(
  stationId: string,
  limit = 30
): Promise<Report[]> {
  if (!isDbConfigured()) {
    return getDemoReports([stationId]).slice(0, limit);
  }
  const db = getDb();
  if (!db) return [];
  const { rows } = await db.query<Report>(
    `select ${REPORT_FULL_COLS} from public.reports
     where station_id = $1
     order by created_at desc
     limit $2`,
    [stationId, limit]
  );
  return rows;
}

// Создание отчёта.
export async function createReport(
  payload: CreateReportPayload,
  clientId: string
): Promise<Report> {
  if (!isDbConfigured()) {
    return addDemoReport(payload);
  }
  const db = getDb();
  if (!db) throw new Error("Database unavailable");
  const { rows } = await db.query<Report>(
    `insert into public.reports
       (station_id, status, fuel_types, limit_liters, queue, prices, comment, photo_url, canister, client_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning ${REPORT_FULL_COLS}`,
    [
      payload.station_id,
      payload.status,
      payload.fuel_types,
      payload.limit_liters ?? null,
      payload.queue,
      payload.prices ?? null,
      payload.comment ?? null,
      payload.photo_url ?? null,
      Boolean(payload.canister),
      clientId,
    ]
  );
  invalidateStationsCache();
  return rows[0];
}

// Подтверждение отчёта (увеличивает вес).
// Дедуп: один client_id — одно подтверждение на отчёт (таблица report_confirms).
export async function confirmReport(
  reportId: string,
  clientId: string
): Promise<boolean> {
  if (!isDbConfigured()) {
    return Boolean(confirmDemoReport(reportId));
  }
  const db = getDb();
  if (!db) return false;

  // Пытаемся зафиксировать факт подтверждения. Конфликт по PK
  // (report_id, client_id) — код 23505 в обычном Postgres, как и раньше через
  // supabase-js — означает, что клиент уже подтверждал, не инкрементим.
  try {
    await db.query(
      `insert into public.report_confirms (report_id, client_id) values ($1, $2)`,
      [reportId, clientId]
    );
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return false; // уже подтверждал
    throw err;
  }

  // Атомарный инкремент через функцию БД.
  await db.query(`select public.increment_confirms($1)`, [reportId]);
  invalidateStationsCache();
  return true;
}

// Подтверждение цены отчёта ("цена верна" — E3). Отдельная дедуп-таблица от
// confirmReport: подтверждение цены семантически не то же, что подтверждение
// всего отчёта (статус+очередь+топливо+цена одним пакетом).
export async function confirmPrice(
  reportId: string,
  clientId: string
): Promise<boolean> {
  if (!isDbConfigured()) {
    return Boolean(confirmDemoPrice(reportId));
  }
  const db = getDb();
  if (!db) return false;

  try {
    await db.query(
      `insert into public.report_price_confirms (report_id, client_id) values ($1, $2)`,
      [reportId, clientId]
    );
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return false; // уже подтверждал
    throw err;
  }

  await db.query(`select public.increment_price_confirms($1)`, [reportId]);
  invalidateStationsCache();
  return true;
}

// Кол-во подтверждений цены с одного client_id за последние minutes минут (rate-limit).
export async function countRecentPriceConfirms(
  clientId: string,
  minutes = 5
): Promise<number> {
  if (!isDbConfigured()) return 0;
  const db = getDb();
  if (!db) return 0;
  const sinceIso = new Date(Date.now() - minutes * 60000).toISOString();
  const { rows } = await db.query<{ count: number }>(
    `select count(*)::int as count from public.report_price_confirms
     where client_id = $1 and created_at >= $2`,
    [clientId, sinceIso]
  );
  return rows[0]?.count ?? 0;
}

// Кол-во подтверждений с одного client_id за последние minutes минут (rate-limit).
export async function countRecentConfirms(
  clientId: string,
  minutes = 5
): Promise<number> {
  if (!isDbConfigured()) return 0;
  const db = getDb();
  if (!db) return 0;
  const sinceIso = new Date(Date.now() - minutes * 60000).toISOString();
  const { rows } = await db.query<{ count: number }>(
    `select count(*)::int as count from public.report_confirms
     where client_id = $1 and created_at >= $2`,
    [clientId, sinceIso]
  );
  return rows[0]?.count ?? 0;
}

// Кол-во отчётов с одного client_id за последние minutes минут (rate-limit).
export async function countRecentReports(
  clientId: string,
  minutes = 5
): Promise<number> {
  if (!isDbConfigured()) {
    // В демо-режиме rate-limit не критичен.
    return 0;
  }
  const db = getDb();
  if (!db) return 0;
  const sinceIso = new Date(Date.now() - minutes * 60000).toISOString();
  const { rows } = await db.query<{ count: number }>(
    `select count(*)::int as count from public.reports
     where client_id = $1 and created_at >= $2`,
    [clientId, sinceIso]
  );
  return rows[0]?.count ?? 0;
}

// Цена — отдельная история от общей агрегации статуса (см. aggregateStation
// в lib/freshness.ts): отчётов с ценой намного меньше, чем отчётов вообще,
// поэтому вместо усреднения в окне свежести статуса берём цены из самого
// свежего отчёта станции с непустым prices — но не старше PRICE_MAX_AGE_MS
// (7 дней), чтобы не показывать явно устаревшую цену.
function pickLatestPrices(
  reports: {
    id: string;
    station_id: string;
    prices: FuelPrices | null;
    price_confirms: number;
    created_at: string;
  }[],
  now: number
): Map<string, LatestPriceReport> {
  const map = new Map<string, LatestPriceReport>();
  for (const r of reports) {
    if (map.has(r.station_id)) continue;
    if (now - new Date(r.created_at).getTime() > PRICE_MAX_AGE_MS) continue;
    if (r.prices && Object.keys(r.prices).length > 0) {
      map.set(r.station_id, {
        id: r.id,
        prices: r.prices,
        created_at: r.created_at,
        price_confirms: r.price_confirms,
      });
    }
  }
  return map;
}

async function getLatestPricesByIds(
  ids: string[]
): Promise<Map<string, LatestPriceReport>> {
  if (ids.length === 0) return new Map();
  const now = Date.now();

  if (!isDbConfigured()) {
    // getDemoReports уже отсортированы по убыванию created_at.
    return pickLatestPrices(getDemoReports(ids), now);
  }

  const db = getDb();
  if (!db) return new Map();
  const priceSinceIso = new Date(now - PRICE_MAX_AGE_MS).toISOString();
  const { rows } = await db.query<{
    id: string;
    station_id: string;
    prices: FuelPrices;
    price_confirms: number;
    created_at: string;
  }>(
    `select distinct on (station_id) id, station_id, prices, price_confirms, created_at
     from public.reports
     where station_id = any($1::uuid[]) and prices is not null and created_at >= $2
     order by station_id, created_at desc`,
    [ids, priceSinceIso]
  );
  return pickLatestPrices(rows, now);
}

function groupReports(reports: ReportForStatus[]): Map<string, ReportForStatus[]> {
  const map = new Map<string, ReportForStatus[]>();
  for (const r of reports) {
    const arr = map.get(r.station_id);
    if (arr) arr.push(r);
    else map.set(r.station_id, [r]);
  }
  return map;
}

// Пользовательская заправка (долгое нажатие на карте).
export async function createUserStation(
  input: {
    lat: number;
    lng: number;
    name: string;
    brand: string | null;
  },
  _clientId: string
): Promise<Station> {
  const name = input.name.trim().slice(0, 120) || "Заправка";
  const brand = input.brand?.trim().slice(0, 80) || null;

  if (!isDbConfigured()) {
    const id = `user-${Date.now().toString(36)}`;
    const station: Station = {
      id,
      name,
      brand,
      lat: input.lat,
      lng: input.lng,
      address: null,
      source: "user",
    };
    registerStations([station]);
    return station;
  }

  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const { rows } = await db.query<Station>(
    `insert into public.stations (name, brand, lat, lng, address, source)
     values ($1, $2, $3, $4, null, 'user')
     returning ${STATION_COLS}`,
    [name, brand, input.lat, input.lng]
  );
  invalidateStationsCache();
  return rows[0];
}
