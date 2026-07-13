"use client";

import { useEffect, useState } from "react";
import { getClientId } from "@/lib/clientId";
import { dispatchChannelPrompt } from "@/lib/channelPrompt";
import {
  FUEL_TYPES,
  QUEUE_LABELS,
  type CreateReportPayload,
  type FuelPrices,
  type FuelStatus,
  type FuelType,
  type QueueLevel,
  type StationStatus,
} from "@/lib/types";
import { AlertIcon, BanIcon, CheckIcon, CloseIcon } from "./Icons";

interface ReportFormProps {
  station: StationStatus;
  onClose: () => void;
  onSubmitted: () => void;
}

const STATUS_OPTIONS = ["yes", "low", "no"] as const;
const STATUS_ICON = { yes: CheckIcon, low: AlertIcon, no: BanIcon } as const;
const STATUS_SHORT = { yes: "Есть", low: "Мало", no: "Нет" } as const;
const STATUS_ACTIVE: Record<(typeof STATUS_OPTIONS)[number], string> = {
  yes: "border-fuel-yes bg-fuel-yes/20 text-fuel-yes",
  low: "border-fuel-low bg-fuel-low/20 text-fuel-low",
  no: "border-fuel-no bg-fuel-no/20 text-fuel-no",
};
const QUEUE_OPTIONS: QueueLevel[] = ["none", "small", "big", "hours"];

function Chip({
  active,
  onClick,
  children,
  activeClass = "border-brand-fuel bg-brand-fuel/20 text-brand-fuel",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeClass?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-base font-medium transition-all ${
        active
          ? activeClass
          : "border-white/10 bg-white/5 text-ink hover:border-white/20 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export default function ReportForm({
  station,
  onClose,
  onSubmitted,
}: ReportFormProps) {
  const [status, setStatus] = useState<FuelStatus>("yes");
  const [queue, setQueue] = useState<QueueLevel>("none");
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [prices, setPrices] = useState<Partial<Record<FuelType, string>>>({});
  const [limit, setLimit] = useState<string>("");
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleFuel = (f: FuelType) =>
    setFuelTypes((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const activeFuel = status === "no" ? [] : fuelTypes;
    const activeQueue = status === "no" ? "none" : queue;
    const activeLimit = status === "no" ? "" : limit;
    const priceEntries: FuelPrices = {};
    for (const f of activeFuel) {
      const raw = prices[f];
      const n = raw ? Number(raw.replace(",", ".")) : NaN;
      if (Number.isFinite(n) && n > 0) priceEntries[f] = n;
    }
    const payload: CreateReportPayload = {
      station_id: station.id,
      status,
      fuel_types: activeFuel,
      limit_liters: activeLimit ? Math.max(0, parseInt(activeLimit, 10)) : null,
      queue: activeQueue,
      prices: Object.keys(priceEntries).length > 0 ? priceEntries : null,
      comment: comment.trim() || null,
      canister: false,
      website,
    };
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": getClientId(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Не удалось отправить отчёт");
      }
      onSubmitted();
      dispatchChannelPrompt("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "min-h-[48px] w-full rounded-xl border border-white/10 bg-white/5 px-3 text-base text-ink placeholder:text-ink-muted focus:border-brand-fuel/50 focus:outline-none focus:ring-2 focus:ring-brand-fuel/20";

  return (
    <div
      className="overlay-backdrop-in fixed inset-0 z-[1300] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="overlay-modal thin-scroll max-h-[min(92dvh,calc(100dvh-var(--mobile-sheet-peek)-env(safe-area-inset-bottom,0px)))] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl sm:max-h-[92vh] sm:rounded-3xl sm:border sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 id="report-title" className="font-display text-lg font-bold text-ink">
            Сообщить ситуацию
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрыть форму"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-white/10"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-base text-ink-muted">{station.name}</p>

        <form onSubmit={submit} className="space-y-5">
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <fieldset>
            <legend className="mb-2 text-base font-semibold text-ink">
              Наличие топлива
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((s) => {
                const Icon = STATUS_ICON[s];
                return (
                  <Chip
                    key={s}
                    active={status === s}
                    onClick={() => setStatus(s)}
                    activeClass={STATUS_ACTIVE[s]}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {STATUS_SHORT[s]}
                  </Chip>
                );
              })}
            </div>
          </fieldset>

          {status !== "no" && (
            <fieldset>
              <legend className="mb-2 text-base font-semibold text-ink">
                Какое топливо есть
              </legend>
              <div className="flex flex-wrap gap-2">
                {FUEL_TYPES.map((f) => (
                  <Chip
                    key={f}
                    active={fuelTypes.includes(f)}
                    onClick={() => toggleFuel(f)}
                    activeClass="border-fuel-yes bg-fuel-yes/20 text-fuel-yes"
                  >
                    {f}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}

          {status !== "no" && fuelTypes.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-base font-semibold text-ink">
                Цена, ₽/л (если знаете)
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {fuelTypes.map((f) => (
                  <label key={f} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-sm text-ink-muted">
                      {f}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      max={300}
                      step="0.01"
                      value={prices[f] ?? ""}
                      onChange={(e) =>
                        setPrices((prev) => ({ ...prev, [f]: e.target.value }))
                      }
                      placeholder="напр. 56.40"
                      className={inputCls}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {status !== "no" && (
            <fieldset>
              <legend className="mb-2 text-base font-semibold text-ink">
                Очередь
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {QUEUE_OPTIONS.map((q) => (
                  <Chip key={q} active={queue === q} onClick={() => setQueue(q)}>
                    {QUEUE_LABELS[q]}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}

          {status !== "no" && (
            <div>
              <label
                htmlFor="limit-input"
                className="mb-1.5 block text-base font-semibold text-ink"
              >
                Лимит на руки, литров (если есть)
              </label>
              <input
                id="limit-input"
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="напр. 20"
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="comment-input"
              className="mb-1.5 block text-base font-semibold text-ink"
            >
              Комментарий
            </label>
            <textarea
              id="comment-input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="напр. отпускают по 30 л, очередь на час"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:border-brand-fuel/50 focus:outline-none focus:ring-2 focus:ring-brand-fuel/20"
            />
          </div>

          {error && (
            <p className="text-base font-medium text-fuel-no" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-fuel px-4 text-base font-bold text-ink-dark transition-colors hover:bg-brand-fuelDim disabled:opacity-50"
          >
            {submitting ? "Отправка…" : "Отправить отчёт"}
          </button>
        </form>
      </div>
    </div>
  );
}
