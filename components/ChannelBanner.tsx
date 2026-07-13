"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SocialBrandIcon from "./SocialBrandIcon";
import { CloseIcon } from "./Icons";
import { useInstallPrompt } from "./InstallPromptContext";
import { COOKIE_NOTICE_KEY, isDismissed } from "@/lib/clientStorage";
import {
  CHANNEL_COPY,
  CHANNEL_PROMPT_EVENT,
  CHANNEL_REPORT_DELAY_MS,
  CHANNEL_RETURN_DELAY_MS,
  CHANNEL_TIMER_MS,
  canShowChannelPrompt,
  consumeReturnVisit,
  dismissChannelPrompt,
  isChannelPromptDevMode,
  markChannelSession,
  type ChannelPromptReason,
  wasChannelDismissedRecently,
  wasChannelShownThisSession,
} from "@/lib/channelPrompt";
import { isMobileViewport } from "@/lib/install";
import { isOnboardingComplete } from "@/lib/onboarding";
import {
  maxBotTrackUrl,
  TELEGRAM_HANDLE,
  telegramChannelUrl,
  vkCommunityTrackUrl,
} from "@/lib/site";

const SESSION_MIN_MS = 20_000;

/** Плашка подписки на каналы Telegram / MAX. */
export default function ChannelBanner() {
  const { showBanner: installOpen } = useInstallPrompt();
  const installOpenRef = useRef(installOpen);
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<ChannelPromptReason>("timer");
  const pendingTimer = useRef<number | null>(null);
  const sessionStart = useRef(Date.now());
  const exitIntentUsed = useRef(false);
  const leavePending = useRef(false);

  useEffect(() => {
    installOpenRef.current = installOpen;
  }, [installOpen]);

  const clearPending = useCallback(() => {
    if (pendingTimer.current !== null) {
      window.clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    dismissChannelPrompt();
    setVisible(false);
    clearPending();
  }, [clearPending]);

  const reveal = useCallback((nextReason: ChannelPromptReason) => {
    if (
      !canShowChannelPrompt() ||
      installOpenRef.current ||
      !isDismissed(COOKIE_NOTICE_KEY)
    ) {
      return false;
    }
    clearPending();
    setReason(nextReason);
    markChannelSession();
    setVisible(true);
    return true;
  }, [clearPending]);

  const scheduleReveal = useCallback(
    (nextReason: ChannelPromptReason, delayMs: number) => {
      if (!canShowChannelPrompt()) return;
      clearPending();
      const run = () => reveal(nextReason);
      if (delayMs <= 0) {
        run();
        return;
      }
      pendingTimer.current = window.setTimeout(() => {
        pendingTimer.current = null;
        run();
      }, delayMs);
    },
    [clearPending, reveal],
  );

  const whenReady = useCallback(
    (cb: () => void) => {
      const attempt = () => {
        if (!isOnboardingComplete() || !isDismissed(COOKIE_NOTICE_KEY)) return false;
        cb();
        return true;
      };
      if (attempt()) return undefined;
      const poll = window.setInterval(() => {
        if (attempt()) window.clearInterval(poll);
      }, 300);
      return () => window.clearInterval(poll);
    },
    [],
  );

  useEffect(() => {
    if (wasChannelDismissedRecently() || wasChannelShownThisSession()) return;

    const onPrompt = (event: Event) => {
      const detail = (event as CustomEvent<ChannelPromptReason>).detail;
      if (!detail) return;
      whenReady(() => scheduleReveal(detail, CHANNEL_REPORT_DELAY_MS));
    };

    window.addEventListener(CHANNEL_PROMPT_EVENT, onPrompt);
    return () => window.removeEventListener(CHANNEL_PROMPT_EVENT, onPrompt);
  }, [scheduleReveal, whenReady]);

  useEffect(() => {
    if (wasChannelDismissedRecently() || wasChannelShownThisSession()) return;

    const dev = isChannelPromptDevMode();
    const timerMs = dev ? 2_000 : CHANNEL_TIMER_MS;
    const returnDelayMs = dev ? 1_000 : CHANNEL_RETURN_DELAY_MS;
    const minSessionMs = dev ? 0 : SESSION_MIN_MS;

    sessionStart.current = Date.now();
    const cleanups: Array<() => void> = [];

    if (dev || consumeReturnVisit()) {
      const returnTimer = window.setTimeout(() => {
        const stop = whenReady(() => scheduleReveal("return", 0));
        if (stop) cleanups.push(stop);
      }, returnDelayMs);
      cleanups.push(() => window.clearTimeout(returnTimer));
    }

    const timer = window.setTimeout(() => {
      const stop = whenReady(() => scheduleReveal("timer", 0));
      if (stop) cleanups.push(stop);
    }, timerMs);
    cleanups.push(() => window.clearTimeout(timer));

    const onMouseLeave = (e: MouseEvent) => {
      if (
        exitIntentUsed.current ||
        wasChannelShownThisSession() ||
        isMobileViewport() ||
        e.clientY > 12
      ) {
        return;
      }
      if (Date.now() - sessionStart.current < minSessionMs) return;
      exitIntentUsed.current = true;
      whenReady(() => scheduleReveal("exit", 0));
    };

    const onVisibility = () => {
      if (!isMobileViewport()) return;
      if (document.visibilityState === "hidden") {
        if (
          Date.now() - sessionStart.current >= minSessionMs &&
          !wasChannelShownThisSession()
        ) {
          leavePending.current = true;
        }
        return;
      }
      if (
        document.visibilityState === "visible" &&
        leavePending.current &&
        !wasChannelShownThisSession()
      ) {
        leavePending.current = false;
        exitIntentUsed.current = true;
        whenReady(() => scheduleReveal("exit", 0));
      }
    };

    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibility);
    cleanups.push(() => {
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    });

    return () => {
      clearPending();
      for (const stop of cleanups) stop();
    };
  }, [clearPending, scheduleReveal, whenReady]);

  useEffect(() => {
    if (visible && installOpen) setVisible(false);
  }, [installOpen, visible]);

  if (!visible) return null;

  const copy = CHANNEL_COPY[reason];
  const medium = `banner_${reason}`;

  return (
    <div
      className="support-banner-wrap"
      role="dialog"
      aria-modal="true"
      aria-labelledby="channel-banner-title"
    >
      <div className="support-banner glass-dock">
        <span className="support-banner__glow" aria-hidden />

        <button
          type="button"
          onClick={dismiss}
          aria-label="Скрыть"
          className="support-banner__close"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>

        <div className="support-banner__head">
          <h2 id="channel-banner-title" className="support-banner__title">
            {copy.title}
          </h2>
          <p className="support-banner__hint">{copy.hint}</p>
        </div>

        <div className="support-banner__socials">
          <a
            href={telegramChannelUrl(medium)}
            target="_blank"
            rel="noopener noreferrer"
            className="support-banner__social support-banner__social--tg"
            onClick={dismiss}
          >
            <span className="support-banner__social-badge">
              <SocialBrandIcon brand="telegram" className="h-4 w-4" />
            </span>
            <span className="support-banner__social-text">
              <span className="support-banner__social-title">Telegram</span>
              <span className="support-banner__social-sub">{TELEGRAM_HANDLE}</span>
            </span>
          </a>
          <a
            href={maxBotTrackUrl(medium)}
            target="_blank"
            rel="noopener noreferrer"
            className="support-banner__social support-banner__social--max"
            onClick={dismiss}
          >
            <span className="support-banner__social-badge support-banner__social-badge--max">
              <SocialBrandIcon brand="max" className="h-4 w-4" />
            </span>
            <span className="support-banner__social-text">
              <span className="support-banner__social-title">MAX</span>
              <span className="support-banner__social-sub">Канал</span>
            </span>
          </a>
        </div>

        <div className="support-banner__actions support-banner__actions--channel">
          <button type="button" onClick={dismiss} className="support-banner__later">
            Позже
          </button>
        </div>

        <p className="support-banner__footer">
          <a
            href={vkCommunityTrackUrl(medium)}
            target="_blank"
            rel="noopener noreferrer"
            className="support-banner__footer-link support-banner__footer-link--muted"
          >
            ВКонтакте — запасной канал
          </a>
        </p>
      </div>
    </div>
  );
}
