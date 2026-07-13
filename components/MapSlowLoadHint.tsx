"use client";

import { useEffect, useState } from "react";

/** Через сколько мс показать подсказку, если карта ещё не готова. */
const SLOW_MAP_DELAY_MS = 5000;

/** Плейсхолдер, пока подгружается JS-компонент карты (dynamic import). */
export function MapLoadFallback() {
  return (
    <div className="map-canvas flex h-full items-center justify-center">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-surface/80 px-6 py-5 shadow-lg backdrop-blur-sm">
        <span className="h-10 w-10 animate-pulse rounded-full bg-brand-fuel/40 ring-4 ring-brand-fuel/10" />
        <p className="text-sm font-medium text-ink-muted">Загрузка карты…</p>
      </div>
    </div>
  );
}

interface MapSlowLoadHintProps {
  /** Карта ещё не отрисовала тайлы — запускаем таймер подсказки. */
  waiting: boolean;
}

/** Оверлей поверх карты, если тайлы грузятся дольше обычного. */
export default function MapSlowLoadHint({ waiting }: MapSlowLoadHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!waiting) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), SLOW_MAP_DELAY_MS);
    return () => clearTimeout(t);
  }, [waiting]);

  if (!visible) return null;

  return (
    <div className="map-slow-load-hint" role="status" aria-live="polite">
      <div className="glass-dock pointer-events-auto max-w-sm rounded-2xl px-4 py-3 text-center shadow-lg">
        <p className="text-sm font-medium text-white">Карта долго грузится?</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          Проверьте соединение или обновите страницу.
        </p>
      </div>
    </div>
  );
}
