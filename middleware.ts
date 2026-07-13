import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/site";

const CANONICAL_HOST = new URL(SITE_URL).host.toLowerCase();

/** Только www-зеркало сливаем на канонический хост (без www). */
const REDIRECT_TO_CANONICAL_HOSTS = new Set([`www.${CANONICAL_HOST}`]);

/**
 * www → канонический хост (без www) — для SEO и IndexNow.
 * Порт из Host игнорируем: за nginx иногда приходит с портом.
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
