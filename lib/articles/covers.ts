import type { ArticleCover } from "./types";

/** Обложка статьи: уникальное фото по slug. */
export function articleCover(
  slug: string,
  alt: string,
  caption?: string
): ArticleCover {
  return {
    src: `/blog/covers/${slug}.jpg`,
    alt,
    caption,
  };
}

/** URL обложки для inline-картинок в тексте статьи. */
export function coverSrc(slug: string): string {
  return `/blog/covers/${slug}.jpg`;
}
