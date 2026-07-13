import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  // Суффикс «| ГдеЗаправиться.рф» добавляет шаблон title из app/layout.tsx.
  title: "О сервисе — народная карта наличия топлива",
  description:
    "«ГдеЗаправиться.рф» — бесплатная краудсорсинговая карта наличия топлива на АЗС России. Как работает сервис, откуда данные и кто их добавляет.",
  alternates: { canonical: absoluteUrl("/o-servise") },
  openGraph: {
    title: "О сервисе ГдеЗаправиться.рф",
    description: "Народная карта наличия топлива на АЗС России.",
    url: absoluteUrl("/o-servise"),
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        / <span className="text-ink">О сервисе</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        О сервисе «ГдеЗаправиться.рф»
      </h1>

      <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-muted">
        <p>
          «ГдеЗаправиться.рф» — это бесплатная народная карта наличия топлива на
          автозаправочных станциях России. Сервис помогает водителям быстро
          понять, на какой ближайшей АЗС сейчас есть бензин или дизель, какие
          действуют лимиты на руки и насколько большие очереди.
        </p>
        <p>
          Вся информация собирается методом краудсорсинга: статусы заправок
          отмечают сами автомобилисты. Чем больше свежих отчётов — тем точнее
          картина. Более новые отчёты учитываются с большим весом, а если данных
          давно не поступало, статус помечается как «нет данных».
        </p>
        <p>
          Сервисом можно пользоваться без регистрации и аккаунта — достаточно
          открыть карту. Отметить наличие топлива на АЗС может любой желающий за
          пару секунд.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-brand-fuel/30 bg-brand-fuel/10 p-5">
        <h2 className="text-base font-semibold text-ink">Важно</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Данные добавляют пользователи; уточняйте наличие на самой АЗС. Сервис
          не связан с нефтяными компаниями и не является официальным источником
          информации о работе заправок.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">Как читать статусы</h2>
        <ul className="mt-4 space-y-2 text-sm text-ink-muted">
          <li>
            <span className="font-semibold text-fuel-yes">Есть</span> — на
            заправке есть топливо по свежим отчётам.
          </li>
          <li>
            <span className="font-semibold text-fuel-low">Мало / лимит</span> —
            топливо заканчивается или действует ограничение на руки.
          </li>
          <li>
            <span className="font-semibold text-fuel-no">Нет</span> — топлива
            нет по последним отчётам.
          </li>
          <li>
            <span className="font-semibold text-ink">Нет данных</span> — свежих
            отчётов пока не поступало.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">Карта и данные</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Базовый слой карты и данные о расположении заправок используются на
          условиях открытых лицензий.
        </p>
        <p className="mt-3 rounded-xl border border-white/10 bg-surface/50 px-4 py-3 text-sm text-ink-muted">
          Картографические данные © OpenStreetMap, OpenFreeMap
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-fuel px-5 py-2.5 font-semibold text-ink-dark shadow-glow transition hover:bg-brand-fuelDim"
        >
          Открыть карту АЗС
        </Link>
        <Link
          href="/faq"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 font-semibold text-ink transition hover:bg-white/10"
        >
          Вопросы и ответы
        </Link>
      </div>
    </div>
  );
}
