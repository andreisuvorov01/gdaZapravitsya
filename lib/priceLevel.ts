import type { FuelPrices, FuelType } from "./types";

// Оценка "стоит ли ехать" по цене — сравнение цены станции на конкретный вид
// топлива с ценами на тот же вид топлива у других станций в текущей области
// просмотра карты (референс передаётся снаружи, см. lib/freshness.ts для
// самой агрегации цен по отчётам).

export type PriceLevel = "cheap" | "average" | "expensive" | "unknown";

export const PRICE_LEVEL_LABEL: Record<PriceLevel, string> = {
  cheap: "Дешевле, чем рядом",
  average: "Средняя цена по району",
  expensive: "Дороже, чем рядом",
  unknown: "Мало данных для сравнения",
};

export const PRICE_LEVEL_HEX: Record<PriceLevel, string> = {
  cheap: "#00C853",
  average: "#90A4AE",
  expensive: "#FF3D00",
  unknown: "#90A4AE",
};

// Без хотя бы стольки цен на тот же вид топлива сравнение не показательно.
export const MIN_SAMPLE = 3;
// Порог отклонения от медианы, чтобы считать станцию дешевле/дороже,
// а не "средней" — короткие расхождения в 1% часто просто округление.
const CHEAP_RATIO = 0.98;
const EXPENSIVE_RATIO = 1.02;

export interface PriceComparison {
  level: PriceLevel;
  diffPct: number | null; // напр. -5 — на 5% дешевле медианы
  median: number | null;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function comparePrice(
  fuel: FuelType,
  price: number,
  referencePrices: FuelPrices[]
): PriceComparison {
  const same = referencePrices
    .map((p) => p[fuel])
    .filter((v): v is number => typeof v === "number" && v > 0);

  if (same.length < MIN_SAMPLE) {
    return { level: "unknown", diffPct: null, median: null };
  }

  const med = median(same);
  const diffPct = Math.round(((price - med) / med) * 1000) / 10;
  let level: PriceLevel;
  if (price <= med * CHEAP_RATIO) level = "cheap";
  else if (price >= med * EXPENSIVE_RATIO) level = "expensive";
  else level = "average";

  return { level, diffPct, median: med };
}
