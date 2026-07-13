"use client";

import { useCallback, useState } from "react";
import { ShareIcon } from "@/components/Icons";
import { copyOrShare } from "@/lib/share";
import { SEO_SHARE_MOTIVATION } from "@/lib/seo-engage";
import { buildSeoSharePayload } from "@/lib/seo-page-share";

interface SeoListEngageProps {
  medium: string;
  pageUrl: string;
  cityName: string;
  cityPrep: string;
  pageTitle: string;
}

/** Поделиться картой сразу после списка АЗС на SEO-страницах. */
export default function SeoListEngage({
  pageUrl,
  cityName,
  cityPrep,
  pageTitle,
}: SeoListEngageProps) {
  const [copied, setCopied] = useState(false);
  const payload = buildSeoSharePayload({ pageUrl, cityName, cityPrep, pageTitle });

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
    <aside className="seo-list-engage" aria-label="Поделиться картой">
      <section className="seo-list-engage__block">
        <h3 className="seo-list-engage__title">Поделитесь картой {cityPrep}</h3>
        <p className="seo-list-engage__text">{SEO_SHARE_MOTIVATION}</p>
        <div className="seo-list-engage__share" role="group" aria-label="Поделиться ссылкой">
          <button
            type="button"
            className="seo-list-engage__share-btn"
            onClick={() => void handleCopy()}
          >
            <ShareIcon className="h-4 w-4 opacity-90" />
            <span>{copied ? "Скопировано" : "Скопировать ссылку"}</span>
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              className="seo-list-engage__share-btn seo-list-engage__share-btn--accent"
              onClick={() => void copyOrShare(payload)}
            >
              <ShareIcon className="h-4 w-4" />
              <span>Поделиться</span>
            </button>
          )}
        </div>
      </section>
    </aside>
  );
}
