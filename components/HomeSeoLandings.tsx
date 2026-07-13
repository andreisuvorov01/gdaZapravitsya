import Link from "next/link";
import { CITY_PRESETS } from "@/lib/cities";
import { HOME_FEATURED_CITIES, HOME_H1_CONTINUATION } from "@/lib/home-seo";
import { homeSearchFaq } from "@/lib/seo-faq";
import { findSeoIntent } from "@/lib/seo-intents";
import { FUEL_SLUG_ENTRIES } from "@/lib/fuel-slugs";
import { getTrafficWinnerBrands, PRIORITY_INTENT_SLUGS } from "@/lib/seo-growth";
import FaqList from "@/components/FaqList";

/**
 * Видимая SEO-разметка главной (H1–H6) под запросы «где бензин», «где заправиться».
 * Карта — сверху на весь экран; этот блок — ниже, при прокрутке (для людей и роботов).
 */
export default function HomeSeoLandings() {
  const priorityIntents = PRIORITY_INTENT_SLUGS.map((slug) => findSeoIntent(slug)).filter(
    (i): i is NonNullable<typeof i> => Boolean(i)
  );
  const trafficBrands = getTrafficWinnerBrands();

  return (
    <article
      id="o-karte"
      className="home-landings border-t border-white/10 bg-surface-map text-ink"
    >
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="seo-page-h1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
          Где бензин сейчас?{" "}
          <span className="text-brand-fuel">бенз</span>рядом
        </h1>
        <p className="seo-page-lead mt-3 text-lg font-medium leading-snug text-white/90 sm:text-xl">
          {HOME_H1_CONTINUATION}
        </p>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          Откройте карту выше или выберите город ниже — зелёные метки значат,
          что кто-то недавно отметил наличие топлива. Это не данные от сетей АЗС,
          а живые отметки за пару секунд с телефона. Перед заездом лучше
          перепроверить на заправке или спросить в боте.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Что с заправками в вашем городе
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
            Откройте карту или выберите город — увидите цветные метки: зелёный
            «есть», оранжевый «мало или лимит», красный «нет», серый «пока нет
            отчётов». Нажмите на АЗС — отчёты, очередь, можно подтвердить чужую
            отметку.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {HOME_FEATURED_CITIES.map((c) => (
              <Link
                key={c.slug}
                href={`/gde-benzin/${c.slug}`}
                className="home-landings__chip"
              >
                Бензин — {c.name}
              </Link>
            ))}
            <Link href="/goroda" className="home-landings__chip home-landings__chip--accent">
              Все {CITY_PRESETS.length} городов
            </Link>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Где заправиться и на какой АЗС есть бензин
          </h2>
          <h3 className="mt-4 text-base font-semibold text-white">
            Где бензин и куда заехать
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Ищете «где бензин», «где заправиться» или «на какой заправке есть
            бенз» — у нас отдельные подборки по каждому городу с актуальными
            отметками и ссылкой на карту.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {priorityIntents.slice(0, 6).map((intent) => (
              <li key={intent.slug}>
                <Link href={`/${intent.slug}`} className="home-landings__link">
                  {intent.hubH1}
                </Link>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-base font-semibold text-white">
            Очереди и лимиты на заправках
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            В отметке можно указать длину очереди и лимит литров — это помогает
            понять, стоит ли ехать на конкретную колонку.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            <li>
              <Link href="/ocheredi-na-azs" className="home-landings__chip">
                Очереди на АЗС
              </Link>
            </li>
            <li>
              <Link href="/limity-na-benzin" className="home-landings__chip">
                Лимиты на бензин
              </Link>
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Топливо и сети заправок
          </h2>
          <h3 className="mt-4 text-base font-semibold text-white">
            Бензин АИ-92, АИ-95, дизель
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {FUEL_SLUG_ENTRIES.map((f) => (
              <Link
                key={f.slug}
                href={`/azs/kirov/${f.slug}`}
                className="home-landings__chip"
              >
                {f.label} — Киров
              </Link>
            ))}
          </div>
          <h3 className="mt-6 text-base font-semibold text-white">
            Популярные сети АЗС
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {trafficBrands.map((b) => (
              <Link
                key={b.slug}
                href={`/seti/${b.slug}/kirov`}
                className="home-landings__chip"
              >
                {b.name} — Киров
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {priorityIntents.slice(6).map((intent) => (
              <Link
                key={intent.slug}
                href={`/${intent.slug}`}
                className="home-landings__chip"
              >
                {intent.breadcrumb}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-label="Частые вопросы">
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Частые вопросы о бензине на карте
          </h2>
          <div className="mt-4">
            <FaqList items={homeSearchFaq()} />
          </div>
        </section>

        <section className="mt-10">
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/faq" className="home-landings__cta home-landings__cta--ghost">
              Вопросы и ответы
            </Link>
          </div>
        </section>

        <h2 className="sr-only">Разделы карты ГдеЗаправиться.рф</h2>
        <h3 className="sr-only">Города и регионы</h3>
        <h3 className="sr-only">Статьи и справка</h3>
      </div>
    </article>
  );
}
