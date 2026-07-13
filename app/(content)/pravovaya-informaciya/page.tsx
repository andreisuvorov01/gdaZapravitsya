import type { Metadata } from "next";
import Link from "next/link";
import LegalDocLayout from "@/components/LegalDocLayout";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { LEGAL_DISCLAIMER, LEGAL_OPERATOR, LEGAL_PAGES, LEGAL_UPDATED, SITE_DOMAIN } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Правовая информация",
  description:
    "Правовые документы сервиса «бензрядом»: соглашение, конфиденциальность, cookie, отказ от ответственности.",
  alternates: { canonical: absoluteUrl("/pravovaya-informaciya") },
  openGraph: {
    title: `Правовая информация — ${SITE_NAME}`,
    url: absoluteUrl("/pravovaya-informaciya"),
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function LegalHubPage() {
  return (
    <LegalDocLayout
      title="Правовая информация"
      breadcrumb="Правовая информация"
      updated={LEGAL_UPDATED}
    >
      <p>
        На этой странице собраны документы, регулирующие использование сервиса «
        {SITE_NAME}» ({SITE_DOMAIN}). Оператор: {LEGAL_OPERATOR}.
      </p>

      <h2>Документы</h2>
      <ul className="legal-doc-list">
        {LEGAL_PAGES.filter((p) => p.href !== "/pravovaya-informaciya").map((p) => (
          <li key={p.href}>
            <Link href={p.href}>{p.label}</Link>
          </li>
        ))}
        <li>
          <Link href="/kontakty">Контакты и обратная связь</Link>
        </li>
        <li>
          <Link href="/o-servise">О сервисе</Link>
        </li>
      </ul>

      <h2>Краткий дисклеймер</h2>
      <div className="legal-callout">
        <p>{LEGAL_DISCLAIMER}</p>
      </div>

      <h2>Картографические данные</h2>
      <p>
        Базовый слой карты: © OpenStreetMap, OpenFreeMap — на условиях открытых
        лицензий. Указание авторства размещено в подвале сайта и на странице{" "}
        <Link href="/o-servise">«О сервисе»</Link>.
      </p>

      <h2>Аналитика</h2>
      <p>
        Для статистики посещений используется Яндекс.Метрика. Сервис не
        запрашивает регистрацию и не собирает контактные персональные данные при
        обычном просмотре карты.
      </p>
    </LegalDocLayout>
  );
}
