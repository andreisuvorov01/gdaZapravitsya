"use client";

import { useCallback, useState } from "react";
import SocialBrandIcon from "@/components/SocialBrandIcon";
import { ShareIcon } from "@/components/Icons";
import { copyOrShare } from "@/lib/share";
import {
  SEO_SHARE_MOTIVATION,
  SEO_SUBSCRIBE_CHANNELS,
  SEO_SUBSCRIBE_MOTIVATION,
} from "@/lib/seo-engage";
import {
  buildSeoSharePayload,
  shareChannelUrl,
  type ShareChannel,
} from "@/lib/seo-page-share";

interface SeoListEngageProps {
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
  { id: "copy", label: "Скопировать ссылку" },
];

/** Подписка и шаринг сразу после списка АЗС на SEO-страницах. */
export default function SeoListEngage({
  medium,
  pageUrl,
  cityName,
  cityPrep,
  pageTitle,
}: SeoListEngageProps) {
  const [copied, setCopied] = useState(false);
  const payload = buildSeoSharePayload({ pageUrl, cityName, cityPrep, pageTitle });

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
        return;
      }
      window.open(shareChannelUrl(channel, payload), "_blank", "noopener,noreferrer");
    },
    [payload]
  );

  return (
    <aside className="seo-list-engage" aria-label="Подписка и поделиться картой">
      <div className="seo-list-engage__grid">
        <section className="seo-list-engage__block" aria-labelledby="seo-list-engage-subscribe">
          <h3 id="seo-list-engage-subscribe" className="seo-list-engage__title">
            Подпишитесь на каналы
          </h3>
          <p className="seo-list-engage__text">{SEO_SUBSCRIBE_MOTIVATION}</p>
          <ul className="seo-list-engage__channels">
            {SEO_SUBSCRIBE_CHANNELS.map((ch) => (
              <li key={ch.brand}>
                <a
                  href={ch.href(medium)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="seo-list-engage__channel"
                >
                  <span className="seo-list-engage__channel-icon" aria-hidden>
                    <SocialBrandIcon brand={ch.brand} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="seo-list-engage__channel-name">{ch.name}</span>
                    <span className="seo-list-engage__channel-benefit">{ch.benefit}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="seo-list-engage__block" aria-labelledby="seo-list-engage-share">
          <h3 id="seo-list-engage-share" className="seo-list-engage__title">
            Поделитесь картой {cityPrep}
          </h3>
          <p className="seo-list-engage__text">{SEO_SHARE_MOTIVATION}</p>
          <div className="seo-list-engage__share" role="group" aria-label="Куда отправить ссылку">
            {SHARE_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className="seo-list-engage__share-btn"
                onClick={() => void handleShare(action.id)}
              >
                {action.icon === "telegram" && (
                  <SocialBrandIcon brand="telegram" className="h-4 w-4" />
                )}
                {action.icon === "whatsapp" && (
                  <span className="seo-list-engage__wa" aria-hidden>
                    WA
                  </span>
                )}
                {action.id === "copy" && <ShareIcon className="h-4 w-4 opacity-90" />}
                <span>
                  {action.id === "copy" && copied ? "Скопировано" : action.label}
                </span>
              </button>
            ))}
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                className="seo-list-engage__share-btn seo-list-engage__share-btn--accent"
                onClick={() => void handleShare("native")}
              >
                <ShareIcon className="h-4 w-4" />
                <span>Поделиться</span>
              </button>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
