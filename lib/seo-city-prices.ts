import { median, MIN_SAMPLE } from "./priceLevel";
import { PRICE_DISPLAY_ORDER, type FuelType, type StationStatus } from "./types";

export interface CityFuelPrice {
  fuel: FuelType;
  price: number;
  sampleSize: number;
}

/** Медианные цены по отчётам водителей за выборку станций города. */
export function medianPricesFromStations(stations: StationStatus[]): CityFuelPrice[] {
  return PRICE_DISPLAY_ORDER.map((fuel) => {
    const values = stations
      .map((s) => s.prices[fuel])
      .filter((v): v is number => typeof v === "number" && v > 0);
    return {
      fuel,
      price: values.length >= MIN_SAMPLE ? median(values) : null,
      sampleSize: values.length,
    };
  })
    .filter((p): p is CityFuelPrice => p.price !== null)
    .map(({ fuel, price, sampleSize }) => ({ fuel, price, sampleSize }));
}
