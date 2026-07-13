import type { ArticleBlock, InlinePart } from "./types";

export function p(...parts: InlinePart[]): ArticleBlock {
  return { type: "p", parts };
}

export function lead(...parts: InlinePart[]): ArticleBlock {
  return { type: "p", parts, lead: true };
}

export function h2(text: string): ArticleBlock {
  return { type: "h2", text };
}

export function h3(text: string): ArticleBlock {
  return { type: "h3", text };
}

export function ul(...items: InlinePart[][]): ArticleBlock {
  return { type: "ul", items };
}

export function ol(...items: InlinePart[][]): ArticleBlock {
  return { type: "ol", items };
}

export function cta(
  opts: Omit<Extract<ArticleBlock, { type: "cta" }>, "type"> = {}
): ArticleBlock {
  return { type: "cta", ...opts };
}

export function fig(src: string, alt: string, caption?: string): ArticleBlock {
  return { type: "figure", src, alt, caption };
}

export function quote(...parts: InlinePart[]): ArticleBlock {
  return { type: "blockquote", parts };
}

export function table(headers: [string, string], rows: [string, string][]): ArticleBlock {
  return { type: "table", headers, rows };
}

/** Короткая ссылка на карту. */
export function mapLink(label = "карту наличия топлива"): InlinePart {
  return { href: "/", children: label };
}

export function blogLink(slug: string, label: string): InlinePart {
  return { href: `/blog/${slug}`, children: label };
}

export function cityLink(slug: string, label: string): InlinePart {
  return { href: `/azs/${slug}`, children: label };
}

export function brandLink(slug: string, label: string): InlinePart {
  return { href: `/seti/${slug}`, children: label };
}
