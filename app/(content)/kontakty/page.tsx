import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  // Суффикс «| ГдеЗаправиться.рф» добавляет шаблон title из app/layout.tsx.
  title: "Контакты",
  description:
    "Карта наличия топлива «ГдеЗаправиться.рф» — как устроен сервис и куда обращаться по вопросам.",
  alternates: { canonical: absoluteUrl("/kontakty") },
  openGraph: {
    title: "Контакты — ГдеЗаправиться.рф",
    description: "Как устроен сервис ГдеЗаправиться.рф и куда обращаться по вопросам.",
    url: absoluteUrl("/kontakty"),
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function ContactsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        / <span className="text-ink">Контакты</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Контакты
      </h1>
      <p className="mt-4 text-base leading-relaxed text-ink-muted">
        Карта на сайте — единственный и основной способ пользоваться сервисом.
        Регистрация не требуется: любой может отметить статус заправки прямо
        на карте.
      </p>

      <div className="mt-8 rounded-2xl border border-brand-fuel/30 bg-brand-fuel/10 p-5">
        <p className="text-sm leading-relaxed text-ink-muted">
          Данные добавляют пользователи; уточняйте наличие на самой АЗС.
          Помогая отмечать статусы заправок, вы делаете карту точнее для всех.
        </p>
      </div>

      <div className="mt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-fuel px-5 py-2.5 font-semibold text-ink-dark shadow-glow transition hover:bg-brand-fuelDim"
        >
          Открыть карту АЗС
        </Link>
      </div>
    </div>
  );
}
