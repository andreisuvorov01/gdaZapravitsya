// Типы SEO-статей блога.

export interface ArticleFaq {
  question: string;
  answer: string;
}

export interface ArticleCover {
  src: string;
  alt: string;
  caption?: string;
}

export interface ArticleMeta {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  publishedAt: string;
  updatedAt: string;
  readMinutes: number;
  coverImage: ArticleCover;
  faq: ArticleFaq[];
  relatedSlugs?: string[];
}

/** Фрагмент текста или внутренняя ссылка. */
export type InlinePart = string | { href: string; children: string };

export type ArticleBlock =
  | { type: "p"; parts: InlinePart[]; lead?: boolean }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: InlinePart[][] }
  | { type: "ol"; items: InlinePart[][] }
  | { type: "cta"; title?: string; text?: string; primaryLabel?: string; primaryHref?: string; secondaryLabel?: string; secondaryHref?: string }
  | { type: "figure"; src: string; alt: string; caption?: string }
  | { type: "blockquote"; parts: InlinePart[] }
  | { type: "table"; headers: [string, string]; rows: [string, string][] };
