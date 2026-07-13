import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ARTICLES, sortArticlesForBlog } from "@/lib/articles";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Статьи о бензине и АЗС — где заправиться, карта, дефицит",
  description:
    "Статьи о наличии бензина: где бензин сегодня, карта заправок, дефицит, цены, ситуация по городам России. Советы водителям.",
  alternates: {
    canonical: absoluteUrl("/blog"),
    types: {
      "application/rss+xml": [{ url: absoluteUrl("/blog/feed.xml"), title: `${SITE_NAME} — блог` }],
    },
  },
  openGraph: {
    title: "Статьи — бензрядом",
    description: "Советы водителям о топливе и автозаправках.",
    url: absoluteUrl("/blog"),
    type: "website",
    siteName: SITE_NAME,
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogIndexPage() {
  const sorted = sortArticlesForBlog(ARTICLES);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="Хлебные крошки" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand-fuel">
          Карта
        </Link>{" "}
        / <span className="text-ink">Статьи</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Статьи о топливе и АЗС
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
        Разбираем, как устроены поставки топлива, где искать бензин и как пользоваться{" "}
        <Link href="/" className="text-brand-fuel underline">
          картой наличия топлива
        </Link>
        .
      </p>

      <ul className="mt-10 space-y-6">
        {sorted.map((article) => (
          <li key={article.slug}>
            <article className="overflow-hidden rounded-2xl border border-white/10 bg-surface/60 transition hover:border-brand-fuel/30">
              <Link href={`/blog/${article.slug}`} className="block sm:flex">
                <div className="relative aspect-[16/9] w-full shrink-0 sm:aspect-auto sm:w-72">
                  <Image
                    src={article.coverImage.src}
                    alt={article.coverImage.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 288px"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
                  <time
                    dateTime={article.publishedAt}
                    className="text-xs font-medium uppercase tracking-wide text-ink-muted"
                  >
                    {formatDate(article.publishedAt)} · {article.readMinutes} мин
                  </time>
                  <h2 className="mt-2 text-xl font-bold text-ink transition group-hover:text-brand-fuel">
                    {article.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                    {article.description}
                  </p>
                  <span className="mt-4 text-sm font-semibold text-brand-fuel">
                    Читать →
                  </span>
                </div>
              </Link>
            </article>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-2xl border border-brand-fuel/30 bg-brand-fuel/10 p-6">
        <h2 className="text-lg font-semibold text-ink">Нужно узнать наличие сейчас?</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Карта показывает, где на АЗС уже есть бензин и дизель — по отметкам водителей.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-xl bg-brand-fuel px-5 py-2.5 text-sm font-semibold text-ink-dark shadow-glow transition hover:bg-brand-fuelDim"
        >
          Смотреть карту бензина
        </Link>
      </div>
    </div>
  );
}
