"use client";

import { useEffect, useState } from "react";
import { COOKIE_NOTICE_KEY, isDismissed } from "@/lib/clientStorage";

/** Согласие на cookie (в т.ч. для РСЯ) — после «Принять» или если уже было принято. */
export function useCookieConsent(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(isDismissed(COOKIE_NOTICE_KEY));
    sync();
    window.addEventListener("cookie-consent", sync);
    return () => window.removeEventListener("cookie-consent", sync);
  }, []);

  return allowed;
}
