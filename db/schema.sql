-- Схема БД "Карта заправок РФ" для self-hosted Postgres (без Supabase).
-- Консолидирует supabase/migrations/0001..0006 + migrate.mjs в одном файле —
-- применяется scripts/setup-db.mjs идемпотентно (create ... if not exists).
--
-- Сознательно НЕ включает то, что было специфично для Supabase-платформы и
-- не имеет смысла на голом Postgres:
--   - RLS-политики на ролях anon/authenticated (эти роли — часть Supabase
--     Auth/PostgREST; здесь приложение ходит в БД одной доверенной ролью без
--     REST-слоя, так что RLS ничего не даёт, только риск при restore);
--   - storage.buckets/storage.objects (схема storage — часть Supabase
--     Storage, не существует вне их платформы; фича и так не используется);
--   - alter publication supabase_realtime ... (Realtime убран, см. CLAUDE.md).
--
-- supabase/migrations/*.sql и migrate.mjs остаются в репозитории как история
-- эволюции схемы на Supabase — этот файл им не наследует, а заменяет.

create extension if not exists postgis;
create extension if not exists "uuid-ossp";

-- =========================================================
-- Таблица заправок
-- =========================================================
create table if not exists public.stations (
  id                        uuid primary key default uuid_generate_v4(),
  name                      text not null default 'АЗС',
  brand                     text,
  lat                       double precision not null,
  lng                       double precision not null,
  geo                       geography(point, 4326),
  address                   text,
  source                    text not null default 'user' check (source in ('osm', 'user')),
  osm_id                    bigint unique, -- дедупликация при импорте из OSM
  gdebenz_id                text,          -- id станции на gdebenz.ru (число или "usr_...")
  gdebenz_comments_synced_at timestamptz,  -- когда последний раз забирали ленту отметок gdebenz
  benzinest_id              text,          -- id станции на benzinest.ru
  last_report_at            timestamptz,   -- время самого свежего РЕАЛЬНОГО отчёта (для приоритизации обхода синков)
  created_at                timestamptz not null default now()
);

create index if not exists stations_geo_idx on public.stations using gist (geo);
create index if not exists stations_lat_idx on public.stations (lat);
create index if not exists stations_lng_idx on public.stations (lng);
create index if not exists stations_gdebenz_id_idx on public.stations (gdebenz_id) where gdebenz_id is not null;
create index if not exists stations_gdebenz_comments_synced_idx on public.stations (gdebenz_comments_synced_at) where gdebenz_id is not null;
create index if not exists stations_benzinest_id_idx on public.stations (benzinest_id);
create index if not exists stations_last_report_at_idx on public.stations (last_report_at);

-- Автозаполнение geo из lat/lng
create or replace function public.stations_set_geo()
returns trigger language plpgsql as $$
begin
  new.geo := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  return new;
end;
$$;

drop trigger if exists trg_stations_set_geo on public.stations;
create trigger trg_stations_set_geo
  before insert or update of lat, lng on public.stations
  for each row execute function public.stations_set_geo();

-- =========================================================
-- Таблица отчётов пользователей
-- =========================================================
create table if not exists public.reports (
  id           uuid primary key default uuid_generate_v4(),
  station_id   uuid not null references public.stations(id) on delete cascade,
  status       text not null check (status in ('yes', 'low', 'no', 'unknown')),
  fuel_types   text[] not null default '{}',
  limit_liters integer check (limit_liters is null or (limit_liters >= 0 and limit_liters <= 1000)),
  queue        text not null default 'none' check (queue in ('none', 'small', 'big', 'hours')),
  comment      text,
  photo_url    text,
  confirms     integer not null default 0,
  client_id    text, -- анонимный id/ip для rate-limit
  prices       jsonb, -- { "АИ-92": 54.1, "ДТ": 58.9, ... } ₽/л, см. lib/types.ts FUEL_TYPES
  canister     boolean not null default false, -- отпускают только в канистру (см. lib/types.ts CreateReportPayload)
  price_confirms integer not null default 0, -- подтверждений "цена верна" (отдельно от confirms статуса)
  created_at   timestamptz not null default now(),
  constraint reports_prices_is_object check (prices is null or jsonb_typeof(prices) = 'object')
);

-- canister и price_confirms добавлены после первоначального создания таблицы
-- на проде — `create table if not exists` выше не трогает уже существующую
-- таблицу, поэтому колонки нужно добавлять явно через ALTER, иначе повторный
-- прогон этого файла на уже настроенной базе (npm run setup:db) их не создаст.
alter table public.reports
  add column if not exists canister boolean not null default false;
alter table public.reports
  add column if not exists price_confirms integer not null default 0;

create index if not exists reports_station_idx on public.reports (station_id);
create index if not exists reports_created_idx on public.reports (created_at desc);
create index if not exists reports_client_idx on public.reports (client_id, created_at desc);
-- Ускоряет "distinct on (station_id) ... where prices is not null order by
-- station_id, created_at desc" — выборку самой свежей цены на станцию
-- (см. getLatestPricesByIds в lib/data.ts), без ограничения по возрасту.
create index if not exists reports_prices_station_created_idx
  on public.reports (station_id, created_at desc) where prices is not null;

-- =========================================================
-- Дедупликация подтверждений: один client_id — один confirm на отчёт
-- =========================================================
create table if not exists public.report_confirms (
  report_id  uuid not null references public.reports(id) on delete cascade,
  client_id  text not null,
  created_at timestamptz not null default now(),
  primary key (report_id, client_id)
);

create index if not exists report_confirms_client_idx on public.report_confirms (client_id, created_at desc);

-- =========================================================
-- Дедупликация подтверждений цены: один client_id — один "цена верна" на отчёт.
-- Отдельно от report_confirms — подтверждение цены логически не то же самое,
-- что подтверждение всего отчёта (статус+очередь+топливо+цена одним пакетом).
-- =========================================================
create table if not exists public.report_price_confirms (
  report_id  uuid not null references public.reports(id) on delete cascade,
  client_id  text not null,
  created_at timestamptz not null default now(),
  primary key (report_id, client_id)
);

create index if not exists report_price_confirms_client_idx on public.report_price_confirms (client_id, created_at desc);

-- =========================================================
-- Атомарный инкремент подтверждений
-- security invoker + фиксированный search_path — тот же hardening, что был
-- применён на Supabase (0002_security.sql), сохраняем по умолчанию.
-- =========================================================
create or replace function public.increment_confirms(report_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.reports set confirms = confirms + 1 where id = report_id;
$$;

create or replace function public.increment_price_confirms(report_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.reports set price_confirms = price_confirms + 1 where id = report_id;
$$;

-- =========================================================
-- Массовое обновление last_report_at РАЗНЫМИ значениями за один запрос
-- (см. migrate.mjs для истории — обычный upsert тут не годится: Postgres
-- строит полную кандидатную строку до проверки конфликта, а неполный payload
-- {id, last_report_at} валится с "null value in column lat").
-- =========================================================
create or replace function public.bulk_update_last_report_at(updates jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.stations s
  set last_report_at = (u.value->>'last_report_at')::timestamptz
  from jsonb_array_elements(updates) as u(value)
  where s.id = (u.value->>'id')::uuid;
$$;

-- =========================================================
-- View: упрощённый агрегированный статус (fallback; реальная логика — в
-- lib/freshness.ts на стороне Node, см. CLAUDE.md)
-- =========================================================
create or replace view public.station_status as
with fresh as (
  select *
  from public.reports
  where created_at >= now() - interval '3 hours'
),
ranked as (
  select
    f.station_id,
    f.status,
    count(*) as cnt,
    max(f.created_at) as last_at,
    row_number() over (
      partition by f.station_id order by count(*) desc, max(f.created_at) desc
    ) as rn
  from fresh f
  group by f.station_id, f.status
)
select
  s.id,
  s.name,
  s.brand,
  s.lat,
  s.lng,
  s.address,
  s.source,
  coalesce(r.status, 'unknown') as status,
  r.last_at as last_report_at,
  coalesce((select count(*) from fresh fr where fr.station_id = s.id), 0) as reports_count
from public.stations s
left join ranked r on r.station_id = s.id and r.rn = 1;
