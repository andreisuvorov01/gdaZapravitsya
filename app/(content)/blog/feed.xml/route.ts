import { ARTICLES, sortArticlesForBlog } from "@/lib/articles";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET() {
  const items = sortArticlesForBlog(ARTICLES);
  const lastBuild = new Date().toUTCString();

  const entries = items
    .map(
      (a) => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${absoluteUrl(`/blog/${a.slug}`)}</link>
      <guid isPermaLink="true">${absoluteUrl(`/blog/${a.slug}`)}</guid>
      <description>${escapeXml(a.description)}</description>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} — статьи о топливе и АЗС</title>
    <link>${absoluteUrl("/blog")}</link>
    <description>Советы водителям: где бензин, карта АЗС, дефицит, трассы</description>
    <language>ru</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${absoluteUrl("/blog/feed.xml")}" rel="self" type="application/rss+xml"/>
${entries}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
