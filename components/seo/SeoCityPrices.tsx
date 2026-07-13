import type { CityFuelPrice } from "@/lib/seo-city-prices";

interface SeoCityPricesProps {
  prices: CityFuelPrice[];
  cityPrep: string;
}

export default function SeoCityPrices({ prices, cityPrep }: SeoCityPricesProps) {
  if (prices.length === 0) return null;

  return (
    <section className="mt-10" aria-label="Средняя цена топлива">
      <h2 className="text-xl font-bold text-ink">Средняя цена топлива {cityPrep}</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Медиана по отчётам водителей — ориентир, не прайс конкретной заправки. Перед
        заездом уточняйте на колонке.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {prices.map((p) => (
          <div
            key={p.fuel}
            className="rounded-2xl border border-white/10 bg-surface/60 px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              {p.fuel}
            </p>
            <p className="mt-1 text-lg font-bold text-ink">{p.price.toFixed(2)} ₽/л</p>
          </div>
        ))}
      </div>
    </section>
  );
}
