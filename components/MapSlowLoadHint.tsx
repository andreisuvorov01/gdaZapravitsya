"use client";

import { useEffect, useState } from "react";
import SocialBrandIcon from "./SocialBrandIcon";
import {
  maxBotTrackUrl,
  TELEGRAM_HANDLE,
  telegramChannelUrl,
} from "@/lib/site";

/** Через сколько мс показать подсказку про каналы, если карта ещё не готова. */
const SLOW_MAP_DELAY_MS = 5000;

function SlowLoadChannelsMessage({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-white">Карта долго грузится?</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        Подпишитесь в Telegram или MAX — новости и ссылка на карту, часто работает,
        когда сайт тормозит
      </p>
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
        <a
          href={telegramChannelUrl("slow_map")}
          target="_blank"
          rel="noopener noreferrer"
          className="map-slow-load-hint__link"
        >
          <SocialBrandIcon brand="telegram" className="h-4 w-4" />
          {TELEGRAM_HANDLE}
        </a>
        <a
          href={maxBotTrackUrl("slow_map")}
          target="_blank"
          rel="noopener noreferrer"
          className="map-slow-load-hint__link"
        >
          <SocialBrandIcon brand="max" className="h-5 w-5" />
          MAX
        </a>
      </div>
    </div>
  );
}

/** Плейсхолдер, пока подгружается JS-компонент карты (dynamic import). */
export function MapLoadFallback() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), SLOW_MAP_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="map-canvas flex h-full items-center justify-center">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-surface/80 px-6 py-5 shadow-lg backdrop-blur-sm">
        <span className="h-10 w-10 animate-pulse rounded-full bg-brand-fuel/40 ring-4 ring-brand-fuel/10" />
        <p className="text-sm font-medium text-ink-muted">Загрузка карты…</p>
        {slow && <SlowLoadChannelsMessage className="border-t border-white/10 pt-3" />}
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
    <div
      className="map-slow-load-hint"
      role="status"
      aria-live="polite"
    >
      <div className="glass-dock pointer-events-auto max-w-sm rounded-2xl px-4 py-3 text-center shadow-lg">
        <SlowLoadChannelsMessage />
      </div>
    </div>
  );
}
