"use client";

import Script from "next/script";
import { isYandexRtbEnabled, YANDEX_RTB_SCRIPT } from "@/lib/yandex-ads";
import { useCookieConsent } from "./useCookieConsent";

/** Загрузчик context.js — после согласия на cookie, один раз на контентных страницах. */
export default function YandexRtbScript() {
  const consent = useCookieConsent();

  if (!isYandexRtbEnabled() || !consent) return null;

  return (
    <>
      <Script id="yandex-rtb-init" strategy="afterInteractive">
        {`window.yaContextCb=window.yaContextCb||[]`}
      </Script>
      <Script
        id="yandex-rtb-context"
        src={YANDEX_RTB_SCRIPT}
        strategy="afterInteractive"
        async
        onLoad={() => window.dispatchEvent(new Event("yandex-rtb-ready"))}
      />
    </>
  );
}
