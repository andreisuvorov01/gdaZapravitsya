import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  collectIndexNowUrls,
  getIndexNowConfig,
  submitAllToIndexNow,
  submitPathsToIndexNow,
  submitToIndexNow,
} from "@/lib/indexnow";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("x-cron-key") ?? "";
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return safeEqual(header, secret) || safeEqual(bearer, secret);
}

/** GET — статус конфигурации; POST — отправка URL в IndexNow (Bing, Yandex и др.). */
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = getIndexNowConfig();
  if (!config) {
    return NextResponse.json(
      { ok: false, error: "INDEXNOW_KEY не настроен" },
      { status: 503 }
    );
  }
  const urls = collectIndexNowUrls();
  return NextResponse.json({
    ok: true,
    keyLocation: config.keyLocation,
    urlCount: urls.length,
  });
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let paths: string[] | undefined;
    try {
      const body = await req.json();
      if (Array.isArray(body?.paths)) {
        paths = body.paths.filter((p: unknown) => typeof p === "string");
      } else if (typeof body?.urls === "string") {
        paths = body.urls.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    } catch {
      /* пустое тело — полный sitemap */
    }

    if (paths?.length) {
      const results = await submitPathsToIndexNow(paths);
      return NextResponse.json({ ok: results.every((r) => r.ok), mode: "paths", count: paths.length, results });
    }

    const { urlCount, results } = await submitAllToIndexNow();
    return NextResponse.json({
      ok: results.every((r) => r.ok),
      mode: "full",
      urlCount,
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** GET с ?url= для ручной отправки одной страницы (тот же CRON_SECRET). */
export async function PATCH(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url")?.trim();
  if (!url) {
    return NextResponse.json({ error: "url query required" }, { status: 400 });
  }
  try {
    const results = await submitToIndexNow([url]);
    return NextResponse.json({ ok: results.every((r) => r.ok), results });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
