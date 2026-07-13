import type { Metadata } from "next";
import Link from "next/link";
import LegalDocLayout from "@/components/LegalDocLayout";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { LEGAL_UPDATED, YANDEX_METRIKA_ID, YANDEX_PRIVACY_URL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Политика использования cookie",
  description:
    "Какие cookie и локальные данные использует «бензрядом»: технические файлы, Яндекс.Метрика, реклама РСЯ, localStorage.",
  alternates: { canonical: absoluteUrl("/cookies") },
  openGraph: {
    title: `Политика cookie — ${SITE_NAME}`,
    url: absoluteUrl("/cookies"),
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function CookiesPage() {
  return (
    <LegalDocLayout
      title="Политика использования cookie"
      breadcrumb="Cookie"
      updated={LEGAL_UPDATED}
    >
      <p>
        На сайте «{SITE_NAME}» используются файлы cookie и аналогичные технологии.
        Ниже — какие именно и зачем. Подробнее о персональных данных — в{" "}
        <Link href="/confidentialnost">политике конфиденциальности</Link>.
      </p>

      <h2>1. Что такое cookie</h2>
      <p>
        Cookie — небольшие фрагменты данных, которые браузер сохраняет на вашем
        устройстве. Они помогают сайту работать корректно и собирать обезличенную
        статистику.
      </p>

      <h2>2. Какие cookie мы используем</h2>

      <h3>2.1. Технические (необходимые)</h3>
      <p>
        Обеспечивают базовую работу интерфейса. Без них отдельные функции могут
        работать некорректно. Примеры: запоминание принятия уведомления о cookie,
        настройки PWA.
      </p>

      <h3>2.2. Аналитические — Яндекс.Метрика</h3>
      <p>
        Счётчик № <strong>{YANDEX_METRIKA_ID}</strong> (ООО «Яндекс») подключается{" "}
        <strong>только после нажатия «Принять»</strong> в уведомлении о cookie.
        Он помогает понимать, как пользователи взаимодействуют с картой: просмотры
        страниц, клики, источники трафика. Могут использоваться cookie Яндекса, в том
        числе для вебвизора и карты кликов. Политика Яндекса:{" "}
        <a href={YANDEX_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          yandex.ru/legal/confidential
        </a>
        , о cookie Метрики:{" "}
        <a
          href="https://yandex.ru/support/metrica/ru/general/cookie-usage.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          справка Яндекса
        </a>
        .
      </p>

      <h3>2.3. Рекламные — Яндекс РСЯ</h3>
      <p>
        На контентных страницах (города, статьи, справка) может показываться реклама
        через рекламную сеть Яндекса (РСЯ). Скрипт и cookie рекламной системы
        подключаются <strong>только после нажатия «Принять»</strong> в уведомлении о
        cookie. Реклама не показывается на интерактивной карте. Политика Яндекса:{" "}
        <a href={YANDEX_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          yandex.ru/legal/confidential
        </a>
        , о рекламе:{" "}
        <a
          href="https://yandex.ru/legal/adv_rules/"
          target="_blank"
          rel="noopener noreferrer"
        >
          правила размещения рекламы
        </a>
        .
      </p>

      <h2>3. localStorage (локальное хранилище)</h2>
      <p>Не является cookie, но выполняет схожую роль на вашем устройстве:</p>
      <ul>
        <li>анонимный ID для защиты от спама;</li>
        <li>избранные заправки;</li>
        <li>скрытие подсказок онбординга и PWA.</li>
      </ul>
      <p>Эти данные не передаются третьим лицам, кроме случаев работы API Сервиса.</p>

      <h2>4. Как управлять cookie</h2>
      <ul>
        <li>отключить или удалить cookie в настройках браузера;</li>
        <li>использовать режим «инкогнито»;</li>
        <li>
          установить расширения блокировки трекеров (учтите, что аналитика
          перестанет работать, а часть функций может быть ограничена).
        </li>
      </ul>

      <h2>5. Согласие</h2>
      <p>
        Продолжая пользоваться сайтом после появления уведомления о cookie и
        нажатия «Принять», вы соглашаетесь с использованием описанных технологий
        в указанных целях. Отозвать согласие можно, очистив cookie и localStorage
        в браузере.
      </p>
    </LegalDocLayout>
  );
}
