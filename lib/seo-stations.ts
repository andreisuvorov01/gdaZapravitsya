import { brandMatches } from "./brands";
import type { FuelType, FuelStatus, StationStatus } from "./types";

const STATUS_ORDER: Record<FuelStatus, number> = {
  yes: 0,
  low: 1,
  no: 2,
  unknown: 3,
};

export function sortStationsByStatus(stations: StationStatus[]): StationStatus[] {
  return [...stations].sort((a, b) => {
    const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (d !== 0) return d;
    return a.name.localeCompare(b.name, "ru");
  });
}

export function countByStatus(stations: StationStatus[]) {
  return stations.reduce(
    (acc, s) => {
      acc[s.status] += 1;
      return acc;
    },
    { yes: 0, low: 0, no: 0, unknown: 0 } as Record<FuelStatus, number>
  );
}

/** Заправки, где по отчётам есть или было указано нужное топливо. */
export function filterStationsByFuel(
  stations: StationStatus[],
  fuel: FuelType
): StationStatus[] {
  return stations.filter((s) => {
    if (s.fuel_types.length > 0) return s.fuel_types.includes(fuel);
    // Без уточнения марки — показываем при любом статусе кроме «нет».
    return s.status !== "no";
  });
}

export function filterStationsByBrand(
  stations: StationStatus[],
  brandName: string
): StationStatus[] {
  return stations.filter((s) => brandMatches(s.brand, s.name, brandName));
}
