import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_ITEMS, faqJsonLd } from "@/lib/faq";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import FaqList from "@/components/FaqList";

export const metadata: Metadata = {
  // Суффикс «| ГдеЗаправиться.рф» добавляет шаблон title из app/layout.tsx.
  title: "Вопросы и ответы о сервисе — карта наличия топлива",
  description:
    "Как работает карта наличия топлива «ГдеЗаправиться.рф», откуда берутся данные, официальные ли они, бесплатно ли это и как считаются статусы АЗС.",
  alternates: { canonical: absoluteUrl("/faq") },
  openGraph: {
    title: "Вопросы и ответы — ГдеЗаправиться.рф",
    description:
      "Всё о народной карте наличия топлива: данные, статусы, бесплатность.",
    url: absoluteUrl("/faq"),
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function FaqPage() {
  const jsonLd = faqJsonLd(FAQ_ITEMS);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        / <span className="text-ink">Вопросы и ответы</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Вопросы и ответы
      </h1>
      <p className="mt-4 text-base leading-relaxed text-ink-muted">
        Коротко о том, как устроена народная карта наличия топлива «ГдеЗаправиться.рф» и
        как ей пользоваться.
      </p>

      <div className="mt-8">
        <FaqList items={FAQ_ITEMS} />
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-surface/40 p-6">
        <h2 className="text-lg font-semibold text-ink">Остались вопросы?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Напишите нам в Telegram, ВКонтакте или MAX — ответим и поможем. Подробности
          на странице{" "}
          <Link href="/kontakty" className="text-brand-fuel underline">
            «Контакты»
          </Link>
          .
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-fuel px-5 py-2.5 font-semibold text-ink-dark shadow-glow transition hover:bg-brand-fuelDim"
        >
          Открыть карту АЗС
        </Link>
      </div>
    </div>
  );
}
