-- Схема БД "Карта заправок РФ"
-- Выполнить в Supabase: SQL Editor → New query → Run.

-- Расширения
create extension if not exists postgis;
create extension if not exists "uuid-ossp";

-- =========================================================
-- Таблица заправок
-- =========================================================
create table if not exists public.stations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null default 'АЗС',
  brand       text,
  lat         double precision not null,
  lng         double precision not null,
  geo         geography(point, 4326),
  address     text,
  source      text not null default 'user' check (source in ('osm', 'user')),
  osm_id      bigint unique, -- для дедупликации при импорте из OSM
  created_at  timestamptz not null default now()
);

-- Геоиндекс и индексы по координатам (для bbox-выборок)
create index if not exists stations_geo_idx on public.stations using gist (geo);
create index if not exists stations_lat_idx on public.stations (lat);
create index if not exists stations_lng_idx on public.stations (lng);

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
  created_at   timestamptz not null default now()
);

create index if not exists reports_station_idx on public.reports (station_id);
create index if not exists reports_created_idx on public.reports (created_at desc);
create index if not exists reports_client_idx on public.reports (client_id, created_at desc);

-- =========================================================
-- Атомарный инкремент подтверждений
-- =========================================================
create or replace function public.increment_confirms(report_id uuid)
returns void language sql as $$
  update public.reports set confirms = confirms + 1 where id = report_id;
$$;

-- =========================================================
-- View: текущий агрегированный статус заправки
-- (за последние 3 часа; берём самый частый статус, последние значения)
-- Это упрощённая серверная агрегация; в приложении используется
-- взвешенная по свежести логика из lib/freshness.ts.
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

-- =========================================================
-- RLS-политики
-- =========================================================
alter table public.stations enable row level security;
alter table public.reports enable row level security;

-- Чтение заправок — всем
drop policy if exists stations_select on public.stations;
create policy stations_select on public.stations
  for select using (true);

-- Добавлять заправки могут анонимы (source='user'); правки/удаление — только service role
drop policy if exists stations_insert on public.stations;
create policy stations_insert on public.stations
  for insert with check (source = 'user');

-- Чтение отчётов — всем
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select using (true);

-- Создание отчётов — всем (rate-limit реализован на уровне API-роута)
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert with check (true);

-- =========================================================
-- Storage: бакет для фото с заправок (создать вручную в UI или ниже)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('station-photos', 'station-photos', true)
on conflict (id) do nothing;

-- Публичное чтение фото
drop policy if exists "station photos read" on storage.objects;
create policy "station photos read" on storage.objects
  for select using (bucket_id = 'station-photos');

-- Анонимная загрузка фото
drop policy if exists "station photos insert" on storage.objects;
create policy "station photos insert" on storage.objects
  for insert with check (bucket_id = 'station-photos');

-- Realtime: публикуем изменения reports (идемпотентно)
do $$
begin
  alter publication supabase_realtime add table public.reports;
exception
  when duplicate_object then null;
end $$;
