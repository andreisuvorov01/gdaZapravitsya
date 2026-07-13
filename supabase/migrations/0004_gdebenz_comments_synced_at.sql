-- Метка "когда последний раз успешно забирали ленту отметок этой станции" —
-- позволяет scripts/sync-gdebenz-comments.mjs пропускать станции, для
-- которых лента уже свежая (см. COMMENTS_COOLDOWN_MIN в SYNC.md), вместо
-- того чтобы каждый прогон долбить один и тот же /api/comments/<id>/recent
-- по всем станциям без разбора.
alter table public.stations
  add column if not exists gdebenz_comments_synced_at timestamptz;

create index if not exists stations_gdebenz_comments_synced_idx
  on public.stations (gdebenz_comments_synced_at)
  where gdebenz_id is not null;
