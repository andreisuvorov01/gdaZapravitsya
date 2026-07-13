import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/site";

const CANONICAL_HOST = new URL(SITE_URL).host.toLowerCase();

/**
 * Хосты, которые должны сливаться на канонический benzryadom.ru.
 * IDN-зеркала из nginx (benzradar) — canonical и sitemap уже на .ru.
 */
const REDIRECT_TO_CANONICAL_HOSTS = new Set([
  `www.${CANONICAL_HOST}`,
  "xn--90agci0adjo9k.xn--p1ai",
  "www.xn--90agci0adjo9k.xn--p1ai",
  "xn--90aigx0aag.xn--p1ai",
  "www.xn--90aigx0aag.xn--p1ai",
  "xn----8sbaibghrm1elpm4lxb.xn--p1ai",
  "www.xn----8sbaibghrm1elpm4lxb.xn--p1ai",
]);

/**
 * www и IDN .рф → benzryadom.ru (канонический хост для SEO и IndexNow).
 * Порт из Host игнорируем: за nginx иногда приходит www.benzryadom.ru:3000.
 */
export function middleware(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!REDIRECT_TO_CANONICAL_HOSTS.has(hostname)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = CANONICAL_HOST;
  url.port = "";
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
};
