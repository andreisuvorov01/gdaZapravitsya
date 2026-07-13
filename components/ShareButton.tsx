"use client";

import { useCallback, useState } from "react";
import { copyOrShare } from "@/lib/share";
import { ShareIcon } from "./Icons";

type ShareVariant = "chip" | "menu" | "compact" | "station" | "sidebar";

interface ShareButtonProps {
  url: string;
  title?: string;
  text?: string;
  label?: string;
  copiedLabel?: string;
  variant?: ShareVariant;
  className?: string;
  onDone?: () => void;
}

/** Кнопка «Поделиться» в фирменном стиле (Web Share API + копирование ссылки). */
export default function ShareButton({
  url,
  title,
  text,
  label = "Поделиться",
  copiedLabel = "Ссылка скопирована",
  variant = "chip",
  className = "",
  onDone,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async () => {
    const result = await copyOrShare({ title, text, url });
    if (result === "copied") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
    if (result !== "failed") onDone?.();
  }, [url, title, text, onDone]);

  const shown = copied ? copiedLabel : label;

  if (variant === "menu") {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={() => void share()}
        className={`header-menu__action ${className}`}
      >
        <span className="header-menu__action-icon" aria-hidden>
          <ShareIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-left">{shown}</span>
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => void share()}
        aria-label={shown}
        title={shown}
        className={`share-btn share-btn--icon ${className}`}
      >
        <ShareIcon className="h-[18px] w-[18px]" />
      </button>
    );
  }

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={() => void share()}
        className={`map-sidebar__action ${className}`}
      >
        <ShareIcon className="h-4 w-4 shrink-0" />
        <span>{shown}</span>
      </button>
    );
  }

  if (variant === "station") {
    return (
      <button
        type="button"
        onClick={() => void share()}
        className={`station-actions__secondary ${copied ? "station-actions__secondary--success" : ""} ${className}`}
      >
        <ShareIcon className="h-5 w-5 shrink-0" />
        <span>{shown}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={`share-btn ${copied ? "share-btn--success" : ""} ${className}`}
    >
      <ShareIcon className="h-4 w-4 shrink-0 text-brand-accent" />
      <span>{shown}</span>
    </button>
  );
}
