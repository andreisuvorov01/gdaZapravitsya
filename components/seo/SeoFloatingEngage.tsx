"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CloseIcon,
  DesktopIcon,
  InstallIcon,
  ShareIcon,
} from "@/components/Icons";
import { useInstallPrompt } from "@/components/InstallPromptContext";
import { copyOrShare } from "@/lib/share";
import { buildSeoSharePayload } from "@/lib/seo-page-share";

interface SeoFloatingEngageProps {
  medium: string;
  pageUrl: string;
  cityName: string;
  cityPrep: string;
  pageTitle: string;
}

const SCROLL_SHOW_PX = 280;

/** Плавающая кнопка «Поделиться» — появляется при скролле. */
export default function SeoFloatingEngage({
  pageUrl,
  cityName,
  cityPrep,
  pageTitle,
}: SeoFloatingEngageProps) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const install = useInstallPrompt();

  const payload = buildSeoSharePayload({ pageUrl, cityName, cityPrep, pageTitle });

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_SHOW_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      await copyOrShare(payload);
    }
  }, [payload]);

  return (
    <div
      ref={rootRef}
      className={`seo-float-engage${visible ? " seo-float-engage--visible" : ""}`}
      aria-hidden={!visible}
    >
      {open && (
        <div className="seo-float-card" role="dialog" aria-label="Поделиться картой">
          <button
            type="button"
            className="seo-float-card__close"
            aria-label="Закрыть"
            onClick={() => setOpen(false)}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
          <p className="seo-float-card__eyebrow">Помогите карте расти</p>
          <p className="seo-float-card__title">
            Скиньте ссылку водителям {cityPrep}
          </p>
          <p className="seo-float-card__text">
            Чем больше людей на карте — тем чаще обновляются отметки на заправках.
            Одна ссылка в чат = точнее данные для всех.
          </p>
          <div className="seo-float-card__actions" role="group" aria-label="Поделиться">
            <button
              type="button"
              className="seo-float-card__action"
              onClick={() => void handleCopy()}
            >
              <ShareIcon className="h-5 w-5 opacity-90" />
              <span>{copied ? "Скопировано" : "Скопировать ссылку"}</span>
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                className="seo-float-card__action"
                onClick={() => {
                  void copyOrShare(payload);
                  setOpen(false);
                }}
              >
                <ShareIcon className="h-5 w-5 opacity-90" />
                <span>Ещё</span>
              </button>
            )}
            {install.showChip && (
              <button
                type="button"
                className="seo-float-card__action"
                title={
                  install.mobile ? "Добавить на экран" : "Добавить на рабочий стол"
                }
                onClick={() => {
                  install.openBanner();
                  setOpen(false);
                }}
              >
                {install.mobile ? (
                  <InstallIcon className="h-5 w-5 text-brand-accent" />
                ) : (
                  <DesktopIcon className="h-5 w-5 text-brand-accent" />
                )}
                <span>{install.mobile ? "На экран" : "На стол"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="seo-float-engage__fab-row">
        <button
          type="button"
          className={`seo-float-fab seo-float-fab--share${open ? " seo-float-fab--active" : ""}`}
          aria-expanded={open}
          aria-label="Поделиться картой"
          onClick={() => setOpen((v) => !v)}
        >
          <ShareIcon className="h-5 w-5 shrink-0" />
          <span className="seo-float-fab__label">Поделиться</span>
        </button>
      </div>
    </div>
  );
}
