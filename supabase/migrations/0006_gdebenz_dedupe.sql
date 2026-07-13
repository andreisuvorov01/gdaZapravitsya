-- Разово схлопываем историю повторных прогонов scripts/sync-gdebenz.mjs:
-- раньше каждый прогон (каждые ~3ч) вставлял НОВУЮ строку в reports для
-- client_id='gdebenz' на каждую станцию, даже если статус/очередь/топливо
-- не изменились — из-за этого "свежесть" станции на карте сбрасывалась без
-- реальных изменений, а таблица reports разрослась дублями (сотни тысяч
-- строк). Оставляем по каждой станции только самый свежий gdebenz-отчёт;
-- сам скрипт синка теперь обновляет эту единственную строку на месте вместо
-- вставки новой при отсутствии изменений (см. scripts/sync-gdebenz.mjs).
delete from public.reports r
using public.reports r2
where r.client_id = 'gdebenz'
  and r2.client_id = 'gdebenz'
  and r.station_id = r2.station_id
  and (r.created_at, r.id) < (r2.created_at, r2.id);
