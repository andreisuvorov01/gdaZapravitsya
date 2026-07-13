import { NextResponse } from "next/server";
import {
  checkRowBudget,
  clientIdFromRequest,
  consumeRowBudget,
  enforceHourlyLimit,
  enforceRateLimit,
  forbiddenOriginResponse,
  isAllowedOrigin,
  isStationId,
} from "@/lib/apiSecurity";
import {
  createUserStation,
  getStationsByIds,
  getStationsWithStatus,
} from "@/lib/data";
import { parseBBoxParam } from "@/lib/bbox";

export const dynamic = "force-dynamic";

const IDS_LIMIT = 30;
const WINDOW_MS = 60 * 1000;

// Часовой лимит на bbox-запросы вместо burst-лимита по минуте: обычная сессия
// «покатать карту по одному городу» — это авто-обновление раз в 75с (~48/ч)
// плюс десятки-сотни запросов от панорамирования/зума (debounce ~220-380мс на
// каждое движение) — с запасом укладывается в несколько сотен запросов в час.
// 2400/ч (было 800) — тройной запас даже для интенсивной сессии активного
// панорамирования/зума, но не позволяет тихо выкачивать область за областью
// весь день без пауз. Штраф сокращён с 5 до 2 минут, чтобы обычный пользователь,
// ненадолго упёршийся в лимит, быстрее возвращался к работе.
const BBOX_HOURLY_LIMIT = 2400;
const BBOX_HOURLY_WINDOW_MS = 60 * 60 * 1000;
const BBOX_PENALTY_MS = 2 * 60 * 1000;

// Один запрос в плотном городе легко возвращает 1000-3000 строк (см. комментарий
// у getStationsWithStatus в lib/data.ts — Москва на одном экране уже 1000+
// станций), а expandBBox(0.28) при каждом перемещении карты подгружает область
// с запасом, то есть соседние запросы сильно пересекаются по станциям. Бюджет
// должен с большим запасом перекрывать самую активную легитимную сессию в
// плотном городе (несколько десятков таких запросов за час), а не только
// "типичную" — иначе он ловит обычных пользователей, а не парсеров.
// 1 500 000 (было 500 000) — тройной запас по той же причине, что и выше.
const ROW_BUDGET = 1_500_000;
const ROW_BUDGET_WINDOW_MS = 60 * 60 * 1000;
const ROW_BUDGET_PENALTY_MS = 2 * 60 * 1000;

// GET /api/stations?bbox=south,west,north,east
// GET /api/stations?ids=uuid1,uuid2 — избранные заправки
export async function GET(request: Request) {
  if (!isAllowedOrigin(request)) return forbiddenOriginResponse();

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (idsParam) {
    const limited = enforceRateLimit(request, "stations:ids", IDS_LIMIT, WINDOW_MS);
    if (limited) return limited;

    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter((s) => isStationId(s))
      .slice(0, 50);
    if (ids.length === 0) {
      return NextResponse.json({ stations: [] });
    }
    try {
      const stations = await getStationsByIds(ids);
      return NextResponse.json({ stations });
    } catch (err) {
      console.error("GET /api/stations?ids error", err);
      return NextResponse.json(
        { error: "Не удалось загрузить избранные заправки" },
        { status: 500 }
      );
    }
  }

  const bboxParam = searchParams.get("bbox");
  if (!bboxParam) {
    return NextResponse.json(
      { error: "Параметр bbox или ids обязателен" },
      { status: 400 }
    );
  }

  const bbox = parseBBoxParam(bboxParam);
  if (!bbox) {
    // Некорректный bbox — не ломаем карту, отдаём пустой список.
    return NextResponse.json({ stations: [] });
  }

  const limited = enforceHourlyLimit(
    request,
    "stations:bbox",
    BBOX_HOURLY_LIMIT,
    BBOX_HOURLY_WINDOW_MS,
    BBOX_PENALTY_MS
  );
  if (limited) return limited;

  const rowLimited = checkRowBudget(
    request,
    "stations:rows",
    ROW_BUDGET,
    ROW_BUDGET_WINDOW_MS,
    ROW_BUDGET_PENALTY_MS
  );
  if (rowLimited) return rowLimited;

  try {
    const stations = await getStationsWithStatus(bbox);
    consumeRowBudget(request, "stations:rows", stations.length, ROW_BUDGET_WINDOW_MS);
    return NextResponse.json(
      { stations },
      {
        headers: {
          // public: данные не персонализированы (одинаковы для всех клиентов
          // одного bbox), можно кэшировать на CDN/edge — разгружает origin
          // и ускоряет повторные запросы того же участка карты.
          "Cache-Control": "public, max-age=15, stale-while-revalidate=45",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/stations error", err);
    return NextResponse.json(
      { error: "Не удалось загрузить заправки" },
      { status: 500 }
    );
  }
}

const CREATE_LIMIT = 5;
const CREATE_WINDOW_MS = 60 * 60 * 1000;

// POST /api/stations — добавить заправку пользователем
export async function POST(request: Request) {
  const limited = enforceRateLimit(
    request,
    "stations:create",
    CREATE_LIMIT,
    CREATE_WINDOW_MS
  );
  if (limited) return limited;

  let body: { lat?: number; lng?: number; name?: string; brand?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Укажите координаты" }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Некорректные координаты" }, { status: 400 });
  }

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "Заправка";
  const brand =
    typeof body.brand === "string" && body.brand.trim()
      ? body.brand.trim()
      : null;

  try {
    const station = await createUserStation(
      { lat, lng, name, brand },
      clientIdFromRequest(request)
    );
    return NextResponse.json({ station }, { status: 201 });
  } catch (err) {
    console.error("POST /api/stations error", err);
    return NextResponse.json(
      { error: "Не удалось добавить заправку" },
      { status: 500 }
    );
  }
}
