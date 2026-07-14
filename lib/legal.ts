// Правовые константы и даты документов (152-ФЗ, пользовательское соглашение).

import { SITE_NAME, SITE_URL } from "./site";

/** Домен продакшена. */
export const SITE_DOMAIN = "benzatlas.ru";

/** Дата актуальной редакции правовых документов. */
export const LEGAL_UPDATED = "30 июня 2026 г.";

/** Идентификатор счётчика Яндекс.Метрики. */
export const YANDEX_METRIKA_ID = 110730798;

/**
 * Оператор персональных данных (администратор сервиса).
 * При необходимости укажите ФИО/ИП в NEXT_PUBLIC_LEGAL_OPERATOR.
 */
export const LEGAL_OPERATOR =
  process.env.NEXT_PUBLIC_LEGAL_OPERATOR?.trim() ||
  `Администратор сервиса «${SITE_NAME}»`;

export const LEGAL_PAGES = [
  { href: "/polzovatelskoe-soglashenie", label: "Пользовательское соглашение" },
  { href: "/confidentialnost", label: "Политика конфиденциальности" },
  { href: "/cookies", label: "Политика cookie" },
  { href: "/pravovaya-informaciya", label: "Правовая информация" },
] as const;

export const LEGAL_DISCLAIMER =
  "Сервис не связан с сетями АЗС и нефтяными компаниями. Информация на карте формируется пользователями и носит справочный характер — уточняйте наличие топлива на заправке.";

/** Ссылка на политику Яндекса (обработчик Метрики). */
export const YANDEX_PRIVACY_URL =
  "https://yandex.ru/legal/confidential/";

export const SITE_URL_DISPLAY = SITE_URL.replace(/^https?:\/\//, "");
