"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SocialBrandIcon from "@/components/SocialBrandIcon";
import { DesktopIcon, InstallIcon, ShareIcon } from "@/components/Icons";
import { useInstallPrompt } from "@/components/InstallPromptContext";
import { copyOrShare } from "@/lib/share";
import {
  buildSeoSharePayload,
  shareChannelUrl,
  SHARE_CHANNELS,
  type ShareChannel,
} from "@/lib/seo-page-share";

interface SeoSharePanelProps {
  pageUrl: string;
  cityName: string;
  cityPrep: string;
  pageTitle: string;
  source?: string;
  embedded?: boolean;
}

const QUICK_CHANNELS: ShareChannel[] = ["telegram", "whatsapp", "copy"];

/** Компактный блок «Поделиться» на SEO-страницах. */
export default function SeoSharePanel({
  pageUrl,
  cityName,
  cityPrep,
  pageTitle,
  embedded,
}: SeoSharePanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const install = useInstallPrompt();

  const payload = buildSeoSharePayload({ pageUrl, cityName, cityPrep, pageTitle });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const handleChannel = useCallback(
    async (channel: ShareChannel) => {
      if (channel === "copy") {
        try {
          await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2200);
        } catch {
          await copyOrShare(payload);
        }
        setOpen(false);
        return;
      }
      if (channel === "native") {
        await copyOrShare(payload);
        setOpen(false);
        return;
      }
      window.open(shareChannelUrl(channel, payload), "_blank", "noopener,noreferrer");
      setOpen(false);
    },
    [payload]
  );

  const quickMeta: Record<
    ShareChannel,
    { label: string; icon?: "telegram" | "whatsapp" }
  > = {
    telegram: { label: "Telegram", icon: "telegram" },
    whatsapp: { label: "WhatsApp", icon: "whatsapp" },
    copy: { label: copied ? "Скопировано" : "Скопировать" },
    vk: { label: "ВКонтакте" },
    max: { label: "MAX" },
    native: { label: "Ещё" },
  };

  const installLabel = install.mobile ? "На экран" : "На стол";
  const installTitle = install.mobile
    ? "Добавить на экран"
    : "Добавить на рабочий стол";

  return (
    <section
      ref={rootRef}
      className={embedded ? "seo-share-block seo-share-block--embedded" : "seo-share-block mt-6"}
      aria-label="Поделиться картой"
    >
      <div className="seo-share-block__inner">
        <p className="seo-share-block__headline">
          <span className="seo-share-block__title">Поделиться</span>
          <span className="seo-share-block__hint"> — скиньте карту {cityPrep}</span>
        </p>

        <div className="seo-share-block__quick" role="group" aria-label="Быстрая отправка">
          {QUICK_CHANNELS.map((id) => {
            const meta = quickMeta[id];
            return (
              <button
                key={id}
                type="button"
                className="seo-share-block__quick-btn"
                onClick={() => void handleChannel(id)}
              >
                {meta.icon === "telegram" && (
                  <SocialBrandIcon brand="telegram" className="h-4 w-4" />
                )}
                {meta.icon === "whatsapp" && (
                  <span className="seo-share-block__wa" aria-hidden>
                    WA
                  </span>
                )}
                {id === "copy" && !meta.icon && (
                  <ShareIcon className="h-4 w-4 shrink-0 opacity-80" />
                )}
                <span>{meta.label}</span>
              </button>
            );
          })}

          {install.showChip && (
            <button
              type="button"
              className="seo-share-block__quick-btn seo-share-block__quick-btn--install"
              title={installTitle}
              aria-label={installTitle}
              onClick={() => install.openBanner()}
            >
              {install.mobile ? (
                <InstallIcon className="h-4 w-4 shrink-0 text-brand-accent" />
              ) : (
                <DesktopIcon className="h-4 w-4 shrink-0 text-brand-accent" />
              )}
              <span>{installLabel}</span>
            </button>
          )}

          <button
            type="button"
            className="seo-share-block__quick-btn seo-share-block__quick-btn--more"
            aria-expanded={open}
            onClick={() => {
              if (typeof navigator !== "undefined" && "share" in navigator) {
                void handleChannel("native");
                return;
              }
              setOpen((v) => !v);
            }}
          >
            Ещё
          </button>
        </div>

        {open && (
          <div className="seo-share-block__menu" role="menu" aria-label="Куда отправить ссылку">
            {SHARE_CHANNELS.filter((ch) => !QUICK_CHANNELS.includes(ch.id)).map((ch) => (
              <button
                key={ch.id}
                type="button"
                role="menuitem"
                className="seo-share-panel__item"
                onClick={() => void handleChannel(ch.id)}
              >
                <span className="seo-share-panel__item-label">{ch.label}</span>
                <span className="seo-share-panel__item-hint">{ch.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
