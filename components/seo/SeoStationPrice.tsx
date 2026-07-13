import { timeAgo } from "@/lib/freshness";
import { stationPriceEntries } from "@/lib/station-price-display";
import type { StationStatus } from "@/lib/types";

interface SeoStationPriceProps {
  station: StationStatus;
}

/** Блок цены на SEO-странице — как в карточке АЗС на карте. */
export default function SeoStationPrice({ station }: SeoStationPriceProps) {
  const entries = stationPriceEntries(station);

  if (entries.length === 0) {
    return (
      <p className="mt-2 text-sm text-ink-muted">
        Нет данных о цене — сообщите её в отчёте.
      </p>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([fuel, price]) => (
          <span
            key={fuel}
            className="rounded-lg bg-white/5 px-2.5 py-1 text-sm font-medium text-ink ring-1 ring-white/8"
          >
            {fuel} — {price.toFixed(2)} ₽/л
          </span>
        ))}
      </div>
      {station.price_updated_at && (
        <p className="mt-1 text-xs text-ink-muted">
          Цена на {timeAgo(station.price_updated_at)}
        </p>
      )}
    </div>
  );
}
