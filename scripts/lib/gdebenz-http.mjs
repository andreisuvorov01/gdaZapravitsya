// Общий HTTP/прокси/browser-транспорт для скриптов синка с gdebenz.ru
// (scripts/sync-gdebenz.mjs — обход тайлов, scripts/sync-gdebenz-comments.mjs —
// лента отметок по станции). Вынесено сюда, чтобы оба скрипта пользовались
// одной и той же логикой ретраев, ротации прокси и фоллбэка транспортов, а не
// разными копиями.

import { request as httpsRequest } from "node:https";
import { ProxyAgent } from "undici";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

const SOCKS_SCHEME_RE = /^socks[45]?h?:\/\//i;

/** Пул пользовательских агентов для эмуляции реальных браузеров. */
const USER_AGENTS = [
  "benzryadom-sync/1.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

const USER_AGENT = () => {
  const pool = (process.env.USER_AGENTS_POOL?.split(",") || USER_AGENTS)
    .map((ua) => ua.trim())
    .filter(Boolean);
  return pool[Math.floor(Math.random() * pool.length)] || USER_AGENTS[0];
};

const BROWSER_USER_AGENT = () => {
  const pool = (process.env.USER_AGENTS_POOL?.split(",") || USER_AGENTS)
    .map((ua) => ua.trim())
    .filter((ua) => /^Mozilla\//.test(ua));
  return (
    pool[Math.floor(Math.random() * pool.length)] ||
    USER_AGENTS.find((ua) => /^Mozilla\//.test(ua)) ||
    USER_AGENTS[0]
  );
};

function browserLaunchArgs() {
  if (process.platform !== "linux") return [];
  if (typeof process.geteuid === "function" && process.geteuid() === 0) {
    return ["--no-sandbox"];
  }
  return [];
}

/** Пауза между запросами (с рандомизацией). */
export const THROTTLE_MS = Number(process.env.THROTTLE_MS) || 300;
/** Пауза после ответа browser-транспорта. */
export const BROWSER_RESPONSE_DELAY_MS =
  Number(process.env.BROWSER_RESPONSE_DELAY_MS) || Math.max(80, Math.round(THROTTLE_MS / 3));
/** Пауза после ответа HTTP-транспорта. */
export const HTTP_RESPONSE_DELAY_MS =
  Number(process.env.HTTP_RESPONSE_DELAY_MS) || Math.max(25, Math.round(BROWSER_RESPONSE_DELAY_MS / 2));
/** Пауза перед повторной попыткой после ошибки. */
export const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS) || Math.max(50, Math.round(HTTP_RESPONSE_DELAY_MS));
/** Таймаут одного запроса. */
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 20000;
/** Таймаут browser-транспорта. */
const BROWSER_TIMEOUT_MS = Number(process.env.BROWSER_TIMEOUT_MS) || Math.max(45000, FETCH_TIMEOUT_MS);
/** Таймаут HTTP-транспорта. */
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS) || Math.max(5000, Math.min(FETCH_TIMEOUT_MS, 10000));
/** Общий таймаут на один запрос со всеми фоллбэками (тайл, лента отметок и т.п.). */
export const REQUEST_TIMEOUT_MS =
  Number(process.env.REQUEST_TIMEOUT_MS) ||
  Number(process.env.TILE_TIMEOUT_MS) ||
  Math.max(BROWSER_TIMEOUT_MS + 15000, FETCH_TIMEOUT_MS + 30000, 60000);
/** Количество попыток при сетевой ошибке / не-200. */
export const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 3;

/** Транспорты запроса.
 * Browser — основной: он лучше переживает TLS/прокси-капризы. HTTPS
 * остаётся быстрым fallback-путём; https6 можно добавить вручную, если на
 * хосте реально есть рабочий IPv6.
 */
const DEFAULT_FETCH_TRANSPORTS = "browser,https4";
export const FETCH_TRANSPORTS = (process.env.FETCH_TRANSPORTS || DEFAULT_FETCH_TRANSPORTS)
  .split(",")
  .map((transport) => transport.trim())
  .filter(Boolean);

/**
 * Пул исходящих HTTP(S)-прокси для обхода блокировок/троттлинга gdebenz.ru
 * по IP. `PROXY_LIST` (через запятую) имеет приоритет над одиночным
 * `PROXY_URL`; прокси берутся по кругу — по одному на попытку запроса,
 * так что если один прокси заблокирован, повтор пойдёт уже через другой.
 * Формат: "http://user:pass@host:port". Без переменных — прямые запросы.
 */
const PROXY_LIST = (process.env.PROXY_LIST || "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);
const PROXY_URL = process.env.PROXY_URL?.trim();
export const PROXY_POOL = PROXY_LIST.length > 0 ? PROXY_LIST : PROXY_URL ? [PROXY_URL] : [];

/**
 * Chromium не умеет авторизовываться на SOCKS5-прокси напрямую — при
 * PROXY_BRIDGE=1 browser-транспорт вместо этого идёт через локальный
 * HTTP-мост (см. scripts/proxy-bridge.mjs), который сам логинится на
 * реальный SOCKS5 и не требует авторизации на своей стороне. Порт моста для
 * PROXY_POOL[i] — PROXY_BRIDGE_BASE_PORT + i, той же формулой, что и в
 * proxy-bridge.mjs, так что дополнительной синхронизации портов не нужно.
 */
export const PROXY_BRIDGE_ENABLED = process.env.PROXY_BRIDGE === "1";
const PROXY_BRIDGE_BASE_PORT = Math.max(1, Number(process.env.PROXY_BRIDGE_BASE_PORT) || 18080);

function hasCredentials(proxyUrl) {
  return /:\/\/[^:@/]+:[^@/]+@/.test(proxyUrl);
}

/** Локальный адрес моста для browser-транспорта, если мост включён и применим; иначе исходный proxyUrl без изменений. */
function bridgedProxyUrl(proxyUrl) {
  if (!proxyUrl || !PROXY_BRIDGE_ENABLED || !SOCKS_SCHEME_RE.test(proxyUrl) || !hasCredentials(proxyUrl)) {
    return proxyUrl;
  }
  const index = PROXY_POOL.indexOf(proxyUrl);
  if (index === -1) return proxyUrl;
  return `http://127.0.0.1:${PROXY_BRIDGE_BASE_PORT + index}`;
}

let proxyRotationIndex = 0;
/** Следующий прокси из пула (round-robin) или undefined, если пул пуст. */
export function nextProxy() {
  if (PROXY_POOL.length === 0) return undefined;
  const proxy = PROXY_POOL[proxyRotationIndex % PROXY_POOL.length];
  proxyRotationIndex++;
  return proxy;
}

const fetchProxyAgents = new Map();
function getFetchProxyAgent(proxyUrl) {
  // undici.ProxyAgent говорит только HTTP CONNECT, SOCKS5 не поддерживает —
  // "fetch" транспорт не входит в FETCH_TRANSPORTS по умолчанию именно
  // поэтому. Явная ошибка вместо тихого зависания/непонятного сбоя, если
  // кто-то всё же включит fetch с SOCKS-прокси.
  if (SOCKS_SCHEME_RE.test(proxyUrl)) {
    throw new Error(`Транспорт "fetch" (undici) не поддерживает SOCKS-прокси: ${proxyUrl.split("@").pop()}`);
  }
  let agent = fetchProxyAgents.get(proxyUrl);
  if (!agent) {
    agent = new ProxyAgent(proxyUrl);
    fetchProxyAgents.set(proxyUrl, agent);
  }
  return agent;
}

const httpsProxyAgents = new Map();
/** HTTP(S)-прокси (CONNECT-туннель) и SOCKS4/5-прокси — по схеме в URL. */
function getHttpsProxyAgent(proxyUrl) {
  let agent = httpsProxyAgents.get(proxyUrl);
  if (!agent) {
    agent = SOCKS_SCHEME_RE.test(proxyUrl) ? new SocksProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl);
    httpsProxyAgents.set(proxyUrl, agent);
  }
  return agent;
}

/** Разбирает "http://user:pass@host:port" или "socks5://user:pass@host:port" в формат прокси Playwright (схема передаётся как есть — Playwright поддерживает оба варианта нативно). */
function parsePlaywrightProxy(proxyUrl) {
  const u = new URL(proxyUrl);
  const proxy = { server: `${u.protocol}//${u.host}` };
  if (u.username) proxy.username = decodeURIComponent(u.username);
  if (u.password) proxy.password = decodeURIComponent(u.password);
  return proxy;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function compactErrorCause(cause) {
  if (!cause) return undefined;
  if (Array.isArray(cause)) return cause;
  return {
    code: cause.code,
    errno: cause.errno,
    syscall: cause.syscall,
    hostname: cause.hostname,
    address: cause.address,
    port: cause.port,
    message: cause.message,
  };
}

export function describeFetchError(error) {
  return JSON.stringify({
    name: error?.name,
    message: error?.message,
    cause: compactErrorCause(error?.cause),
  });
}

function defaultRequestHeaders() {
  return {
    "User-Agent": USER_AGENT(),
    Accept: "application/json",
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    Referer: "https://gdebenz.ru/",
  };
}

// ---------------------------------------------------------------------------
// Browser-транспорт: один браузер на процесс, отдельный контекст на каждый
// прокси (Playwright привязывает прокси к контексту, а не к странице) — так
// ротация прокси работает и здесь, без релонча браузера на каждый запрос.
// ---------------------------------------------------------------------------

let browserPromise;
const browserContexts = new Map();

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      const { chromium } = await import("playwright");
      return chromium.launch({ headless: true, args: browserLaunchArgs() });
    })().catch((error) => {
      browserPromise = undefined;
      throw error;
    });
  }
  return browserPromise;
}

async function getBrowserContext(rawProxyUrl) {
  // При PROXY_BRIDGE=1 браузер подключается к локальному мосту, а не
  // напрямую к SOCKS5 (Chromium не умеет там авторизовываться) — см.
  // bridgedProxyUrl() и scripts/proxy-bridge.mjs.
  const proxyUrl = bridgedProxyUrl(rawProxyUrl);
  const key = proxyUrl || "";
  if (!browserContexts.has(key)) {
    const contextPromise = (async () => {
      const browser = await getBrowser();
      return browser.newContext({
        userAgent: BROWSER_USER_AGENT(),
        locale: "ru-RU",
        proxy: proxyUrl ? parsePlaywrightProxy(proxyUrl) : undefined,
        extraHTTPHeaders: {
          Accept: "application/json",
          "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
          Referer: "https://gdebenz.ru/",
        },
      });
    })().catch((error) => {
      browserContexts.delete(key);
      throw error;
    });
    browserContexts.set(key, contextPromise);
  }
  return browserContexts.get(key);
}

/** Закрывает браузер и все его контексты. Вызывать один раз в конце скрипта. */
export async function closeTransports() {
  const contextPromises = [...browserContexts.values()];
  browserContexts.clear();
  for (const contextPromise of contextPromises) {
    try {
      const context = await contextPromise;
      await context.close();
    } catch {
      // Игнорируем ошибки закрытия: браузер уже не нужен после синка.
    }
  }

  if (!browserPromise) return;
  let browser;
  try {
    browser = await browserPromise;
  } catch {
    browserPromise = undefined;
    return;
  }
  browserPromise = undefined;
  try {
    await browser.close();
  } catch {
    // Аналогично.
  }
}

function responseHeaders(headers) {
  return {
    get(name) {
      const value = headers[name.toLowerCase()];
      return Array.isArray(value) ? value[0] : value || null;
    },
  };
}

async function requestJsonWithFetch(url, signal, proxyUrl) {
  const res = await fetch(url, {
    headers: defaultRequestHeaders(),
    signal,
    dispatcher: proxyUrl ? getFetchProxyAgent(proxyUrl) : undefined,
  });

  return {
    ok: res.ok,
    status: res.status,
    headers: res.headers,
    data: await res.json(),
  };
}

async function requestJsonWithBrowser(url, proxyUrl) {
  const context = await getBrowserContext(proxyUrl);
  const page = await context.newPage();
  try {
    const res = await page.goto(url, {
      waitUntil: "commit",
      timeout: BROWSER_TIMEOUT_MS,
    });
    if (!res) throw new Error("Browser request returned no response");
    const body = await res.text();
    let data = null;
    if (body) {
      try {
        data = JSON.parse(body);
      } catch (e) {
        throw new Error(`JSON parse failed after HTTP ${res.status()}: ${e.message}`);
      }
    }
    return {
      ok: res.ok(),
      status: res.status(),
      headers: responseHeaders(res.headers()),
      data,
    };
  } finally {
    await page.close();
  }
}

function requestJsonWithHttps(url, family, signal, proxyUrl) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        // family игнорируется, когда запрос идёт через прокси (egress IP
        // определяется прокси, а не выбором A/AAAA на нашей стороне).
        family,
        minVersion: "TLSv1.2",
        maxVersion: "TLSv1.2",
        headers: defaultRequestHeaders(),
        timeout: HTTP_TIMEOUT_MS,
        signal,
        agent: proxyUrl ? getHttpsProxyAgent(proxyUrl) : undefined,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              headers: responseHeaders(res.headers),
              data: body ? JSON.parse(body) : null,
            });
          } catch (e) {
            reject(new Error(`JSON parse failed after HTTP ${res.statusCode}: ${e.message}`));
          }
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error(`HTTPS timeout after ${HTTP_TIMEOUT_MS}ms`)));
    req.on("error", reject);
    req.end();
  });
}

/** Запрашивает JSON по `url`, перебирая FETCH_TRANSPORTS до первого успеха. */
export async function requestJson(url, signal, proxyUrl) {
  const errors = [];
  for (const transport of FETCH_TRANSPORTS) {
    // Chromium/Playwright не умеет авторизовываться на SOCKS5 (жёсткое
    // ограничение самого браузера: "Browser does not support socks5 proxy
    // authentication") — без моста (PROXY_BRIDGE=1, см. bridgedProxyUrl())
    // пропускаем сразу, не тратя попытку и время на заведомо провальный
    // запуск браузера.
    if (
      transport === "browser" &&
      proxyUrl &&
      !PROXY_BRIDGE_ENABLED &&
      SOCKS_SCHEME_RE.test(proxyUrl) &&
      hasCredentials(proxyUrl)
    ) {
      errors.push({ transport, details: "пропущено: SOCKS5-прокси с авторизацией не поддерживается браузером (запустите scripts/proxy-bridge.mjs и PROXY_BRIDGE=1, если нужен именно browser-транспорт)" });
      continue;
    }
    try {
      if (transport === "fetch") return { ...(await requestJsonWithFetch(url, signal, proxyUrl)), transport };
      if (transport === "https4") return { ...(await requestJsonWithHttps(url, 4, signal, proxyUrl)), transport };
      if (transport === "https6") return { ...(await requestJsonWithHttps(url, 6, signal, proxyUrl)), transport };
      if (transport === "browser") return { ...(await requestJsonWithBrowser(url, proxyUrl)), transport };
      throw new Error(`Unknown fetch transport: ${transport}`);
    } catch (error) {
      errors.push({ transport, details: describeFetchError(error) });
    }
  }

  const error = new Error(
    `All request transports failed: ${errors.map((e) => `${e.transport}=${e.details}`).join("; ")}`
  );
  error.cause = errors;
  throw error;
}

export async function waitAfterResponse(res, fallbackMs) {
  const retryAfter = res.headers.get("Retry-After");
  const retrySec = Number(retryAfter);
  if (Number.isFinite(retrySec) && retrySec > 0) {
    await sleep(retrySec * 1000);
    return;
  }
  const jitter = Math.round(Math.random() * Math.max(10, fallbackMs / 4));
  await sleep(fallbackMs + jitter);
}

export function responseDelayForTransport(transport) {
  return transport === "browser" ? BROWSER_RESPONSE_DELAY_MS : HTTP_RESPONSE_DELAY_MS;
}

/**
 * Запрашивает `url` с ретраями (`MAX_RETRIES`) и ротацией прокси на каждую
 * попытку. Общий каркас retry-цикла для тайлов и для ленты отметок —
 * специфика (что делать с ответом/данными) передаётся через `onResponse`.
 */
export async function requestWithRetries(url, onResponse) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const proxyUrl = nextProxy();
    try {
      const res = await requestJson(url, controller.signal, proxyUrl);
      await waitAfterResponse(res, responseDelayForTransport(res.transport));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await onResponse(res);
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  const error = new Error(`Все попытки исчерпаны: ${describeFetchError(lastErr)}`);
  error.cause = lastErr;
  throw error;
}

/**
 * Жёсткий верхний предел на частоту запросов, не зависящий от
 * конкурентности: гарантирует, что между СТАРТАМИ любых двух запросов (в т.ч.
 * из разных воркеров) проходит не меньше `minIntervalMs`. Дополняет
 * per-response паузу (`waitAfterResponse`/`responseDelayForTransport`) —
 * та троттлит только ПОСЛЕ ответа конкретного воркера, а этот гейт даёт
 * реальный потолок RPS на весь процесс независимо от того, сколько воркеров
 * запущено (полезно для скриптов с высокой конкурентностью и/или большим
 * числом станций — см. sync-gdebenz-comments.mjs).
 */
export function createRateGate(minIntervalMs) {
  let nextAt = 0;
  return async function gate() {
    if (minIntervalMs <= 0) return;
    const now = Date.now();
    const waitMs = Math.max(0, nextAt - now);
    nextAt = Math.max(now, nextAt) + minIntervalMs;
    if (waitMs > 0) await sleep(waitMs);
  };
}

/** По тексту ошибки похоже на бан по IP (голый nginx 403 без JSON-тела — см. incident в SYNC.md), а не на разовый сетевой сбой. */
export function looksLikeBlock(error) {
  return /HTTP 403/.test(String(error?.message || ""));
}
