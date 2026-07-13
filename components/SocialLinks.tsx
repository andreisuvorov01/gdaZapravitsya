import BotLinksClient from "./BotLinksClient";

interface SocialLinksProps {
  className?: string;
}

/** Ссылки на TG- и VK-ботов — компактная капсула. */
export default function SocialLinks({ className = "" }: SocialLinksProps) {
  return <BotLinksClient variant="header" className={className} />;
}
