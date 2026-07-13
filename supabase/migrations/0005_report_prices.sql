-- Цены на топливо в отчётах пользователей: { "АИ-92": 54.1, "ДТ": 58.9, ... }
-- (₽/л, по видам топлива из lib/types.ts FUEL_TYPES). Валидация значений —
-- на уровне API (app/api/reports/route.ts); здесь только форма jsonb.
alter table public.reports
  add column if not exists prices jsonb;

alter table public.reports
  drop constraint if exists reports_prices_is_object;

alter table public.reports
  add constraint reports_prices_is_object
  check (prices is null or jsonb_typeof(prices) = 'object');
