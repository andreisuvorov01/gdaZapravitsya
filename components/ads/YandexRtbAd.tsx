"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getYandexBlockId,
  isYandexRtbEnabled,
  type YandexRtbSlot,
} from "@/lib/yandex-ads";
import { scheduleYandexRtbRender } from "@/lib/yandex-rtb-render";
import { useCookieConsent } from "./useCookieConsent";

interface YandexRtbAdProps {
  slot: YandexRtbSlot;
  className?: string;
}

function hasCreative(container: HTMLElement): boolean {
  return (
    container.childElementCount > 0 ||
    Boolean(container.querySelector("iframe, img, a"))
  );
}

/** Один блок РСЯ — виден только когда Яндекс отдал креатив. */
export default function YandexRtbAd({ slot, className = "" }: YandexRtbAdProps) {
  const consent = useCookieConsent();
  const blockId = getYandexBlockId(slot);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reactId = useId().replace(/:/g, "");
  const renderTo = blockId
    ? `yandex_rtb_${blockId.replace(/[^a-zA-Z0-9-]/g, "_")}_${reactId}`
    : "";
  const containerRef = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (!blockId || !isYandexRtbEnabled() || !consent || !renderTo) return;

    const container = containerRef.current;
    if (!container) return;

    setFilled(false);
    container.replaceChildren();

    const tryRender = () =>
      scheduleYandexRtbRender({ blockId, renderTo, darkTheme: true });

    tryRender();

    const onReady = () => tryRender();
    window.addEventListener("yandex-rtb-ready", onReady);

    const observer = new MutationObserver(() => {
      if (hasCreative(container)) setFilled(true);
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("yandex-rtb-ready", onReady);
      observer.disconnect();
      container.replaceChildren();
    };
  }, [blockId, consent, pathname, searchParams, renderTo]);

  if (!blockId || !isYandexRtbEnabled() || !consent) return null;

  return (
    <aside
      className={[
        "yandex-rtb-slot",
        filled ? "yandex-rtb-slot--filled" : "yandex-rtb-slot--empty",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={filled ? "Реклама" : undefined}
      aria-hidden={filled ? undefined : true}
      data-yandex-slot={slot}
      data-yandex-filled={filled ? "true" : "false"}
    >
      {filled ? <p className="yandex-rtb-slot__label">Реклама</p> : null}
      <div
        id={renderTo}
        ref={containerRef}
        className="yandex-rtb-slot__container"
      />
    </aside>
  );
}
