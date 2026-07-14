"use client";

import { useState } from "react";
import { submitQuickReport } from "@/lib/quickReport";
import { hapticSuccess } from "@/lib/haptics";
import {
  QUEUE_LABELS,
  type FuelStatus,
  type FuelType,
  type OptimisticReportPatch,
  type QueueLevel,
} from "@/lib/types";
import { ChevronDownIcon, PlusIcon } from "./Icons";

const QUEUE_OPTIONS: QueueLevel[] = ["none", "small", "big", "hours"];

const OPTIONS: {
  status: Extract<FuelStatus, "yes" | "low" | "no">;
  label: string;
  hint: string;
  cls: string;
}[] = [
  {
    status: "yes",
    label: "Есть бензин",
    hint: "Можно заправиться",
    cls: "quick-report-opt--yes",
  },
  {
    status: "low",
    label: "Мало",
    hint: "Заканчивается",
    cls: "quick-report-opt--low",
  },
  {
    status: "no",
    label: "Нет топлива",
    hint: "Пусто или закрыто",
    cls: "quick-report-opt--no",
  },
];

interface QuickReportBarProps {
  stationId: string;
  onSubmitted?: (patch?: OptimisticReportPatch) => void;
  /** Вид топлива для быстрого шага цены — берём из данных станции, а не хардкодим. */
  primaryFuelType?: FuelType;
  /** По умолчанию свёрнута за тапом; можно сразу открыть (см. StationPanel). */
  defaultOpen?: boolean;
  /** Маленькая кнопка вместо полноширинной полосы — для плотных списков (StationList). */
  compact?: boolean;
}

/** Свёрнутый по умолчанию — отчёт только по явному действию. */
export default function QuickReportBar({
  stationId,
  onSubmitted,
  primaryFuelType = "АИ-92",
  defaultOpen = false,
  compact = false,
}: QuickReportBarProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Промежуточные шаги после "Есть"/"Мало": сначала очередь, затем
  // необязательный ввод цены АИ-92.
  const [pendingStatus, setPendingStatus] = useState<Extract<
    FuelStatus,
    "yes" | "low"
  > | null>(null);
  const [pendingQueue, setPendingQueue] = useState<QueueLevel | null>(null);
  const [priceInput, setPriceInput] = useState("");

  const send = async (
    status: Extract<FuelStatus, "yes" | "low" | "no">,
    price?: number,
    queue: QueueLevel = "none"
  ) => {
    if (busy) return;
    setBusy(status);
    setError(null);
    try {
      const result = await submitQuickReport(stationId, status, price, primaryFuelType, queue);
      hapticSuccess();
      setSent(true);
      setQueued(result.queued);
      setOpen(false);
      setPendingStatus(null);
      setPendingQueue(null);
      setPriceInput("");
      const hasPrice = status !== "no" && typeof price === "number" && price > 0;
      onSubmitted?.({
        status,
        queue: status === "no" ? "none" : queue,
        fuel_types: hasPrice ? [primaryFuelType] : [],
        limit_liters: null,
        prices: hasPrice ? { [primaryFuelType]: price } : null,
      });
      window.setTimeout(() => setSent(false), 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setBusy(null);
    }
  };

  const pick = (status: Extract<FuelStatus, "yes" | "low" | "no">) => {
    if (status === "no") {
      void send(status);
      return;
    }
    setPendingStatus(status);
    setPendingQueue(null);
    setError(null);
  };

  const confirmPrice = () => {
    if (!pendingStatus) return;
    const n = Number(priceInput.replace(",", "."));
    void send(pendingStatus, Number.isFinite(n) && n > 0 ? n : undefined, pendingQueue ?? "none");
  };

  if (sent) {
    return (
      <div className="quick-report-thanks" role="status">
        <p>
          {queued
            ? "Сохранено — отправится, как только появится связь."
            : "Спасибо! Отметка отправлена — помогаете другим водителям."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="quick-report"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {compact ? (
        <button
          type="button"
          className="quick-report-toggle--compact"
          aria-expanded={open}
          aria-label="Сообщить, что сейчас на АЗС"
          onClick={() => setOpen((v) => !v)}
        >
          <PlusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Отметить
        </button>
      ) : (
        <button
          type="button"
          className="quick-report-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="quick-report-toggle__icon" aria-hidden>
            <PlusIcon className="h-4 w-4" />
          </span>
          <span className="quick-report-toggle__label">
            Были здесь? Сообщите, что на АЗС
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
      )}

      {open && pendingStatus && pendingQueue === null && (
        <div className="quick-report-panel">
          <p className="quick-report-panel__title">Какая очередь?</p>
          <div className="quick-report-options quick-report-options--queue">
            {QUEUE_OPTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={Boolean(busy)}
                className="quick-report-opt"
                onClick={() => setPendingQueue(q)}
              >
                <span className="quick-report-opt__label">{QUEUE_LABELS[q]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {open && pendingStatus && pendingQueue !== null && (
        <div className="quick-report-panel">
          <p className="quick-report-panel__title">
            Цена {primaryFuelType}, ₽/л (необязательно)
          </p>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            max={300}
            step="0.01"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="напр. 56.40"
            className="quick-report-price-input"

          />
          <div className="quick-report-options">
            <button
              type="button"
              disabled={Boolean(busy)}
              className="quick-report-opt quick-report-opt--skip"
              onClick={() => void send(pendingStatus, undefined, pendingQueue)}
            >
              <span className="quick-report-opt__label">Пропустить</span>
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              className="quick-report-opt quick-report-opt--yes"
              onClick={confirmPrice}
            >
              <span className="quick-report-opt__label">
                {busy ? "Отправляем…" : "Отправить"}
              </span>
            </button>
          </div>
          {error && (
            <p className="quick-report-panel__error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      {open && !pendingStatus && (
        <div className="quick-report-panel">
          <p className="quick-report-panel__title">Что сейчас на заправке?</p>
          <p className="quick-report-panel__hint">
            Нажмите — отчёт сразу попадёт на карту
          </p>
          <div className="quick-report-options">
            {OPTIONS.map((o) => (
              <button
                key={o.status}
                type="button"
                disabled={Boolean(busy)}
                aria-label={`Отправить отчёт: ${o.label}`}
                className={`quick-report-opt ${o.cls} ${
                  busy === o.status ? "quick-report-opt--busy" : ""
                }`}
                onClick={() => pick(o.status)}
              >
                <span className="quick-report-opt__label">
                  {busy === o.status ? "Отправляем…" : o.label}
                </span>
                <span className="quick-report-opt__hint">{o.hint}</span>
              </button>
            ))}
          </div>
          {error && (
            <p className="quick-report-panel__error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
