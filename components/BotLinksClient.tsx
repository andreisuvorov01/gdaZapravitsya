"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type BotLinksType from "./BotLinks";

const BotLinksLazy = dynamic(() => import("./BotLinks"), {
  ssr: false,
  loading: () => (
    <div
      className="social-links shrink-0 pointer-events-none opacity-0"
      aria-hidden
    >
      <span className="social-links__btn" />
      <span className="social-links__sep" />
      <span className="social-links__btn" />
      <span className="social-links__sep" />
      <span className="social-links__btn" />
    </div>
  ),
});

/** BotLinks только на клиенте — убирает hydration mismatch в шапке карты. */
export default function BotLinksClient(props: ComponentProps<typeof BotLinksType>) {
  return <BotLinksLazy {...props} />;
}
