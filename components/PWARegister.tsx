"use client";

import { useEffect } from "react";
import { retryQueuedReports } from "@/lib/reportQueue";

// Регистрация service worker для PWA. Безопасно: только в проде и при поддержке.
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // В режиме разработки SW не регистрируем, чтобы не мешать HMR.
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Тихо игнорируем — PWA не критична для работы сайта.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  // Фолбэк для браузеров без Background Sync (Safari/iOS) — досылаем очередь
  // отчётов (см. lib/reportQueue.ts) сами при возврате сети и один раз при
  // старте, если сеть уже есть (например, очередь скопилась в прошлой сессии).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (navigator.onLine) void retryQueuedReports();
    const onOnline = () => void retryQueuedReports();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
