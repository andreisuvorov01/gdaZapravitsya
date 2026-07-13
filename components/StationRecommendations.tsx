"use client";

import { distanceKm, formatDistance } from "@/lib/geo";
import { bestPrice, type FuelType, type StationStatus } from "@/lib/types";
import { displayName } from "@/lib/brands";

interface StationRecommendationsProps {
  stations: StationStatus[];
  userLocation: [number, number] | null;
  mapCenter: [number, number];
  onSelect: (station: StationStatus) => void;
  fuelType?: FuelType | "all";
  light?: boolean;
}

type Picked = {
  id: string;
  eyebrow: string;
  title: string;
  meta: string;
  station: StationStatus;
  accent: "fuel" | "fresh" | "price";
};

function stationDistance(
  station: StationStatus,
  ref: [number, number]
): number {
  return distanceKm(ref[0], ref[1], station.lat, station.lng);
}

function priceFor(station: StationStatus, fuelType: FuelType | "all") {
  if (fuelType !== "all") {
    const price = station.prices[fuelType];
    return typeof price === "number" && price > 0
      ? { fuel: fuelType, price }
      : null;
  }
  return bestPrice(station.prices);
}

export default function StationRecommendations({
  stations,
  userLocation,
  mapCenter,
  onSelect,
  fuelType = "all",
  light = false,
}: StationRecommendationsProps) {
  const ref = userLocation ?? mapCenter;
  const available = stations.filter((s) => s.status === "yes" || s.status === "low");
  const withDistance = stations.map((station) => ({
    station,
    distance: stationDistance(station, ref),
  }));

  const nearestFuel = available
    .map((station) => ({ station, distance: stationDistance(station, ref) }))
    .sort((a, b) => a.distance - b.distance)[0];

  const fresh = [...withDistance]
    .filter(({ station }) => station.last_report_at && !station.stale)
    .sort(
      (a, b) =>
        new Date(b.station.last_report_at as string).getTime() -
        new Date(a.station.last_report_at as string).getTime()
    )[0];

  const cheap = stations
    .map((station) => ({ station, price: priceFor(station, fuelType), distance: stationDistance(station, ref) }))
    .filter((x): x is { station: StationStatus; price: { fuel: FuelType; price: number }; distance: number } => Boolean(x.price))
    .sort((a, b) => a.price.price - b.price.price)[0];

  const picks: Picked[] = [];
  if (nearestFuel) {
    picks.push({
      id: `fuel-${nearestFuel.station.id}`,
      eyebrow: "Ближе с топливом",
      title: displayName(nearestFuel.station),
      meta: `${formatDistance(nearestFuel.distance)} · топливо отмечено`,
      station: nearestFuel.station,
      accent: "fuel",
    });
  }
  if (fresh && fresh.station.id !== nearestFuel?.station.id) {
    picks.push({
      id: `fresh-${fresh.station.id}`,
      eyebrow: "Свежая отметка",
      title: displayName(fresh.station),
      meta: `${formatDistance(fresh.distance)} · новые отметки`,
      station: fresh.station,
      accent: "fresh",
    });
  }
  if (cheap && !picks.some((p) => p.station.id === cheap.station.id)) {
    picks.push({
      id: `cheap-${cheap.station.id}`,
      eyebrow: "Низкая цена",
      title: displayName(cheap.station),
      meta: `${cheap.price.fuel} · ${cheap.price.price.toFixed(2)} ₽/л`,
      station: cheap.station,
      accent: "price",
    });
  }

  if (picks.length === 0) return null;

  return (
    <div className={`recommend-strip ${light ? "recommend-strip--light" : ""}`} aria-label="Быстрый выбор АЗС">
      {picks.slice(0, 3).map((pick) => (
        <button
          key={pick.id}
          type="button"
          onClick={() => onSelect(pick.station)}
          className={`recommend-card recommend-card--${pick.accent}`}
        >
          <span className="recommend-card__eyebrow">{pick.eyebrow}</span>
          <span className="recommend-card__title">{pick.title}</span>
          <span className="recommend-card__meta">{pick.meta}</span>
        </button>
      ))}
    </div>
  );
}
