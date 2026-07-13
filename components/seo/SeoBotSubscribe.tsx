import SocialBrandIcon from "@/components/SocialBrandIcon";
import {
  MAX_HANDLE,
  TELEGRAM_HANDLE,
  maxBotTrackUrl,
  telegramChannelUrl,
} from "@/lib/site";

interface SeoBotSubscribeProps {
  /** Для UTM: slug интента или «azs». */
  medium: string;
  /** Внутри блока engage — без внешних отступов. */
  embedded?: boolean;
}

/** Компактная подписка на Telegram и MAX на SEO-страницах. */
export default function SeoBotSubscribe({ medium, embedded }: SeoBotSubscribeProps) {
  const channels = [
    {
      brand: "telegram" as const,
      name: "Telegram",
      handle: TELEGRAM_HANDLE,
      href: telegramChannelUrl(medium),
    },
    {
      brand: "max" as const,
      name: "MAX",
      handle: MAX_HANDLE,
      href: maxBotTrackUrl(medium),
    },
  ];

  return (
    <section
      className={embedded ? "seo-bot-subscribe seo-bot-subscribe--embedded" : "seo-bot-subscribe mt-6"}
      aria-label="Подписка на каналы"
    >
      <div className="seo-bot-subscribe__row">
        <p className="seo-bot-subscribe__lead">
          <strong>Подпишитесь</strong>
          <span className="seo-bot-subscribe__lead-muted">
            {" "}
            — карта и новости в мессенджерах
          </span>
        </p>
        <div className="seo-bot-subscribe__pills" role="group" aria-label="Каналы">
          {channels.map((ch) => (
            <a
              key={ch.name}
              href={ch.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`seo-bot-subscribe__pill seo-bot-subscribe__pill--${ch.brand}`}
            >
              <SocialBrandIcon brand={ch.brand} className="h-4 w-4 shrink-0" />
              <span className="seo-bot-subscribe__pill-name">{ch.name}</span>
              <span className="seo-bot-subscribe__pill-handle">{ch.handle}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
