import type { FuelType } from "./types";

export interface FuelSlugEntry {
  slug: string;
  fuel: FuelType;
  /** Для заголовков: «бензин АИ-95», «дизель». */
  label: string;
  /** Родительный падеж в контексте «наличие …». */
  genitive: string;
}

/** Слаги топлива для SEO-URL /azs/{город}/{slug} (как у gdebenz.ru/fuel/…). */
export const FUEL_SLUG_ENTRIES: FuelSlugEntry[] = [
  { slug: "ai-92", fuel: "АИ-92", label: "бензин АИ-92", genitive: "бензина АИ-92" },
  { slug: "ai-95", fuel: "АИ-95", label: "бензин АИ-95", genitive: "бензина АИ-95" },
  { slug: "ai-98", fuel: "АИ-98", label: "бензин АИ-98", genitive: "бензина АИ-98" },
  { slug: "ai-100", fuel: "АИ-100", label: "бензин АИ-100", genitive: "бензина АИ-100" },
  { slug: "dizel", fuel: "ДТ", label: "дизель", genitive: "дизеля" },
  { slug: "gaz", fuel: "Газ", label: "газ", genitive: "газа" },
];

export function findFuelBySlug(slug: string): FuelSlugEntry | undefined {
  return FUEL_SLUG_ENTRIES.find((e) => e.slug === slug);
}
