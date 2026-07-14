"use client";

import { useEffect, useRef, useState } from "react";
import { STATUS_HEX, STATUS_LABELS, type FuelStatus } from "@/lib/types";
import { STATUS_GLYPH } from "./StatusBadge";
import { CloseIcon, PlusIcon, ThumbsUpIcon } from "./Icons";
import { isDismissed, markDismissed } from "@/lib/clientStorage";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding";

const STATUSES: FuelStatus[] = ["yes", "low", "no", "unknown"];
const STEP_COUNT = 2;

export default function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1>(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDismissed(ONBOARDING_STORAGE_KEY)) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    el.addEventListener("keydown", trap);
    first.focus();
    return () => el.removeEventListener("keydown", trap);
  }, [open]);

  const dismiss = () => {
    markDismissed(ONBOARDING_STORAGE_KEY);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="overlay-backdrop-in onboarding-overlay pointer-events-none fixed inset-0 flex items-end justify-center bg-black/60 p-3 pb-[calc(0.75rem+var(--mobile-sheet-peek)+env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:items-center sm:pb-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="overlay-modal thin-scroll pointer-events-auto max-h-[min(88dvh,calc(100dvh-var(--mobile-sheet-peek)-env(safe-area-inset-bottom,0px)))] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-surface p-5 shadow-2xl sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-fuel">
              Добро пожаловать
            </p>
            <h2
              id="onboarding-title"
              className="mt-1 font-display text-xl font-bold text-white"
            >
              Как читать карту «Бенз-Атлас»
            </h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Закрыть подсказку"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors after:absolute after:left-1/2 after:top-1/2 after:h-10 after:w-10 after:-translate-x-1/2 after:-translate-y-1/2 hover:bg-white/10"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {step === 0 ? (
          <>
            <p className="mt-3 text-sm text-ink-muted">
              Сервис <b className="text-white">полностью бесплатный</b>: без
              регистрации, подписок и скрытых платежей. Каждая заправка
              отмечена цветом <b className="text-white">и значком</b> —
              статус виден даже без различения цветов:
            </p>

            <ul className="mt-3 grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <li
                  key={s}
                  className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2"
                >
                  <span
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black leading-none text-ink-dark ring-2 ring-white/20"
                    style={{ background: STATUS_HEX[s] }}
                    aria-hidden
                  >
                    {STATUS_GLYPH[s]}
                  </span>
                  <span className="text-sm font-medium text-white">
                    {STATUS_LABELS[s]}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand-fuel/30 bg-brand-fuel/10 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-fuel text-ink-dark">
                <PlusIcon className="h-5 w-5" />
              </span>
              <p className="text-sm text-ink">
                Нажмите на заправку на карте или потяните вверх список{" "}
                <b className="text-white">«Рядом»</b>, затем{" "}
                <b className="text-white">«Сообщить ситуацию»</b> — отметьте
                наличие топлива, очередь и лимит.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mt-3 flex items-start gap-3 rounded-xl bg-white/5 p-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black leading-none text-ink-dark ring-2 ring-white/20"
                style={{ background: STATUS_HEX.unknown }}
                aria-hidden
              >
                {STATUS_GLYPH.unknown}
              </span>
              <p className="text-sm text-ink">
                <b className="text-white">Серый «?» — ещё никто не отмечал</b>{" "}
                эту заправку. Это не значит, что топлива нет — просто пока нет
                свежих отчётов.
              </p>
            </div>

            <div className="mt-3 flex items-start gap-3 rounded-xl border border-brand-fuel/30 bg-brand-fuel/10 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-fuel text-ink-dark">
                <ThumbsUpIcon className="h-5 w-5" />
              </span>
              <p className="text-sm text-ink">
                Согласны с чужим отчётом — нажмите{" "}
                <b className="text-white">«Подтвердить»</b> под ним в списке
                отчётов заправки. Это повышает доверие к данным для других
                водителей.
              </p>
            </div>
          </>
        )}

        <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${
                i === step ? "w-5 bg-brand-fuel" : "w-1.5 bg-white/15"
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-base font-semibold text-ink transition-colors hover:bg-white/10"
            >
              Назад
            </button>
          )}
          <button
            type="button"
            onClick={() => (step < STEP_COUNT - 1 ? setStep((step + 1) as 0 | 1) : dismiss())}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-brand-fuel px-4 text-base font-bold text-ink-dark transition-colors hover:bg-brand-fuelDim"
          >
            {step < STEP_COUNT - 1 ? "Далее" : "Понятно, на карту"}
          </button>
        </div>
      </div>
    </div>
  );
}
