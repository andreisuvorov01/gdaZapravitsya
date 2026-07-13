import { notFound } from "next/navigation";
import type { ArticleMeta } from "@/lib/articles";
import { getArticleBody } from "@/lib/articles";
import ArticleRenderer from "@/components/ArticleRenderer";

export function ArticleContent({ slug }: { slug: string; article?: ArticleMeta }) {
  const blocks = getArticleBody(slug);
  if (!blocks) notFound();
  return <ArticleRenderer blocks={blocks} />;
}

export { ArticleCta } from "@/components/ArticleCta";