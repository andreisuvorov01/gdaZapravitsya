"use client";

import { useState } from "react";
import { GAS_BRANDS } from "@/lib/brands";
import { CloseIcon } from "./Icons";

interface AddStationSheetProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onCreated: (stationId: string) => void;
}

/** Форма добавления заправки после долгого нажатия на карте. */
export default function AddStationSheet({
  lat,
  lng,
  onClose,
  onCreated,
}: AddStationSheetProps) {
  const [name, setName] = useState("Заправка");
  const [brand, setBrand] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          name,
          brand: brand === "all" ? null : brand,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(String(json.error ?? "Ошибка"));
      onCreated(json.station.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="overlay-backdrop-in fixed inset-0 z-[1250] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        className="overlay-modal thin-scroll max-h-[min(92dvh,calc(100dvh-var(--mobile-sheet-peek)-env(safe-area-inset-bottom,0px)))] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl sm:max-h-[92vh] sm:rounded-3xl sm:border sm:pb-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-station-title"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="add-station-title" className="font-display text-lg font-bold text-white">
            Добавить заправку
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted hover:bg-white/10"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-ink-muted">
          Отметка на карте: {lat.toFixed(5)}, {lng.toFixed(5)}. После добавления
          можно сразу сообщить ситуацию.
        </p>

        <label className="mb-3 block text-sm font-medium text-ink">
          Название
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 min-h-[48px] w-full rounded-xl border border-white/10 bg-white/5 px-3 text-base text-ink"
            maxLength={120}
            required
          />
        </label>

        <label className="mb-4 block text-sm font-medium text-ink">
          Сеть (необязательно)
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="mt-1 min-h-[48px] w-full rounded-xl border border-white/10 bg-surface-raised px-3 text-base text-ink"
          >
            <option value="all">Не указана</option>
            {GAS_BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="mb-3 text-sm text-fuel-no" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="min-h-[48px] w-full rounded-xl bg-brand-fuel text-base font-bold text-ink-dark hover:bg-brand-fuelDim disabled:opacity-50"
        >
          {loading ? "Сохраняем…" : "Добавить на карту"}
        </button>
      </form>
    </div>
  );
}
