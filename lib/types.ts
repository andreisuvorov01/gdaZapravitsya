// Общие типы данных приложения "Карта заправок РФ"

// Виды топлива
export type FuelType = "АИ-92" | "АИ-95" | "АИ-98" | "АИ-100" | "ДТ" | "Газ";

export const FUEL_TYPES: FuelType[] = [
  "АИ-92",
  "АИ-95",
  "АИ-98",
  "АИ-100",
  "ДТ",
  "Газ",
];

// Статус наличия топлива
export type FuelStatus = "yes" | "low" | "no" | "unknown";

export const STATUS_LABELS: Record<FuelStatus, string> = {
  yes: "Есть бензин",
  low: "Мало / лимит",
  no: "Нет топлива",
  unknown: "Нет данных",
};

// Короткие подписи для компактных бейджей (без обрезки по словам).
export const STATUS_SHORT: Record<FuelStatus, string> = {
  yes: "Есть",
  low: "Мало",
  no: "Нет",
  unknown: "Нет данных",
};

// Цвета статусов — насыщенные, читаемые на карте города и в UI.
export const STATUS_HEX: Record<FuelStatus, string> = {
  yes: "#00C853",
  low: "#FF9100",
  no: "#FF3D00",
  unknown: "#90A4AE",
};

// Цены на топливо, ₽/л, по видам топлива (не все виды обязательны).
export type FuelPrices = Partial<Record<FuelType, number>>;

// Порядок предпочтения при выборе "главной" цены для бейджа/сравнения —
// самые массовые виды топлива идут первыми.
export const PRICE_DISPLAY_ORDER: FuelType[] = [
  "АИ-92",
  "АИ-95",
  "ДТ",
  "АИ-98",
  "АИ-100",
  "Газ",
];

// Самая показательная цена станции: первый заполненный вид топлива
// по порядку предпочтения (не среднее — цены разных видов топлива
// нельзя усреднять напрямую).
export function bestPrice(
  prices: FuelPrices | null | undefined
): { fuel: FuelType; price: number } | null {
  if (!prices) return null;
  for (const fuel of PRICE_DISPLAY_ORDER) {
    const price = prices[fuel];
    if (typeof price === "number" && price > 0) return { fuel, price };
  }
  return null;
}

// Длина очереди
export type QueueLevel = "none" | "small" | "big" | "hours";

export const QUEUE_LABELS: Record<QueueLevel, string> = {
  none: "Без очереди",
  small: "Небольшая очередь",
  big: "Большая очередь",
  hours: "Очередь на часы",
};

// Заправка
export interface Station {
  id: string;
  name: string;
  brand: string | null;
  lat: number;
  lng: number;
  address: string | null;
  source: "osm" | "user";
}

// Отчёт пользователя
export interface Report {
  id: string;
  station_id: string;
  status: FuelStatus;
  fuel_types: FuelType[];
  limit_liters: number | null;
  queue: QueueLevel;
  prices: FuelPrices | null;
  comment: string | null;
  photo_url: string | null;
  confirms: number;
  canister: boolean; // отпускают только в канистру
  price_confirms: number; // подтверждений "цена верна" (отдельно от confirms)
  created_at: string; // ISO
}

// Поля отчёта, реально нужные для агрегации статуса станции (без comment/photo_url —
// они нужны только для ленты отчётов конкретной АЗС, не для карты).
export type ReportForStatus = Pick<
  Report,
  | "id"
  | "station_id"
  | "status"
  | "fuel_types"
  | "limit_liters"
  | "queue"
  | "prices"
  | "confirms"
  | "created_at"
>;

// Агрегированный статус заправки (то, что отрисовывается на карте)
export interface StationStatus extends Station {
  status: FuelStatus;
  queue: QueueLevel | null;
  limit_liters: number | null;
  fuel_types: FuelType[];
  prices: FuelPrices; // цены за литр из самого свежего отчёта станции с непустым prices
  price_updated_at: string | null; // ISO created_at того отчёта (может быть старше last_report_at)
  price_report_id: string | null; // id отчёта, давшего текущую цену — для голосования "цена верна" (E3)
  price_confirms: number; // подтверждений "цена верна" у price_report_id
  last_report_at: string | null; // ISO
  reports_count: number; // кол-во отчётов в окне свежести
  stale: boolean; // данные устарели
  conflicting: boolean; // противоречивые отчёты
}

// Полезная нагрузка для создания отчёта
export interface CreateReportPayload {
  station_id: string;
  status: FuelStatus;
  fuel_types: FuelType[];
  limit_liters?: number | null;
  queue: QueueLevel;
  prices?: FuelPrices | null;
  comment?: string | null;
  photo_url?: string | null;
  canister?: boolean;
  // honeypot — должно быть пустым (защита от ботов)
  website?: string;
}

// Bounding box карты: [south, west, north, east]
export type BBox = [number, number, number, number];

/** Минимум полей нового отчёта, нужный для мгновенного оптимистичного патча
    StationStatus в UI, не дожидаясь пересчёта на сервере — см. lib/stationPatch.ts. */
export interface OptimisticReportPatch {
  status: FuelStatus;
  queue: QueueLevel | null;
  fuel_types: FuelType[];
  limit_liters: number | null;
  prices?: FuelPrices | null;
}
