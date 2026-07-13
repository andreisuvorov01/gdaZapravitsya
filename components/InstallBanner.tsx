"use client";

import { CloseIcon, DesktopIcon, InstallIcon } from "./Icons";
import { isIos } from "@/lib/install";
import { useInstallPrompt } from "./InstallPromptContext";

/** Полный попап «На рабочий стол / главный экран». */
export default function InstallBanner() {
  const { showBanner, mobile, installSteps, bannerVariant, dismiss, runInstall } =
    useInstallPrompt();

  if (!showBanner) return null;

  const isLeave = bannerVariant === "leave";
  const title = isLeave
    ? "Сохраните на экран"
    : mobile
      ? "На главный экран"
      : "На рабочий стол";
  const hint = isLeave
    ? "Добавьте ярлык — не потеряете доступ к карте заправок"
    : mobile
      ? "Иконка рядом с приложениями — карта заправок откроется сразу"
      : "Ярлык на рабочем столе — карта заправок без поиска в браузере";
  const Icon = mobile ? InstallIcon : DesktopIcon;

  return (
    <div
      className="install-banner-wrap"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-banner-title"
    >
      <div className="install-banner glass-dock">
        <span className="install-banner__glow" aria-hidden />

        <button
          type="button"
          onClick={dismiss}
          aria-label="Скрыть подсказку"
          className="install-banner__close"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="install-banner__head">
          <span className="install-banner__icon" aria-hidden>
            <Icon className="h-[18px] w-[18px] text-brand-accent" />
          </span>
          <div className="install-banner__copy">
            <h2 id="install-banner-title" className="install-banner__title">{title}</h2>
            <p className="install-banner__hint">{hint}</p>
          </div>
        </div>

        {installSteps && (
          <div className="install-banner__steps">
            {isIos() ? (
              <p>Safari → «Поделиться» → «На экран Домой»</p>
            ) : (
              <p>Меню браузера (⋮) → «Установить» или «На главный экран»</p>
            )}
          </div>
        )}

        <div className="install-banner__actions">
          <button
            type="button"
            onClick={() => void runInstall()}
            className="install-banner__cta"
          >
            {installSteps ? "Понятно" : "Установить"}
          </button>
          <button type="button" onClick={dismiss} className="install-banner__later">
            Позже
          </button>
        </div>
      </div>
    </div>
  );
}
