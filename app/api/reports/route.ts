import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  isReportId,
  isStationId,
  rateLimitDisabled,
  rateLimitKey,
} from "@/lib/apiSecurity";
import {
  confirmPrice,
  confirmReport,
  countRecentConfirms,
  countRecentPriceConfirms,
  countRecentReports,
  createReport,
  getStationReports,
} from "@/lib/data";
import {
  FUEL_TYPES,
  type CreateReportPayload,
  type FuelPrices,
  type FuelStatus,
  type FuelType,
  type QueueLevel,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUS: FuelStatus[] = ["yes", "low", "no", "unknown"];
const VALID_QUEUE: QueueLevel[] = ["none", "small", "big", "hours"];
const RATE_LIMIT = 8;
const CONFIRM_RATE_LIMIT = 30;
const GET_RATE_LIMIT = 60;
const GET_WINDOW_MS = 60 * 1000;

// Цена ₽/л: реалистичный диапазон с запасом (защита от опечаток/абьюза,
// не привязана к текущим ценам, чтобы не переписывать при индексации).
const MIN_PRICE = 1;
const MAX_PRICE = 300;

function sanitizePrices(value: unknown): FuelPrices | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: FuelPrices = {};
  for (const [fuel, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!FUEL_TYPES.includes(fuel as FuelType)) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < MIN_PRICE || n > MAX_PRICE) continue;
    out[fuel as FuelType] = Math.round(n * 100) / 100;
  }
  return Object.keys(out).length > 0 ? out : null;
}

// Загрузка фото к отчётам не реализована в текущем UI (ReportForm её не
// отправляет) — раньше тут проверялось, что photo_url указывает на Supabase
// Storage bucket "station-photos"; после перехода на self-hosted Postgres без
// Storage это поле остаётся в схеме на будущее, но всегда обнуляется.
function sanitizePhotoUrl(value: unknown): string | null {
  void value;
  return null;
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "reports:get", GET_RATE_LIMIT, GET_WINDOW_MS);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("station_id");
  if (!stationId) {
    return NextResponse.json(
      { error: "Параметр station_id обязателен" },
      { status: 400 }
    );
  }
  if (!isStationId(stationId)) {
    return NextResponse.json({ error: "Неверный station_id" }, { status: 400 });
  }
  try {
    const reports = await getStationReports(stationId);
    return NextResponse.json({ reports });
  } catch (err) {
    console.error("GET /api/reports error", err);
    return NextResponse.json(
      { error: "Не удалось загрузить отчёты" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: CreateReportPayload;
  try {
    body = (await request.json()) as CreateReportPayload;
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  if (!body.station_id || typeof body.station_id !== "string") {
    return NextResponse.json({ error: "Не указана заправка" }, { status: 400 });
  }
  if (!isStationId(body.station_id)) {
    return NextResponse.json({ error: "Неверный station_id" }, { status: 400 });
  }
  if (!VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ error: "Неверный статус" }, { status: 400 });
  }
  if (!VALID_QUEUE.includes(body.queue)) {
    return NextResponse.json({ error: "Неверная очередь" }, { status: 400 });
  }
  const fuelTypes: FuelType[] = Array.isArray(body.fuel_types)
    ? body.fuel_types.filter((f): f is FuelType =>
        FUEL_TYPES.includes(f as FuelType)
      )
    : [];
  let limit: number | null = null;
  if (body.limit_liters != null) {
    const n = Number(body.limit_liters);
    if (!Number.isNaN(n) && n >= 0 && n <= 1000) limit = Math.round(n);
  }
  const comment =
    typeof body.comment === "string" ? body.comment.slice(0, 300) : null;

  // Не clientIdFromRequest: тот отдаёт голый IP из заголовков прокси и
  // приоритетно перекрывает x-client-id, что за общим/сломанным прокси
  // хостинга схлопывает всех посетителей в один client_id — тогда
  // countRecentReports считает отчёты всех пользователей разом, и лимит
  // срабатывает на всех сразу вместо конкретного нарушителя.
  const clientId = rateLimitKey(request);

  try {
    if (!rateLimitDisabled()) {
      const recent = await countRecentReports(clientId, 5);
      if (recent >= RATE_LIMIT) {
        return NextResponse.json(
          { error: "Слишком много отчётов. Попробуйте позже." },
          { status: 429 }
        );
      }
    }
  } catch (err) {
    console.error("POST /api/reports rate-limit error", err);
    return NextResponse.json(
      { error: "Сервис временно недоступен. Попробуйте позже." },
      { status: 503 }
    );
  }

  try {
    const report = await createReport(
      {
        station_id: body.station_id,
        status: body.status,
        fuel_types: fuelTypes,
        limit_liters: limit,
        queue: body.queue,
        prices: sanitizePrices(body.prices),
        comment,
        photo_url: sanitizePhotoUrl(body.photo_url),
        canister: Boolean(body.canister),
      },
      clientId
    );
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    console.error("POST /api/reports error", err);
    return NextResponse.json(
      { error: "Не удалось сохранить отчёт" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  let body: { report_id?: string; kind?: "status" | "price" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }
  if (!body.report_id || typeof body.report_id !== "string") {
    return NextResponse.json(
      { error: "Не указан report_id" },
      { status: 400 }
    );
  }
  if (!isReportId(body.report_id)) {
    return NextResponse.json({ error: "Неверный report_id" }, { status: 400 });
  }
  const isPrice = body.kind === "price";

  const clientId = rateLimitKey(request);

  try {
    if (!rateLimitDisabled()) {
      const recent = isPrice
        ? await countRecentPriceConfirms(clientId, 5)
        : await countRecentConfirms(clientId, 5);
      if (recent >= CONFIRM_RATE_LIMIT) {
        return NextResponse.json(
          { error: "Слишком много подтверждений. Попробуйте позже." },
          { status: 429 }
        );
      }
    }
  } catch (err) {
    console.error("PATCH /api/reports rate-limit error", err);
    return NextResponse.json(
      { error: "Сервис временно недоступен. Попробуйте позже." },
      { status: 503 }
    );
  }

  try {
    const ok = isPrice
      ? await confirmPrice(body.report_id, clientId)
      : await confirmReport(body.report_id, clientId);
    return NextResponse.json({ ok });
  } catch (err) {
    console.error("PATCH /api/reports error", err);
    return NextResponse.json(
      { error: "Не удалось подтвердить отчёт" },
      { status: 500 }
    );
  }
}
