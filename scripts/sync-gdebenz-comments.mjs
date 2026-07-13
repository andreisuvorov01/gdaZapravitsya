import { loadEnv } from "./load-env.mjs";
import { PROXY_POOL, closeTransports, createRateGate, looksLikeBlock, requestWithRetries } from "./lib/gdebenz-http.mjs";
import { toCommentReportRow } from "./lib/gdebenz-parse.mjs";
import { withRetry } from "./lib/db-retry.mjs";
import { closePool, getPool } from "./lib/db.mjs";

loadEnv();

let isMain;
try {
  isMain = process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`;
} catch {
  isMain = false;
}
const runAsScript = isMain || process.argv[1]?.endsWith("sync-gdebenz-comments.mjs");

// Разбираем CLI-флаги ДО объявления констант ниже (они читают process.env) —
// --bbox=... / позиционный bbox, --all (полный обход без учёта cooldown) и
// --turbo (заметно быстрее, ценой более высокого риска повторно словить
// блок по IP — см. SYNC.md). Флаги не переопределяют явно заданные
// переменные окружения, только достраивают дефолты.
if (runAsScript) {
  const args = process.argv.slice(2);
  const argBbox = args
    .map((a) => (a.startsWith("--bbox=") ? a.slice("--bbox=".length) : a))
    .find((a) => a && !a.startsWith("-"));
  if (argBbox) process.env.SYNC_BBOX ??= argBbox.trim();

  if (args.includes("--all")) {
    process.env.COMMENTS_COOLDOWN_MIN ??= "0";
  }
  if (args.includes("--turbo") || args.includes("--fast")) {
    process.env.COMMENTS_MIN_INTERVAL_MS ??= "100";
    process.env.COMMENTS_CONCURRENCY ??= "5";
    process.env.COMMENTS_BREAKER_THRESHOLD ??= "12";
  }
}

// ---------------------------------------------------------------------------
// Быстрый забор ленты отметок станций (`/api/comments/<id>/recent`) —
// НЕ делает тайловый обход и не upsert'ит станции (это задача
// scripts/sync-gdebenz.mjs). Читает список станций и их `gdebenz_id`
// напрямую из Supabase курсорной пагинацией по `id` и дёргает per-station
// эндпоинт. Использует тот же HTTP/прокси-транспорт
// (scripts/lib/gdebenz-http.mjs), что и тайловый синк — те же ретраи,
// ротация прокси и фоллбэк transports (browser/https), плюс два
// специфичных для этого скрипта предохранителя (см. ниже).
//
// Для каждой станции, где запрос удался, вся предыдущая история
// client_id='gdebenz' удаляется и заменяется свежей лентой целиком (у
// отметок gdebenz нет стабильного id для точечного мержа). Запись идёт
// постранично (чанками по PAGE_SIZE станций), а не одним delete+insert в
// конце прогона — так прогресс сохраняется инкрементально, и падение
// скрипта на середине обхода не теряет уже записанные страницы.
// ---------------------------------------------------------------------------

const COMMENTS_API_BASE = "https://gdebenz.ru/api/comments";
const COMMENTS_LIMIT = Math.max(1, Number(process.env.COMMENTS_LIMIT) || 20);
/** Сколько станций тянуть из Supabase и обрабатывать за одну "волну". */
const PAGE_SIZE = Math.max(1, Number(process.env.PAGE_SIZE) || 500);
/** Размер батча insert/update-запроса. */
const BATCH = Math.max(1, Number(process.env.BATCH) || 500);
/** Число параллельных запросов к gdebenz.ru внутри одной страницы.
 * Специально НЕ выше тайлового синка по умолчанию: этот скрипт делает один
 * запрос на КАЖДУЮ станцию (на порядок больше запросов, чем тайлов).
 * Реальный потолок RPS теперь держит COMMENTS_MIN_INTERVAL_MS (ниже) —
 * конкурентность в основном скрывает сетевую задержку, а не увеличивает
 * частоту запросов, так что поднимать её отдельно от гейта не нужно. */
const DEFAULT_CONCURRENCY = process.platform === "win32" ? 1 : 2;
const COMMENTS_CONCURRENCY = Math.max(1, Number(process.env.COMMENTS_CONCURRENCY) || DEFAULT_CONCURRENCY);
/** Не дёргать станцию, если её ленту уже забирали успешно в последние N минут —
 * без этого каждый прогон долбит ВСЕ станции заново, даже те, что не устарели.
 * Держите заметно ниже интервала расписания (см. SYNC.md), чтобы плановый
 * прогон не считал их "недавними" и не пропускал. */
const COMMENTS_COOLDOWN_MIN = Math.max(0, Number(process.env.COMMENTS_COOLDOWN_MIN ?? 25));
/** Жёсткий потолок частоты запросов к gdebenz.ru: минимальный интервал, мс,
 * между СТАРТАМИ любых двух запросов, независимо от конкурентности. */
const COMMENTS_MIN_INTERVAL_MS = Math.max(0, Number(process.env.COMMENTS_MIN_INTERVAL_MS ?? 500));
/** Сколько подряд неудачных запросов считать признаком блокировки по IP и
 * прерывать весь прогон, а не продолжать долбить уже заблокированный сервер. */
const COMMENTS_BREAKER_THRESHOLD = Math.max(1, Number(process.env.COMMENTS_BREAKER_THRESHOLD) || 6);

const rateGate = createRateGate(COMMENTS_MIN_INTERVAL_MS);

async function fetchStationComments(gdebenzId) {
  const url = `${COMMENTS_API_BASE}/${encodeURIComponent(gdebenzId)}/recent?limit=${COMMENTS_LIMIT}`;
  await rateGate();
  try {
    return await requestWithRetries(url, (res) => (Array.isArray(res.data) ? res.data : []));
  } catch (e) {
    console.warn(`  Не удалось получить отметки станции ${gdebenzId}: ${e.message}`);
    return { error: e };
  }
}

async function fetchStationPage(pool, { bbox, cutoffIso, afterId }) {
  // Курсорная пагинация по id, а не offset: этот скрипт помечает
  // обработанные станции gdebenz_comments_synced_at внутри того же прогона,
  // из-за чего они перестают попадать под фильтр ниже — при offset-пагинации
  // это сдвигало бы "хвост" результата и пропускало станции. Пагинация по
  // id устойчива к этому, т.к. никогда не возвращается назад.
  const conditions = ["gdebenz_id is not null", "(gdebenz_comments_synced_at is null or gdebenz_comments_synced_at < $1)"];
  const params = [cutoffIso];
  if (bbox) {
    const [south, west, north, east] = bbox;
    conditions.push(
      `lat >= $${params.length + 1} and lat <= $${params.length + 2} and lng >= $${params.length + 3} and lng <= $${params.length + 4}`
    );
    params.push(south, north, west, east);
  }
  if (afterId) {
    conditions.push(`id > $${params.length + 1}`);
    params.push(afterId);
  }
  params.push(PAGE_SIZE);

  const { rows } = await withRetry(
    () =>
      pool.query(
        `select id, gdebenz_id from public.stations
         where ${conditions.join(" and ")}
         order by id asc
         limit $${params.length}`,
        params
      ),
    { label: "stations select" }
  );
  return rows;
}

/** Обрабатывает одну страницу станций: тянет отметки конкурентно (с рейт-гейтом и брейкером), пишет в БД сразу по завершении страницы. */
async function processPage(pool, page, state) {
  const rowsByStation = new Map();
  const processedIds = [];
  let nextIndex = 0;
  const workerCount = Math.min(COMMENTS_CONCURRENCY, page.length);

  async function worker() {
    while (true) {
      if (state.breakerTripped) return;
      const index = nextIndex++;
      if (index >= page.length) return;
      const station = page[index];
      const result = await fetchStationComments(station.gdebenz_id);
      state.totals.attempted++;

      if (result.error) {
        state.totals.failed++;
        state.consecutiveFailures++;
        if (state.consecutiveFailures >= COMMENTS_BREAKER_THRESHOLD) {
          state.breakerTripped = true;
          state.breakerError = result.error;
        }
        continue;
      }
      state.consecutiveFailures = 0;
      processedIds.push(station.id);

      const entries = result;
      if (entries.length === 0) {
        state.totals.empty++;
        continue;
      }
      const rows = entries.map((e) => toCommentReportRow(station.id, e)).filter(Boolean);
      if (rows.length === 0) {
        state.totals.empty++;
        continue;
      }
      rowsByStation.set(station.id, rows);
      state.totals.ok++;
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));

  if (rowsByStation.size > 0) {
    const coveredIds = [...rowsByStation.keys()];
    await withRetry(
      () =>
        pool.query(`delete from public.reports where client_id = 'gdebenz' and station_id = any($1::uuid[])`, [
          coveredIds,
        ]),
      { label: "reports delete" }
    );

    const allRows = coveredIds.flatMap((id) => rowsByStation.get(id));
    for (let i = 0; i < allRows.length; i += BATCH) {
      const chunk = allRows.slice(i, i + BATCH);
      await withRetry(
        () =>
          pool.query(
            `insert into public.reports
               (station_id, status, fuel_types, queue, limit_liters, confirms, client_id, created_at)
             select x.station_id, x.status, x.fuel_types, x.queue, x.limit_liters, x.confirms, x.client_id, x.created_at
             from jsonb_to_recordset($1::jsonb) as x(
               station_id uuid, status text, fuel_types text[], queue text,
               limit_liters int, confirms int, client_id text, created_at timestamptz
             )`,
            [JSON.stringify(chunk)]
          ),
        { label: "reports insert" }
      );
      state.totals.rowsInserted += chunk.length;
    }
    state.totals.stationsWritten += coveredIds.length;
  }

  // Помечаем свежими ВСЕ успешно опрошенные станции (в т.ч. с пустой лентой) —
  // так они не полезут под фильтр cooldown в ближайшие COMMENTS_COOLDOWN_MIN
  // минут. Провалившиеся НЕ помечаем — им нужно повторить попытку.
  if (processedIds.length > 0) {
    const nowIso = new Date().toISOString();
    for (let i = 0; i < processedIds.length; i += BATCH) {
      const chunk = processedIds.slice(i, i + BATCH);
      await withRetry(
        () =>
          pool.query(`update public.stations set gdebenz_comments_synced_at = $1 where id = any($2::uuid[])`, [
            nowIso,
            chunk,
          ]),
        { label: "stations mark synced" }
      );
    }
  }
}

export async function runSync({ log = console.log } = {}) {
  const pool = getPool();

  if (PROXY_POOL.length > 0) {
    log(`Прокси: ${PROXY_POOL.length} шт. в пуле`);
  }

  let bbox;
  const bboxEnv = process.env.SYNC_BBOX?.trim();
  if (bboxEnv) {
    const p = bboxEnv.split(",").map(Number);
    if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) {
      throw new Error(`Неверный SYNC_BBOX (ожидается "south,west,north,east"): ${bboxEnv}`);
    }
    bbox = p;
    log(`Режим SYNC_BBOX: ${bboxEnv}`);
  }

  log(
    `Конкурентность: ${COMMENTS_CONCURRENCY}, лимит отметок на станцию: ${COMMENTS_LIMIT}, ` +
      `мин. интервал между запросами: ${COMMENTS_MIN_INTERVAL_MS}мс, cooldown: ${COMMENTS_COOLDOWN_MIN}мин, ` +
      `брейкер после ${COMMENTS_BREAKER_THRESHOLD} неудач подряд`
  );

  const cutoffIso = new Date(Date.now() - COMMENTS_COOLDOWN_MIN * 60 * 1000).toISOString();
  const state = {
    totals: { attempted: 0, ok: 0, empty: 0, failed: 0, stationsWritten: 0, rowsInserted: 0 },
    consecutiveFailures: 0,
    breakerTripped: false,
    breakerError: null,
  };

  try {
    let afterId;
    let pageNum = 0;
    while (true) {
      const page = await fetchStationPage(pool, { bbox, cutoffIso, afterId });
      if (page.length === 0) break;
      pageNum++;
      await processPage(pool, page, state);
      afterId = page[page.length - 1].id;
      log(
        `Страница ${pageNum}: обработано ${state.totals.attempted} станций (ok ${state.totals.ok}, пусто ${state.totals.empty}, ошибок ${state.totals.failed}), записано отметок ${state.totals.rowsInserted}`
      );
      if (state.breakerTripped) {
        const blockLike = looksLikeBlock(state.breakerError);
        log(
          `Прервано: ${COMMENTS_BREAKER_THRESHOLD} неудачных запросов подряд` +
            (blockLike
              ? " (похоже на блокировку по IP на стороне gdebenz.ru — HTTP 403, см. SYNC.md). Остановка, чтобы не усугублять."
              : ` (последняя ошибка: ${state.breakerError?.message}). Остановка вместо долбления сервера дальше.`)
        );
        break;
      }
      if (page.length < PAGE_SIZE) break;
    }

    log(
      `Готово. Станций обработано: ${state.totals.attempted}, со свежей историей: ${state.totals.stationsWritten}, отметок записано: ${state.totals.rowsInserted}, ошибок запроса: ${state.totals.failed}.`
    );
    return { ...state.totals, breakerTripped: state.breakerTripped };
  } finally {
    await closeTransports();
    await closePool();
  }
}

if (runAsScript) {
  runSync().catch((e) => {
    console.error("Ошибка синка отметок:", e.message);
    process.exit(1);
  });
}
