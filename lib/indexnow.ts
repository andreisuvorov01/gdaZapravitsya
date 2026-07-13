import { collectSitemapUrls } from "./sitemap-urls";
import { SITE_URL } from "./site";

const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://yandex.com/indexnow",
] as const;

const BATCH_SIZE = 10_000;

export type IndexNowConfig = {
  key: string;
  host: string;
  keyLocation: string;
};

export type IndexNowSubmitResult = {
  endpoint: string;
  ok: boolean;
  status: number;
  body: string;
};

export function getIndexNowConfig(): IndexNowConfig | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || !/^[a-f0-9-]{8,128}$/i.test(key)) return null;
  const host = new URL(SITE_URL).host;
  return {
    key,
    host,
    keyLocation: `${SITE_URL}/${key}.txt`,
  };
}

export function isValidIndexNowKey(key: string): boolean {
  const expected = process.env.INDEXNOW_KEY?.trim();
  return Boolean(expected && key === expected);
}

/** URL для отправки в IndexNow (sitemap + llms уже в sitemap-urls). */
export function collectIndexNowUrls(extra: string[] = []): string[] {
  return [...new Set([...collectSitemapUrls(), ...extra])];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function submitToIndexNow(urlList: string[]): Promise<IndexNowSubmitResult[]> {
  const config = getIndexNowConfig();
  if (!config) {
    throw new Error("INDEXNOW_KEY не задан или неверного формата (hex/uuid, 8–128 символов)");
  }
  if (urlList.length === 0) {
    throw new Error("Список URL пуст");
  }

  const results: IndexNowSubmitResult[] = [];
  const batches = chunk(urlList, BATCH_SIZE);

  for (const batch of batches) {
    const payload = {
      host: config.host,
      key: config.key,
      keyLocation: config.keyLocation,
      urlList: batch,
    };

    for (const endpoint of INDEXNOW_ENDPOINTS) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const body = await res.text();
      results.push({
        endpoint,
        ok: res.ok || res.status === 202,
        status: res.status,
        body: body.slice(0, 500),
      });
    }
  }

  return results;
}

export async function submitAllToIndexNow(): Promise<{
  urlCount: number;
  results: IndexNowSubmitResult[];
}> {
  const urlList = collectIndexNowUrls();
  const results = await submitToIndexNow(urlList);
  return { urlCount: urlList.length, results };
}

/** Одна или несколько страниц после деплоя/правок. */
export async function submitPathsToIndexNow(paths: string[]): Promise<IndexNowSubmitResult[]> {
  const urls = paths.map((p) => {
    const path = p.startsWith("/") ? p : `/${p}`;
    return `${SITE_URL}${path}`;
  });
  return submitToIndexNow(urls);
}
