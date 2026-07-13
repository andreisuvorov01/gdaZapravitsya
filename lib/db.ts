import { Pool } from "pg";

// Конфигурация Postgres. Если DATABASE_URL не задан, приложение работает в
// демо-режиме (мок-данные), чтобы его можно было запустить и посмотреть без
// настройки бэкенда — та же идея, что раньше была в lib/supabase.ts, только
// теперь без Supabase: self-hosted Postgres на том же VPS, что и сама Next.js
// (см. CLAUDE.md) — без REST-слоя и без сетевого хопа наружу.

function readDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim();
}

// Заглушки из .env.example не считаем реальной настройкой.
const PLACEHOLDER_MARKERS = ["user:password", "your-password", "xxxxxxxx", "example.com"];

function isRealDatabaseUrl(value: string | undefined): boolean {
  if (!value || value.length < 12) return false;
  const lower = value.toLowerCase();
  return !PLACEHOLDER_MARKERS.some((m) => lower.includes(m));
}

/** Читаем env при вызове — на проде DATABASE_URL появляется только в runtime на VPS. */
export function isDbConfigured(): boolean {
  return isRealDatabaseUrl(readDatabaseUrl());
}

// Один Pool на весь процесс (не per-request) — стандартный паттерн для `pg`;
// локальный Postgres на той же машине, так что размер пула держим скромным.
let pool: Pool | null = null;

export function getDb(): Pool | null {
  const databaseUrl = readDatabaseUrl();
  if (!isDbConfigured()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      // `pg` не ставит таймаут на установление соединения по умолчанию — если
      // Postgres недоступен (не запущен, не тот адрес/порт), Pool.connect()
      // висит бесконечно без ошибки. Это особенно больно на билд-тайме —
      // generateStaticParams для SEO-страниц городов (app/(content)/**/[city])
      // дёргает getStationsWithStatus() прямо во время `next build`, так что
      // зависший коннект вешает всю сборку без единого сообщения об ошибке.
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 10_000,
    });
  }
  return pool;
}
