"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CloseIcon,
  DesktopIcon,
  GiftIcon,
  InstallIcon,
  LightbulbIcon,
  MoreIcon,
  BellIcon,
} from "./Icons";
import { useInstallPrompt } from "./InstallPromptContext";
import SocialBrandIcon from "./SocialBrandIcon";
import ShareButton from "./ShareButton";
import {
  DONATE_URL,
  FEEDBACK_TELEGRAM_URL,
  MAX_BOT_TAGLINE,
  MAX_HANDLE,
  maxBotTrackUrl,
  TELEGRAM_BOT_TAGLINE,
  TELEGRAM_HANDLE,
  telegramChannelUrl,
  vkCommunityTrackUrl,
} from "@/lib/site";
import { MENU_NAV_LINKS } from "@/lib/nav";
import { currentPageUrl } from "@/lib/share";
import {
  favoriteAlertsEnabled,
  requestFavoriteAlertPermission,
  setFavoriteAlertsEnabled,
} from "@/lib/favoriteAlerts";

const PAGE_LINKS = [...MENU_NAV_LINKS];

/** Компактное меню «⋯»: страницы, связь, донат. */
export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [favAlerts, setFavAlerts] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const install = useInstallPrompt();

  useEffect(() => {
    setFavAlerts(favoriteAlertsEnabled());
  }, [open]);

  useEffect(() => {
    if (open) setShareUrl(currentPageUrl());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Ещё"
        className="header-icon-btn"
      >
        <MoreIcon className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Закрыть меню"
            className="overlay-backdrop-in fixed inset-0 z-[1350] bg-black/55 sm:hidden"
            onClick={close}
          />
          <div
            className="header-menu header-menu--mobile-sheet glass-dock overlay-pop-in z-[1400] sm:absolute sm:z-[800] sm:inset-auto sm:right-0 sm:top-[calc(100%+0.375rem)] sm:max-h-[min(70dvh,calc(100dvh-5rem))] sm:overflow-y-auto"
            role="menu"
          >
          <div className="mb-2 flex items-center justify-between px-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Страницы
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Закрыть"
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-white/10"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <ul className="space-y-0.5">
            {PAGE_LINKS.map((link) => (
              <li key={link.href} role="none">
                <Link
                  href={link.href}
                  role="menuitem"
                  className="header-menu__item"
                  onClick={close}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="header-menu__divider" role="separator" />

          <div className="mb-2 px-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Связь и поддержка
            </span>
          </div>

          <ul className="header-menu__actions" role="none">
            <li role="none">
              <a
                href={telegramChannelUrl("header_menu")}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                className="header-menu__action"
                onClick={close}
              >
                <span className="header-menu__action-icon header-menu__action-icon--tg" aria-hidden>
                  <SocialBrandIcon brand="telegram" className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block">Telegram</span>
                  <span className="block text-xs font-normal text-ink-muted">
                    {TELEGRAM_HANDLE} · {TELEGRAM_BOT_TAGLINE}
                  </span>
                </span>
              </a>
            </li>
            <li role="none">
              <a
                href={maxBotTrackUrl("header_menu")}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                className="header-menu__action"
                onClick={close}
              >
                <span className="header-menu__action-icon" aria-hidden>
                  <SocialBrandIcon brand="max" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block">MAX</span>
                  <span className="block text-xs font-normal text-ink-muted">
                    {MAX_HANDLE} · {MAX_BOT_TAGLINE}
                  </span>
                </span>
              </a>
            </li>
            <li role="none">
              <a
                href={vkCommunityTrackUrl("header_menu")}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                className="header-menu__action header-menu__action--muted"
                onClick={close}
              >
                <span className="header-menu__action-icon header-menu__action-icon--vk" aria-hidden>
                  <SocialBrandIcon brand="vk" className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block">ВКонтакте</span>
                  <span className="block text-xs font-normal text-ink-muted">
                    Запасной канал
                  </span>
                </span>
              </a>
            </li>
            <li role="none">
              <a
                href={FEEDBACK_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                className="header-menu__action"
                onClick={close}
              >
                <span className="header-menu__action-icon" aria-hidden>
                  <LightbulbIcon className="h-4 w-4 text-brand-fuel" />
                </span>
                <span className="min-w-0 flex-1">Предложение по улучшению</span>
              </a>
            </li>
            {shareUrl && (
              <li role="none">
                <ShareButton
                  variant="menu"
                  url={shareUrl}
                  title="бензрядом"
                  text="Карта наличия топлива на АЗС России"
                  label="Поделиться картой"
                  copiedLabel="Ссылка скопирована"
                  onDone={close}
                />
              </li>
            )}
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="header-menu__action"
                onClick={() => {
                  void (async () => {
                    if (!favAlerts) {
                      const ok = await requestFavoriteAlertPermission();
                      setFavAlerts(ok && favoriteAlertsEnabled());
                    } else {
                      setFavoriteAlertsEnabled(false);
                      setFavAlerts(false);
                    }
                  })();
                  close();
                }}
              >
                <span className="header-menu__action-icon" aria-hidden>
                  <BellIcon
                    className={`h-4 w-4 ${favAlerts ? "text-brand-fuel" : "text-ink-muted"}`}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block">Уведомления об избранных</span>
                  <span className="block text-xs font-normal text-ink-muted">
                    {favAlerts ? "Включены" : "Сообщим об изменении статуса"}
                  </span>
                </span>
              </button>
            </li>
            {DONATE_URL && (
              <li role="none">
                <a
                  href={DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  className="header-menu__action header-menu__action--accent"
                  onClick={close}
                >
                  <span className="header-menu__action-icon" aria-hidden>
                    <GiftIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">Поблагодарить автора</span>
                </a>
              </li>
            )}
            {install.showChip && (
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="header-menu__action"
                  onClick={() => {
                    install.openBanner();
                    close();
                  }}
                >
                  <span className="header-menu__action-icon" aria-hidden>
                    {install.mobile ? (
                      <InstallIcon className="h-4 w-4 text-brand-accent" />
                    ) : (
                      <DesktopIcon className="h-4 w-4 text-brand-accent" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    {install.mobile ? "На главный экран" : "На рабочий стол"}
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>
        </>
      )}
    </div>
  );
}
