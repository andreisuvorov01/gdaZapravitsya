"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SocialBrandIcon from "@/components/SocialBrandIcon";
import {
  BellIcon,
  CloseIcon,
  DesktopIcon,
  InstallIcon,
  ShareIcon,
} from "@/components/Icons";
import { useInstallPrompt } from "@/components/InstallPromptContext";
import { copyOrShare } from "@/lib/share";
import {
  buildSeoSharePayload,
  shareChannelUrl,
  type ShareChannel,
} from "@/lib/seo-page-share";
import { SEO_SUBSCRIBE_CHANNELS } from "@/lib/seo-engage";

type Panel = "share" | "subscribe" | null;

interface SeoFloatingEngageProps {
  medium: string;
  pageUrl: string;
  cityName: string;
  cityPrep: string;
  pageTitle: string;
}

const SHARE_ACTIONS: {
  id: ShareChannel;
  label: string;
  icon?: "telegram" | "whatsapp";
}[] = [
  { id: "telegram", label: "Telegram", icon: "telegram" },
  { id: "whatsapp", label: "WhatsApp", icon: "whatsapp" },
  { id: "copy", label: "Ссылка" },
];

const SUBSCRIBE_CHANNELS = SEO_SUBSCRIBE_CHANNELS;

const SCROLL_SHOW_PX = 280;

/** Плавающие кнопки «Поделиться» и «Каналы» — появляются при скролле. */
export default function SeoFloatingEngage({
  medium,
  pageUrl,
  cityName,
  cityPrep,
  pageTitle,
}: SeoFloatingEngageProps) {
  const [visible, setVisible] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
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
    if (!panel) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setPanel(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  const handleShare = useCallback(
    async (channel: ShareChannel) => {
      if (channel === "copy") {
        try {
          await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2200);
        } catch {
          await copyOrShare(payload);
        }
        return;
      }
      if (channel === "native") {
        await copyOrShare(payload);
        setPanel(null);
        return;
      }
      window.open(shareChannelUrl(channel, payload), "_blank", "noopener,noreferrer");
      setPanel(null);
    },
    [payload]
  );

  const togglePanel = (next: Panel) => {
    setPanel((current) => (current === next ? null : next));
  };

  return (
    <div
      ref={rootRef}
      className={`seo-float-engage${visible ? " seo-float-engage--visible" : ""}`}
      aria-hidden={!visible}
    >
      {panel === "share" && (
        <div className="seo-float-card" role="dialog" aria-label="Поделиться картой">
          <button
            type="button"
            className="seo-float-card__close"
            aria-label="Закрыть"
            onClick={() => setPanel(null)}
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
          <div className="seo-float-card__actions" role="group" aria-label="Куда отправить">
            {SHARE_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className="seo-float-card__action"
                onClick={() => void handleShare(action.id)}
              >
                {action.icon === "telegram" && (
                  <SocialBrandIcon brand="telegram" className="h-5 w-5" />
                )}
                {action.icon === "whatsapp" && (
                  <span className="seo-float-card__wa" aria-hidden>
                    WA
                  </span>
                )}
                {action.id === "copy" && (
                  <ShareIcon className="h-5 w-5 opacity-90" />
                )}
                <span>{action.id === "copy" && copied ? "Скопировано" : action.label}</span>
              </button>
            ))}
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                className="seo-float-card__action"
                onClick={() => void handleShare("native")}
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
                  setPanel(null);
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

      {panel === "subscribe" && (
        <div className="seo-float-card" role="dialog" aria-label="Каналы бензрядом">
          <button
            type="button"
            className="seo-float-card__close"
            aria-label="Закрыть"
            onClick={() => setPanel(null)}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
          <p className="seo-float-card__eyebrow">Оставайтесь на связи</p>
          <p className="seo-float-card__title">Каналы бензрядом</p>
          <p className="seo-float-card__text">
            Когда сайт недоступен или нужно написать команде — подпишитесь на канал,
            который у вас открывается.
          </p>
          <ul className="seo-float-card__channels">
            {SUBSCRIBE_CHANNELS.map((ch) => (
              <li key={ch.brand}>
                <a
                  href={ch.href(medium)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="seo-float-channel"
                  onClick={() => setPanel(null)}
                >
                  <span className="seo-float-channel__icon" aria-hidden>
                    <SocialBrandIcon brand={ch.brand} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="seo-float-channel__name">{ch.name}</span>
                    <span className="seo-float-channel__benefit">{ch.benefit}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="seo-float-engage__fab-row">
        <button
          type="button"
          className={`seo-float-fab seo-float-fab--subscribe${panel === "subscribe" ? " seo-float-fab--active" : ""}`}
          aria-expanded={panel === "subscribe"}
          aria-label="Каналы и подписка"
          onClick={() => togglePanel("subscribe")}
        >
          <BellIcon className="h-5 w-5 shrink-0" />
          <span className="seo-float-fab__label">Каналы</span>
        </button>
        <button
          type="button"
          className={`seo-float-fab seo-float-fab--share${panel === "share" ? " seo-float-fab--active" : ""}`}
          aria-expanded={panel === "share"}
          aria-label="Поделиться картой"
          onClick={() => togglePanel("share")}
        >
          <ShareIcon className="h-5 w-5 shrink-0" />
          <span className="seo-float-fab__label">Поделиться</span>
        </button>
      </div>
    </div>
  );
}
