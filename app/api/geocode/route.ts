import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiSecurity";
import {
  geocodeQueryServer,
  reverseGeocodeCityServer,
} from "@/lib/nominatimServer";

export const dynamic = "force-dynamic";

const GEOCODE_LIMIT = 30; // запросов в минуту на клиента
const WINDOW_MS = 60 * 1000;

// GET /api/geocode?q=Краснодар, Россия
// GET /api/geocode?lat=55.75&lng=37.62
export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "geocode", GEOCODE_LIMIT, WINDOW_MS);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");

  if (q) {
    if (q.length < 2 || q.length > 200) {
      return NextResponse.json(
        { error: "Некорректный запрос" },
        { status: 400 }
      );
    }
    try {
      const hit = await geocodeQueryServer(q);
      if (!hit) {
        return NextResponse.json({ error: "Не найдено" }, { status: 404 });
      }
      return NextResponse.json(hit);
    } catch (err) {
      console.error("GET /api/geocode search error", err);
      return NextResponse.json(
        { error: "Геокодер временно недоступен" },
        { status: 502 }
      );
    }
  }

  if (latParam != null && lngParam != null) {
    const lat = Number(latParam);
    const lng = Number(lngParam);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return NextResponse.json(
        { error: "Некорректные координаты" },
        { status: 400 }
      );
    }
    try {
      const city = await reverseGeocodeCityServer(lat, lng);
      return NextResponse.json({ city });
    } catch (err) {
      console.error("GET /api/geocode reverse error", err);
      return NextResponse.json(
        { error: "Геокодер временно недоступен" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(
    { error: "Укажите q или lat+lng" },
    { status: 400 }
  );
}
