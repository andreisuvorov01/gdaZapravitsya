import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, findArticle } from "@/lib/articles";
import { absoluteUrl, SITE_NAME, OG_IMAGE_PATH } from "@/lib/site";
import { ArticleContent } from "@/components/ArticleContent";
import { ArticleCta } from "@/components/ArticleCta";
import FaqList from "@/components/FaqList";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) return { title: "Статья не найдена" };

  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: absoluteUrl(`/blog/${article.slug}`) },
    openGraph: {
      title: `${article.title} — ГдеЗаправиться.рф`,
      description: article.description,
      url: absoluteUrl(`/blog/${article.slug}`),
      type: "article",
      siteName: SITE_NAME,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      images: [{ url: article.coverImage.src, alt: article.coverImage.alt }],
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function articleJsonLd(article: NonNullable<ReturnType<typeof findArticle>>) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "ru-RU",
    image: absoluteUrl(article.coverImage.src),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(OG_IMAGE_PATH),
      },
    },
    mainEntityOfPage: absoluteUrl(`/blog/${article.slug}`),
  };
}

function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();

  const jsonLd = articleJsonLd(article);
  const faqLd = faqJsonLd(article.faq);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        /{" "}
        <Link href="/blog" className="hover:text-brand-fuel">
          Статьи
        </Link>{" "}
        / <span className="text-ink">{article.title}</span>
      </nav>

      <header>
        <time
          dateTime={article.publishedAt}
          className="text-xs font-medium uppercase tracking-wide text-ink-muted"
        >
          {formatDate(article.publishedAt)} · {article.readMinutes} мин чтения
        </time>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          {article.description}
        </p>
      </header>

      <ArticleContent slug={slug} article={article} />

      <section className="mt-12" aria-label="Частые вопросы">
        <h2 className="text-xl font-bold text-ink">Частые вопросы</h2>
        <div className="mt-4">
          <FaqList items={article.faq} />
        </div>
      </section>

      <ArticleCta />

      {article.relatedSlugs && article.relatedSlugs.length > 0 && (
        <section className="mt-10" aria-label="Читайте также">
          <h2 className="text-xl font-bold text-ink">Читайте также</h2>
          <ul className="mt-4 space-y-2">
            {article.relatedSlugs.map((relSlug) => {
              const rel = findArticle(relSlug);
              if (!rel) return null;
              return (
                <li key={relSlug}>
                  <Link
                    href={`/blog/${relSlug}`}
                    className="text-brand-fuel underline hover:text-brand-fuelDim"
                  >
                    {rel.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <nav className="mt-10 border-t border-white/10 pt-6 text-sm" aria-label="Навигация">
        <Link href="/blog" className="text-brand-fuel hover:underline">
          ← Все статьи
        </Link>
        {" · "}
        <Link href="/" className="text-brand-fuel hover:underline">
          Карта бензина
        </Link>
        {" · "}
        <Link href="/goroda" className="text-brand-fuel hover:underline">
          Города
        </Link>
      </nav>
    </div>
  );
}
