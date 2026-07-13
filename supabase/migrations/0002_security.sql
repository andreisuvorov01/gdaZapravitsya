-- Ужесточение безопасности (security hardening)
-- Выполнить после 0001_init.sql: Supabase SQL Editor → Run, либо npm run setup:db
-- меняет на применение обеих миграций.

-- =========================================================
-- 1. Запрет прямой записи для публичных ролей (anon/authenticated)
-- =========================================================
-- Anon-ключ публичен (попадает в JS-бандл), поэтому разрешающие insert-политики
-- позволяли писать в БД напрямую через Supabase REST, минуя rate-limit, honeypot
-- и валидацию в API. Вся запись теперь идёт ТОЛЬКО через серверный API на
-- service-role (который и так обходит RLS). Чтение остаётся публичным.

revoke insert, update, delete on public.reports from anon, authenticated;
revoke insert, update, delete on public.stations from anon, authenticated;

-- Снимаем разрешающие insert-политики из 0001 (запись напрямую больше не нужна).
drop policy if exists reports_insert on public.reports;
drop policy if exists stations_insert on public.stations;

-- Политики *_select (using true) из 0001 сохраняются — данные публичны.

-- =========================================================
-- 2. increment_confirms: фиксируем search_path, квалифицируем таблицу
-- =========================================================
-- Без явного search_path функция уязвима к подмене объектов и флагается
-- Supabase Security Advisor. security invoker — выполняется с правами
-- вызывающего (для anon без UPDATE-прав вызов будет отклонён).
create or replace function public.increment_confirms(report_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.reports set confirms = confirms + 1 where id = report_id;
$$;

-- =========================================================
-- 3. View station_status — права вызывающего (PG15+)
-- =========================================================
alter view public.station_status set (security_invoker = true);

-- =========================================================
-- 4. Дедупликация подтверждений: один client_id — один confirm на отчёт
-- =========================================================
create table if not exists public.report_confirms (
  report_id  uuid not null references public.reports(id) on delete cascade,
  client_id  text not null,
  created_at timestamptz not null default now(),
  primary key (report_id, client_id)
);

create index if not exists report_confirms_client_idx
  on public.report_confirms (client_id, created_at desc);

alter table public.report_confirms enable row level security;
-- Доступ только через service-role: никаких политик для anon/authenticated.
revoke all on public.report_confirms from anon, authenticated;

-- =========================================================
-- 5. Storage: ограничения бакета station-photos
-- =========================================================
-- Лимит размера 5 МБ и только растровые изображения (без SVG с JS).
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'station-photos';

-- Убираем анонимную загрузку: текущий UI фото не загружает, а при включении
-- загрузки она должна идти через сервер (service-role / signed upload URL).
drop policy if exists "station photos insert" on storage.objects;

-- Публичное чтение фото ("station photos read") из 0001 сохраняется.
