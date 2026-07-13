import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getStationsByIds, getStationsWithStatus, searchStationsByName } from "@/lib/data";
import { parseBBoxParam } from "@/lib/bbox";
import { cityBBox, findCityBySlug } from "@/lib/cities";
import { STATUS_LABELS } from "@/lib/types";
import type { BBox, FuelStatus, StationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// Приватный JSON-фид для внешних ботов (Telegram-канал, ВК-бот).
// Авторизация ТОЛЬКО через заголовок "x-api-key" либо "Authorization: Bearer".
// Ключ в query (?key=) больше не принимается — он утекает в логи доступа/Referer.
//
// Примеры:
//   curl -H "x-api-key: SECRET" ".../api/feed/stations?city=krasnodar&fresh=1"
//   curl -H "Authorization: Bearer SECRET" ".../api/feed/stations?bbox=45,38.8,45.2,39.2"
//
// Параметры:
//   city   — slug города (krasnodar, moskva, …) → bbox автоматически
//   bbox   — south,west,north,east (альтернатива city)
//   ids    — список id станций через запятую (до 50) — точечный лукап без bbox,
//            для избранного/подписок бота; приоритетнее city/bbox/q
//   q      — поиск по названию/бренду/адресу (2-100 симв.); без city/bbox — по всей базе,
//            вместе с city/bbox — сужает выборку внутри области
//   fresh  — 1: только АЗС со свежими отчётами (статус есть/мало/нет)
//   status — yes|low|no: фильтр по статусу
//   limit  — макс. кол-во станций в ответе (по умолчанию без доп. обрезки, макс. 500)
//   offset — сдвиг для постраничной выборки (по умолчанию 0)
//   Ответ дополнительно содержит total (до пагинации) и truncated (есть ли ещё страницы).

// Сравнение в постоянном времени (защита от timing-атак).
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function authorized(request: Request): boolean {
  const expected = process.env.FEED_API_KEY;
  if (!expected) return false; // фид выключен, пока не задан ключ
  const provided =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  return provided != null && safeEqual(provided, expected);
}

function compact(s: StationStatus) {
  return {
    id: s.id,
    name: s.name,
    brand: s.brand,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    status: s.status,
    status_label: STATUS_LABELS[s.status],
    queue: s.queue,
    limit_liters: s.limit_liters,
    fuel_types: s.fuel_types,
    prices: s.prices,
    last_report_at: s.last_report_at,
    reports_count: s.reports_count,
    stale: s.stale,
  };
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

  const { searchParams } = new URL(request.url);
  const citySlug = searchParams.get("city");
  const bboxParam = searchParams.get("bbox");
  const idsParam = searchParams.get("ids");
  const qParam = searchParams.get("q")?.trim();
  const freshOnly = searchParams.get("fresh") === "1";
  const statusFilter = searchParams.get("status");
  const validStatuses: FuelStatus[] = ["yes", "low", "no", "unknown"];
  if (
    statusFilter &&
    !validStatuses.includes(statusFilter as FuelStatus)
  ) {
    return NextResponse.json(
      { error: "Неверный status (yes|low|no|unknown)" },
      { status: 400 }
    );
  }
  if (qParam && (qParam.length < 2 || qParam.length > 100)) {
    return NextResponse.json(
      { error: "Параметр q: от 2 до 100 символов" },
      { status: 400 }
    );
  }

  const limitRaw = Number(searchParams.get("limit"));
  const pageLimit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 500) : null;
  const offsetRaw = Number(searchParams.get("offset"));
  const pageOffset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;

  let bbox: BBox | null = null;
  if (citySlug) {
    const city = findCityBySlug(citySlug);
    if (!city) {
      return NextResponse.json({ error: "Неизвестный город" }, { status: 400 });
    }
    bbox = cityBBox(city);
  } else if (bboxParam) {
    const parsed = parseBBoxParam(bboxParam);
    if (!parsed) {
      return NextResponse.json(
        { error: "Неверный bbox или слишком большая область" },
        { status: 400 }
      );
    }
    bbox = parsed;
  } else if (!qParam && !idsParam) {
    return NextResponse.json(
      { error: "Укажите city, bbox, q или ids" },
      { status: 400 }
    );
  }

  try {
    let stations: StationStatus[];
    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 50);
      stations = await getStationsByIds(ids);
    } else if (qParam && !bbox) {
      stations = await searchStationsByName(qParam, 50);
    } else if (qParam && bbox) {
      const needle = qParam.toLowerCase();
      const withinBBox = await getStationsWithStatus(bbox, 1000);
      stations = withinBBox
        .filter(
          (s) =>
            s.name.toLowerCase().includes(needle) ||
            (s.brand ?? "").toLowerCase().includes(needle) ||
            (s.address ?? "").toLowerCase().includes(needle)
        )
        .slice(0, 50);
    } else {
      stations = await getStationsWithStatus(bbox as BBox, 1000);
    }
    if (freshOnly) stations = stations.filter((s) => !s.stale && s.status !== "unknown");
    if (statusFilter) stations = stations.filter((s) => s.status === statusFilter);

    const total = stations.length;
    const paged = pageLimit != null
      ? stations.slice(pageOffset, pageOffset + pageLimit)
      : stations.slice(pageOffset);
    const truncated = pageOffset + paged.length < total;

    return NextResponse.json(
      {
        generated_at: new Date().toISOString(),
        city: citySlug ?? null,
        count: paged.length,
        total,
        truncated,
        stations: paged.map(compact),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("GET /api/feed/stations error", err);
    return NextResponse.json({ error: "Ошибка фида" }, { status: 500 });
  }
}
