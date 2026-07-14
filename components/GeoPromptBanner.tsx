"use client";

import { CrosshairIcon } from "./Icons";

interface GeoPromptBannerProps {
  onAllow: () => void;
  onDismiss: () => void;
}

/** Объяснение перед нативным браузерным попапом геолокации — поднимает долю
    согласий по сравнению с голым системным запросом без контекста. */
export default function GeoPromptBanner({ onAllow, onDismiss }: GeoPromptBannerProps) {
  return (
    <div className="geo-prompt-wrap" role="dialog" aria-labelledby="geo-prompt-title">
      <div className="geo-prompt glass-dock">
        <span className="geo-prompt__icon" aria-hidden>
          <CrosshairIcon className="h-[18px] w-[18px] text-brand-fuel" />
        </span>
        <div className="geo-prompt__copy">
          <h2 id="geo-prompt-title" className="geo-prompt__title">
            Показать заправки рядом с вами?
          </h2>
          <p className="geo-prompt__hint">
            Нужен доступ к геолокации — иначе покажем карту с общего вида города
          </p>
          <div className="geo-prompt__actions">
            <button type="button" onClick={onAllow} className="geo-prompt__cta">
              Разрешить
            </button>
            <button type="button" onClick={onDismiss} className="geo-prompt__later">
              Не сейчас
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
