"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isDismissed, markDismissed, COOKIE_NOTICE_KEY } from "@/lib/clientStorage";

const STORAGE_KEY = COOKIE_NOTICE_KEY;

/** Уведомление о cookie — нижняя док-панель в стиле карты. */
export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isDismissed(STORAGE_KEY)) return;
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    markDismissed(STORAGE_KEY);
    setVisible(false);
    window.dispatchEvent(new Event("cookie-consent"));
  };

  if (!visible) return null;

  return (
    <div className="cookie-dock" role="dialog" aria-modal="true" aria-label="Уведомление о cookie">
      <div className="cookie-dock__panel glass-dock">
        <span className="cookie-dock__glow" aria-hidden />
        <div className="cookie-dock__content">
          <p className="cookie-dock__eyebrow">Cookie</p>
          <p className="cookie-dock__text">
            Используем cookie для статистики, рекламы Яндекса и улучшения карты.{" "}
            <Link href="/cookies" className="cookie-dock__link">
              Политика cookie
            </Link>
          </p>
        </div>
        <button type="button" onClick={dismiss} className="cookie-dock__accept">
          Принять
        </button>
      </div>
    </div>
  );
}
