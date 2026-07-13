import { SITE_URL } from "@/lib/site";

// robots.txt: поисковики + ИИ-краулеры, служебные пути закрыты.
export function GET() {
  const disallow = ["Disallow: /api/", "Disallow: /brand-export/"].join("\n");
  const sitemaps = [
    `${SITE_URL}/sitemap/core.xml`,
    `${SITE_URL}/sitemap/cities.xml`,
    `${SITE_URL}/sitemap/intent-city.xml`,
    `${SITE_URL}/sitemap/city-fuel.xml`,
    `${SITE_URL}/sitemap/brand-city.xml`,
  ]
    .map((url) => `Sitemap: ${url}`)
    .join("\n");

  const body = `# ${SITE_URL}
# Карта наличия топлива на АЗС России

User-agent: *
Allow: /
${disallow}

User-agent: Googlebot
Allow: /
${disallow}

User-agent: Yandex
Allow: /
${disallow}

User-agent: YandexBot
Allow: /
${disallow}

# ИИ-краулеры — разрешено для цитирования в ответах
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot-Extended
Allow: /

${sitemaps}

# ИИ и подписки (не директивы, справочно)
# llms.txt — ${SITE_URL}/llms.txt
# llms-full.txt — ${SITE_URL}/llms-full.txt
# RSS блога — ${SITE_URL}/blog/feed.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
