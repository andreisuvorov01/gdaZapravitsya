import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import FooterFeaturedCities from "@/components/FooterFeaturedCities";
import { DONATE_URL, SITE_NAME } from "@/lib/site";
import { LEGAL_PAGES } from "@/lib/legal";

// Подвал для контентных/SEO-страниц (не используется на карте-SPA).
export default function Footer() {
  const year = new Date().getFullYear();

  const sections: {
    title: string;
    links: { href: string; label: string; external?: boolean }[];
  }[] = [
      {
        title: "Карта и города",
        links: [
          { href: "/", label: "Карта АЗС" },
          { href: "/goroda", label: "Города" },
          { href: "/regiony", label: "Регионы" },
          { href: "/seti", label: "Сети АЗС" },
          { href: "/blog", label: "Статьи" },
        ],
      },
      {
        title: "Правовая информация",
        links: [
          { href: "/pravovaya-informaciya", label: "Обзор" },
          ...LEGAL_PAGES.filter((p) => p.href !== "/pravovaya-informaciya").map((p) => ({
            href: p.href,
            label: p.label,
          })),
        ],
      },
      {
        title: "О сервисе",
        links: [
          { href: "/faq", label: "Вопросы и ответы" },
          { href: "/o-servise", label: "О сервисе" },
          { href: "/kontakty", label: "Контакты" },
          ...(DONATE_URL
            ? [{ href: DONATE_URL, label: "Поблагодарить автора", external: true as const }]
            : []),
        ],
      },
    ];

  return (
    <footer className="mt-16 border-t border-white/10 bg-surface/60">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <BrandLogo showTagline={false} size="sm" href="/" />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
            Народная карта наличия топлива на АЗС России. Данные добавляют
            пользователи — уточняйте наличие на самой заправке.
          </p>
        </div>

        {sections.map((section) => (
          <nav key={section.title} aria-label={section.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {section.title}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {section.links.map((l) => (
                <li key={l.href}>
                  {l.external ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink/90 transition hover:text-brand-fuel"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-ink/90 transition hover:text-brand-fuel"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <FooterFeaturedCities />
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {year} {SITE_NAME}. Народный сервис, не связан с АЗС.{" "}
            <Link href="/polzovatelskoe-soglashenie" className="hover:text-brand-fuel">
              Условия использования
            </Link>
          </p>
          <p>Картографические данные © OpenStreetMap, OpenFreeMap</p>
        </div>
      </div>
    </footer>
  );
}
