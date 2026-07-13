import type { Metadata } from "next";
import Link from "next/link";
import BotLinks from "@/components/BotLinks";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  // Суффикс «| бензрядом» добавляет шаблон title из app/layout.tsx.
  title: "Контакты",
  description:
    "Боты «бензрядом» в Telegram, ВКонтакте и MAX: где рабочие заправки, даже при ограничениях интернета.",
  alternates: { canonical: absoluteUrl("/kontakty") },
  openGraph: {
    title: "Контакты — бензрядом",
    description: "Telegram-, VK- и MAX-боты сервиса бензрядом.",
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
        Контакты и боты
      </h1>
      <p className="mt-4 text-base leading-relaxed text-ink-muted">
        Карта на сайте — основной способ. Если удобнее в мессенджере: боты в
        Telegram, ВКонтакте и MAX подскажут рабочие заправки, а бот
        ВКонтакте отвечает даже при ограничениях интернета.
      </p>

      <BotLinks variant="cards" className="mt-8" />

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
