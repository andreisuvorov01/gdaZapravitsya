"use client";

import { useEffect, useState } from "react";

/** Синхронизировано с Tailwind sm: (640px) — это и есть брейкпоинт, который
    реально переключает разметку между мобильной шторкой и десктопным сайдбаром. */
export const MOBILE_BREAKPOINT_QUERY = "(max-width: 639px)";

/** Нереактивная проверка — для использования вне рендера (обработчики жестов и т.п.). */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
}

/** Реактивный хук для JSX — единая точка правды вместо разрозненных matchMedia-вызовов. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(isMobileViewport);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
