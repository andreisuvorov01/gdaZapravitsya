import type { BBox, CreateReportPayload, FuelPrices, FuelStatus, FuelType, QueueLevel, Report, Station } from "./types";
import krasnodarData from "./regions/krasnodar.json";
import stationsData from "./regions/stations.json";
import seedReportsData from "./regions/seed-reports.json";

interface SeedReport {
  station_id: string;
  status: FuelStatus;
  fuel_types: string[];
  confirms: number;
  age_min: number;
}

// Демо-хранилище в памяти процесса. Используется, когда БД не
// настроен. Заправки подгружаются из OpenStreetMap (lib/osm.ts) и
// регистрируются здесь; отчёты хранятся в памяти и сбрасываются при
// перезапуске сервера.

// Реестр известных заправок (id -> станция). Наполняется из OSM.
const registry = new Map<string, Station>();

const reports: Report[] = [];
let idCounter = 1;
let sampleSeeded = false;

// Реальные заправки Краснодара (выгрузка из OpenStreetMap, bundled).
// Служат надёжной базой демо-режима и резервом, если Overpass недоступен.
export const KRASNODAR_FALLBACK: Station[] = krasnodarData as Station[];

// Основная выгрузка заправок (импорт из CSV, см. scripts/convert-stations.mjs).
export const BUNDLED_STATIONS: Station[] = stationsData as Station[];

// Сразу регистрируем bundled-данные, чтобы карта работала даже без сети.
registerStations(BUNDLED_STATIONS);
registerStations(KRASNODAR_FALLBACK);

// Правдоподобный уровень очереди для демо-отчёта.
// Реального поля очереди в посевной выгрузке нет, поэтому в демо-режиме
// выводим уровень из статуса наличия топлива детерминированно (по индексу),
// чтобы блок «Очередь сейчас» было на чём показать. На проде очередь приходит
// из настоящих отчётов пользователей.
function demoQueueFor(status: FuelStatus, index: number): QueueLevel {
  // Распределения по статусу: где топлива нет/мало — очередь вероятнее.
  const byStatus: Record<FuelStatus, QueueLevel[]> = {
    yes: ["none", "none", "small", "none"],
    low: ["small", "big", "small", "none"],
    no: ["big", "hours", "big", "small"],
    unknown: ["none"],
  };
  const variants = byStatus[status] ?? ["none"];
  return variants[index % variants.length];
}

// Правдоподобные базовые цены ₽/л для демо-режима (порядок величин РФ 2026).
const DEMO_BASE_PRICES: Record<FuelType, number> = {
  "АИ-92": 54.2,
  "АИ-95": 58.6,
  "АИ-98": 68.4,
  "АИ-100": 75.9,
  "ДТ": 62.1,
  "Газ": 27.8,
};

// Детерминированный разброс цен вокруг базовых — чтобы в демо-режиме были
// и дешёвые, и дорогие станции (для показа бейджа "дешевле/дороже рядом").
function demoPricesFor(
  status: FuelStatus,
  fuelTypes: FuelType[],
  index: number
): FuelPrices | null {
  if (status === "no" || fuelTypes.length === 0) return null;
  const jitterRub = (((index * 37) % 21) - 10) / 10; // -1.0..+1.0 ₽
  const prices: FuelPrices = {};
  for (const f of fuelTypes) {
    const base = DEMO_BASE_PRICES[f];
    if (!base) continue;
    prices[f] = Math.round((base + jitterRub) * 100) / 100;
  }
  return Object.keys(prices).length > 0 ? prices : null;
}

// Посевные отчёты из выгрузки: оживляют карту реальными статусами.
// age_min хранится относительно старта процесса, чтобы данные были «свежими».
(function seedFromBundle() {
  let i = 0;
  for (const sr of seedReportsData as SeedReport[]) {
    reports.push({
      id: `r${idCounter++}`,
      station_id: sr.station_id,
      status: sr.status,
      fuel_types: (sr.fuel_types as FuelType[]) ?? [],
      limit_liters: null,
      queue: demoQueueFor(sr.status, i++),
      prices: demoPricesFor(sr.status, (sr.fuel_types as FuelType[]) ?? [], i),
      comment: null,
      photo_url: null,
      confirms: sr.confirms ?? 0,
      canister: false,
      price_confirms: 0,
      created_at: minutesAgo(sr.age_min),
    });
  }
  if (reports.length > 0) sampleSeeded = true;
})();

function minutesAgo(min: number): string {
  return new Date(Date.now() - min * 60000).toISOString();
}

// Регистрирует заправки (без дублей).
export function registerStations(list: Station[]): void {
  for (const s of list) {
    if (!registry.has(s.id)) registry.set(s.id, s);
  }
}

function inBBox(s: Station, bbox: BBox): boolean {
  const [south, west, north, east] = bbox;
  return s.lat >= south && s.lat <= north && s.lng >= west && s.lng <= east;
}

export function getRegisteredInBBox(bbox: BBox, limit = 800): Station[] {
  const out: Station[] = [];
  for (const s of registry.values()) {
    if (inBBox(s, bbox)) {
      out.push(s);
      if (out.length >= limit) break;
    }
  }
  return out;
}

// Один раз подсевает примеры отчётов на несколько заправок, чтобы карта
// не была полностью серой при первом запуске.
export function seedSampleReportsIfEmpty(stationIds: string[]): void {
  if (sampleSeeded || reports.length > 0 || stationIds.length === 0) return;
  sampleSeeded = true;
  const samples = [
    { status: "yes", fuel_types: ["АИ-92", "АИ-95", "ДТ"], queue: "small", limit: null, age: 12 },
    { status: "low", fuel_types: ["АИ-95"], queue: "big", limit: 20, age: 25 },
    { status: "no", fuel_types: [], queue: "hours", limit: null, age: 40 },
    { status: "yes", fuel_types: ["АИ-92", "АИ-95", "АИ-98"], queue: "none", limit: null, age: 8 },
    { status: "low", fuel_types: ["АИ-92"], queue: "big", limit: 30, age: 55 },
  ] as const;
  const count = Math.min(samples.length, stationIds.length);
  for (let i = 0; i < count; i++) {
    const s = samples[i];
    reports.push({
      id: `r${idCounter++}`,
      station_id: stationIds[i],
      status: s.status,
      fuel_types: [...s.fuel_types],
      limit_liters: s.limit,
      queue: s.queue,
      prices: demoPricesFor(s.status, [...s.fuel_types], i),
      comment: null,
      photo_url: null,
      confirms: 0,
      canister: false,
      price_confirms: 0,
      created_at: minutesAgo(s.age),
    });
  }
}

export function getDemoReports(stationIds?: string[]): Report[] {
  const all = [...reports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  if (!stationIds) return all;
  const set = new Set(stationIds);
  return all.filter((r) => set.has(r.station_id));
}

// Отчёты старше окна свежести (см. FRESH_WINDOW_MS в lib/freshness.ts) не
// влияют на агрегацию статуса — без этого предела массив rows рос без
// ограничения в памяти dev-процесса на протяжении всей его жизни.
const REPORT_MAX_AGE_MS = 3 * 60 * 60_000;
const REPORT_MAX_COUNT = 2000;

export function addDemoReport(payload: CreateReportPayload): Report {
  const report: Report = {
    id: `r${idCounter++}`,
    station_id: payload.station_id,
    status: payload.status,
    fuel_types: payload.fuel_types ?? [],
    limit_liters: payload.limit_liters ?? null,
    queue: payload.queue,
    prices: payload.prices ?? null,
    comment: payload.comment ?? null,
    photo_url: payload.photo_url ?? null,
    confirms: 0,
    canister: Boolean(payload.canister),
    price_confirms: 0,
    created_at: new Date().toISOString(),
  };
  reports.unshift(report);
  const cutoff = Date.now() - REPORT_MAX_AGE_MS;
  while (
    reports.length > 0 &&
    new Date(reports[reports.length - 1].created_at).getTime() < cutoff
  ) {
    reports.pop();
  }
  if (reports.length > REPORT_MAX_COUNT) reports.length = REPORT_MAX_COUNT;
  return report;
}

export function confirmDemoReport(reportId: string): Report | null {
  const r = reports.find((x) => x.id === reportId);
  if (!r) return null;
  r.confirms += 1;
  return r;
}

export function confirmDemoPrice(reportId: string): Report | null {
  const r = reports.find((x) => x.id === reportId);
  if (!r) return null;
  r.price_confirms += 1;
  return r;
}
