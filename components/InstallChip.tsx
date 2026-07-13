"use client";

import { memo } from "react";
import { DesktopIcon, InstallIcon } from "./Icons";
import { useInstallPrompt } from "./InstallPromptContext";

/**
 * Компактная плашка в шапке — открывает полный попап установки. Без пропов
 * (своё состояние берёт из контекста) — memo() убирает ре-рендер вместе с
 * родительским AppShell (poll раз в 20с и т.п.), пока контекст не изменился.
 */
function InstallChip() {
  const { showChip, mobile, openBanner } = useInstallPrompt();

  if (!showChip) return null;

  const Icon = mobile ? InstallIcon : DesktopIcon;
  const label = mobile ? "На экран" : "На стол";

  return (
    <button
      type="button"
      onClick={openBanner}
      className="install-chip"
      title={mobile ? "Добавить на главный экран" : "Добавить на рабочий стол"}
      aria-label={mobile ? "Добавить на главный экран" : "Добавить на рабочий стол"}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-brand-accent" aria-hidden />
      <span className="install-chip__label">{label}</span>
    </button>
  );
}

export default memo(InstallChip);
