import { collectSitemapUrls } from "../lib/sitemap-urls.ts";
process.stdout.write(JSON.stringify(collectSitemapUrls()));
