import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import path from "node:path";
import { bboxKey, parseBBoxParam } from "@/lib/bbox";

export const dynamic = "force-dynamic";
// ВНИМАНИЕ: полный обход России может длиться несколько минут и превышает
// типичные лимиты serverless-функций (10–60с). На Beget/обычном VPS это не
// проблема — роут запускает дочерний `node scripts/sync-gdebenz.mjs`.
// В serverless лучше дёргать только узкий регион через SYNC_BBOX или
// запускать синк системным cron'ом напрямую (см. SYNC.md).
export const maxDuration = 300;

// Простой запуск синка как дочернего процесса, чтобы не дублировать логику.
// Опциональный bbox ("south,west,north,east") ограничивает охват синка —
// передаётся дочернему процессу через переменную окружения SYNC_BBOX.
function runScript(bbox?: string): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "scripts", "sync-gdebenz.mjs");
    const child = spawn(process.execPath, [scriptPath], {
      env: bbox ? { ...process.env, SYNC_BBOX: bbox } : process.env,
      cwd: process.cwd(),
    });

    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      out += d.toString();
    });
    child.on("close", (code) => resolve({ code: code ?? -1, out }));
    child.on("error", (e) => resolve({ code: -1, out: out + String(e) }));
  });
}

// Сравнение в постоянном времени (защита от timing-атак).
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET не задан — роут отключён" },
      { status: 503 }
    );
  }

  // Ключ принимаем ТОЛЬКО через заголовок x-cron-key или Authorization: Bearer.
  // Query (?key=) больше не принимается — он утекает в логи доступа/Referer.
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const provided = request.headers.get("x-cron-key")?.trim() || bearer || "";
  if (!safeEqual(provided, secret)) {
    return NextResponse.json({ error: "Неверный ключ" }, { status: 401 });
  }

  // Опциональное ограничение охвата: ?bbox=south,west,north,east
  const { searchParams } = new URL(request.url);
  const bboxParam = searchParams.get("bbox")?.trim();
  let bbox: string | undefined;
  if (bboxParam) {
    const parsed = parseBBoxParam(bboxParam);
    if (!parsed) {
      return NextResponse.json(
        { error: "Неверный bbox или слишком большая область" },
        { status: 400 }
      );
    }
    bbox = bboxKey(parsed);
  }

  const { code, out } = await runScript(bbox);
  // Последние строки лога — для краткого ответа.
  const tail = out.trim().split("\n").slice(-12).join("\n");

  return NextResponse.json(
    { ok: code === 0, exitCode: code, log: tail },
    { status: code === 0 ? 200 : 500 }
  );
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
