"use client";

import BrandLogo from "./BrandLogo";
import BotLinksClient from "./BotLinksClient";
import HeaderMenu from "./HeaderMenu";

interface SiteHeaderProps {
  /** Доп. кнопки справа (переключатель карта/список, геолокация и т.д.). */
  tools?: React.ReactNode;
}

/** Единая шапка: логотип + слоган + меню «⋯». */
export default function SiteHeader({ tools }: SiteHeaderProps) {
  return (
    <header className="z-[700] shrink-0 border-b border-white/5 bg-surface">
      <div className="flex items-center gap-2 px-2.5 py-2 sm:px-4">
        <BrandLogo className="min-w-0 shrink" size="sm" href="/" showTagline />

        <div className="app-header__tools">
          <BotLinksClient variant="header" className="shrink-0" />
          {tools}
          <HeaderMenu />
        </div>
      </div>
    </header>
  );
}
