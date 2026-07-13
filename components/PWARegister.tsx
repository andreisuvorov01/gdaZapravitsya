"use client";

import { useEffect } from "react";

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

  return null;
}
