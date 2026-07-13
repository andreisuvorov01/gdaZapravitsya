import type { FuelType, StationStatus } from "./types";

export type StationPriceEntry = [FuelType, number];

/** Цены из отчёта станции — только положительные значения. */
export function stationPriceEntries(station: StationStatus): StationPriceEntry[] {
  return (Object.entries(station.prices) as [FuelType, number | undefined][]).filter(
    (entry): entry is StationPriceEntry =>
      typeof entry[1] === "number" && entry[1] > 0
  );
}

export function stationHasPrice(station: StationStatus): boolean {
  return stationPriceEntries(station).length > 0;
}
