-- Хранит исходный id станции на gdebenz.ru (числовой OSM id или "usr_..."
-- для станций, добавленных через сам gdebenz) — отдельно от нашего
-- локального bigint `osm_id`, который для "usr_..." станций является
-- синтетическим хэшем и не годится для запроса gdebenz.ru API.
-- Нужен, чтобы scripts/sync-gdebenz-comments.mjs мог независимо от
-- scripts/sync-gdebenz.mjs (обход тайлов) дёргать
-- /api/comments/<gdebenz_id>/recent по уже известным станциям.
alter table public.stations
  add column if not exists gdebenz_id text;

create index if not exists stations_gdebenz_id_idx
  on public.stations (gdebenz_id)
  where gdebenz_id is not null;
