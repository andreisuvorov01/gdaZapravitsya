import SocialBrandIcon from "./SocialBrandIcon";
import {
  MAX_BOT_TAGLINE,
  MAX_HANDLE,
  maxBotTrackUrl,
  TELEGRAM_BOT_TAGLINE,
  TELEGRAM_HANDLE,
  telegramChannelUrl,
  VK_BOT_TAGLINE,
  vkCommunityTrackUrl,
} from "@/lib/site";

type BotLinksVariant = "header" | "inline" | "cards";

interface BotLinksProps {
  variant?: BotLinksVariant;
  className?: string;
  /** UTM-метка источника клика. */
  medium?: string;
}

/** Ссылки на каналы TG / MAX — компактно в шапке или карточками в онбординге. */
export default function BotLinks({
  variant = "header",
  className = "",
  medium = "site",
}: BotLinksProps) {
  const tgUrl = telegramChannelUrl(medium);
  const maxUrl = maxBotTrackUrl(medium);
  const vkUrl = vkCommunityTrackUrl(medium);

  if (variant === "cards") {
    return (
      <div className={className}>
        <div
          className="bot-links-cards grid gap-2 sm:grid-cols-2"
          role="group"
          aria-label="Каналы бензрядом"
        >
          <a
            href={tgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bot-links-cards__card"
          >
            <span className="bot-links-cards__icon" aria-hidden>
              <SocialBrandIcon brand="telegram" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white">
                Telegram {TELEGRAM_HANDLE}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
                {TELEGRAM_BOT_TAGLINE}
              </span>
            </span>
          </a>
          <a
            href={maxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bot-links-cards__card"
          >
            <span className="bot-links-cards__icon" aria-hidden>
              <SocialBrandIcon brand="max" className="h-7 w-7" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white">
                MAX — {MAX_HANDLE}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
                {MAX_BOT_TAGLINE}
              </span>
            </span>
          </a>
        </div>
        <p className="mt-2 text-center text-xs text-ink-muted">
          <a
            href={vkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline decoration-white/15 underline-offset-2 hover:text-white"
          >
            <SocialBrandIcon brand="vk" className="h-3.5 w-3.5 text-[#0077ff]" />
            ВКонтакте — запасной канал
          </a>
        </p>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={`bot-links-inline ${className}`}
        role="group"
        aria-label="Каналы в Telegram и MAX"
      >
        <a
          href={tgUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bot-links-inline__pill"
          title={TELEGRAM_BOT_TAGLINE}
        >
          <SocialBrandIcon brand="telegram" className="h-3.5 w-3.5" />
          <span>Telegram</span>
        </a>
        <a
          href={maxUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bot-links-inline__pill"
          title={MAX_BOT_TAGLINE}
        >
          <SocialBrandIcon brand="max" className="h-3.5 w-3.5" />
          <span>MAX</span>
        </a>
      </div>
    );
  }

  return (
    <div
      className={`social-links ${className}`}
      role="group"
      aria-label="Каналы в Telegram, ВКонтакте и MAX"
    >
      <a
        href={tgUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={TELEGRAM_BOT_TAGLINE}
        aria-label={`Telegram: ${TELEGRAM_BOT_TAGLINE}`}
        className="social-links__btn"
      >
        <SocialBrandIcon brand="telegram" />
      </a>
      <span className="social-links__sep" aria-hidden />
      <a
        href={vkUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={VK_BOT_TAGLINE}
        aria-label={`ВКонтакте: ${VK_BOT_TAGLINE}`}
        className="social-links__btn"
      >
        <SocialBrandIcon brand="vk" />
      </a>
      <span className="social-links__sep" aria-hidden />
      <a
        href={maxUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={MAX_BOT_TAGLINE}
        aria-label={`MAX: ${MAX_BOT_TAGLINE}`}
        className="social-links__btn"
      >
        <SocialBrandIcon brand="max" className="h-7 w-7" />
      </a>
    </div>
  );
}
