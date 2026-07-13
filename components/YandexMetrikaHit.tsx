"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { YANDEX_METRIKA_ID } from "@/lib/legal";

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

/**
 * App Router меняет страницы клиентским переходом без полной перезагрузки,
 * поэтому автоматический хит счётчика (привязанный к загрузке документа)
 * не срабатывает при навигации — шлём его вручную при смене маршрута.
 */
export default function YandexMetrikaHit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Первый хит уже отправлен вручную из YandexMetrika.tsx (сразу после init) — не дублируем.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window === "undefined" || typeof window.ym !== "function") return;
    const query = searchParams.toString();
    const url = `${window.location.origin}${pathname}${query ? `?${query}` : ""}`;
    window.ym(YANDEX_METRIKA_ID, "hit", url, { referrer: document.referrer });
  }, [pathname, searchParams]);

  return null;
}
