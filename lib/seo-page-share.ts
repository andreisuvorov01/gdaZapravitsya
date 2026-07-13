/** Тексты и ссылка для «Поделиться» на SEO-страницах городов. */

export type ShareChannel = "copy" | "native";

export interface SeoSharePayload {
  title: string;
  text: string;
  url: string;
}

function withUtm(url: string, medium: ShareChannel): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "share");
    u.searchParams.set("utm_medium", medium);
    u.searchParams.set("utm_campaign", "seo_city");
    return u.toString();
  } catch {
    return url;
  }
}

/** Сообщение для «Поделиться» — короткое, с брендом для узнаваемости. */
export function buildSeoSharePayload(opts: {
  pageUrl: string;
  cityName: string;
  cityPrep: string;
  pageTitle: string;
}): SeoSharePayload {
  const text = `Где есть бензин в ${opts.cityPrep} сейчас — живая карта АЗС на ГдеЗаправиться.рф. Очереди, лимиты, отметки водителей.`;
  return {
    title: opts.pageTitle,
    text,
    url: withUtm(opts.pageUrl, "copy"),
  };
}

export const SHARE_CHANNELS: {
  id: ShareChannel;
  label: string;
  hint: string;
}[] = [
  { id: "copy", label: "Скопировать ссылку", hint: "Вставить куда угодно" },
  { id: "native", label: "Ещё…", hint: "Системное меню «Поделиться»" },
];
