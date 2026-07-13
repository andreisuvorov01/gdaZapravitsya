import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { CITY_PRESETS } from "@/lib/cities";

export const dynamic = "force-dynamic";

// Список городов-пресетов для ботов (распознавание "АЗС в Краснодаре" текстом).
// Та же авторизация, что и у /api/feed/stations — см. комментарий там.
//
//   curl -H "x-api-key: SECRET" ".../api/feed/cities"

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function authorized(request: Request): boolean {
  const expected = process.env.FEED_API_KEY;
  if (!expected) return false;
  const provided =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  return provided != null && safeEqual(provided, expected);
}

export async function GET(request: Request) {
  if (!process.env.FEED_API_KEY) {
    return NextResponse.json(
      { error: "Фид не настроен: задайте FEED_API_KEY в .env" },
      { status: 503 }
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Неверный ключ доступа" }, { status: 401 });
  }

  return NextResponse.json(
    {
      cities: CITY_PRESETS.map((c) => ({
        slug: c.slug,
        name: c.name,
        prepositional: c.prepositional,
        genitive: c.genitive,
        lat: c.lat,
        lng: c.lng,
        zoom: c.zoom,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
