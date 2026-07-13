"use client";

import { useState } from "react";
import { CITY_PRESETS } from "@/lib/cities";
import { normalizeBrand } from "@/lib/brands";
import { geocodeQuery } from "@/lib/geocode";
import {
  getSearchHistory,
  pushSearchHistory,
  type SearchHistoryItem,
} from "@/lib/searchHistory";
import { SearchIcon } from "./Icons";

interface CitySearchProps {
  onFly: (lat: number, lng: number, zoom?: number) => void;
  /** Подпись для истории (город из пресета или введённый текст). */
  historyLabel?: (raw: string) => string;
}

export default function CitySearch({ onFly, historyLabel }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const remember = (label: string, lat: number, lng: number, zoom?: number) => {
    pushSearchHistory({ label, lat, lng, zoom });
    setHistory(getSearchHistory());
    onFly(lat, lng, zoom);
  };

  const go = async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setError(null);
    setHistoryOpen(false);
    const preset = CITY_PRESETS.find(
      (c) => normalizeBrand(c.name) === normalizeBrand(q)
    );
    if (preset) {
      remember(preset.name, preset.lat, preset.lng, preset.zoom);
      return;
    }
    setLoading(true);
    try {
      const hit = await geocodeQuery(q.includes("Россия") ? q : `${q}, Россия`);
      if (hit) {
        const label = historyLabel ? historyLabel(q) : q;
        remember(label, hit.lat, hit.lng, 12);
      } else setError("Город не найден — попробуйте другое название");
    } catch {
      setError("Поиск временно недоступен");
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    go(query);
  };

  return (
    <div className="min-w-0 flex-1">
      <form onSubmit={submit} className="flex min-w-0 gap-2">
        <label htmlFor="city-search" className="sr-only">
          Поиск города или адреса
        </label>
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="city-search"
            list="city-suggestions"
            type="search"
            value={query}
            onFocus={() => {
              setHistory(getSearchHistory());
              setHistoryOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => setHistoryOpen(false), 150);
            }}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              if (error) setError(null);
              if (CITY_PRESETS.some((c) => c.name === v)) go(v);
            }}
            placeholder="Город или адрес"
            autoComplete="off"
            className="city-search-input min-h-[44px] w-full rounded-full border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-base text-ink placeholder:text-ink-muted focus:border-brand-fuel/50 focus:outline-none focus:ring-2 focus:ring-brand-fuel/30"
          />
          <datalist id="city-suggestions">
            {CITY_PRESETS.map((c) => (
              <option key={c.slug} value={c.name} />
            ))}
          </datalist>
        </div>
        <button
          type="submit"
          disabled={loading}
          aria-label={loading ? "Поиск…" : "Найти"}
          className="city-search-submit inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-brand-fuel text-sm font-bold text-ink-dark transition-transform active:scale-[0.96] hover:bg-brand-fuelDim disabled:opacity-50 sm:min-w-0 sm:px-4 sm:font-semibold"
        >
          {loading ? (
            "…"
          ) : (
            <>
              <span className="sm:hidden" aria-hidden>
                →
              </span>
              <span className="hidden sm:inline">Найти</span>
            </>
          )}
        </button>
      </form>

      {historyOpen && history.length > 0 && (
        <ul className="search-history no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto px-0.5">
          {history.map((item) => (
            <li key={`${item.label}-${item.lat}`}>
              <button
                type="button"
                className="search-history__chip"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(item.label);
                  remember(item.label, item.lat, item.lng, item.zoom);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-1.5 px-1 text-xs text-fuel-no" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
