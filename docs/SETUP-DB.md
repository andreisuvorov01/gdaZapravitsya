# Настройка базы данных (self-hosted Postgres)

Бэкенд — обычный Postgres + PostGIS **на том же сервере**, что и само приложение.
Никакого REST-слоя, никакой отдельной облачной панели — только `DATABASE_URL` в `.env`.

## 1. Установите Postgres + PostGIS

На Ubuntu/Debian (актуальную версию Postgres уточните под свой дистрибутив):

```bash
sudo apt install postgresql postgresql-contrib postgresql-<ver>-postgis-3
```

## 2. Создайте БД и роль

```bash
sudo -u postgres psql -c "create role benzin_app with login password 'СЛОЖНЫЙ_ПАРОЛЬ';"
sudo -u postgres psql -c "create database benzin owner benzin_app;"
```

Слушать только localhost/unix-socket — наружу порт 5432 не открывать (в этом
и разница с прошлым Supabase-облаком: тут нет причин пускать соединения снаружи).

## 3. `.env`

Скопируйте `.env.example` → `.env` и укажите:

```
DATABASE_URL=postgresql://benzin_app:СЛОЖНЫЙ_ПАРОЛЬ@localhost:5432/benzin
```

После сохранения перезапустите `npm run dev` — плашка «Демо-режим» исчезнет.

## 4. Схема БД

```bash
npm run setup:db
```

Применяет `db/schema.sql` (идемпотентно — таблицы/индексы/функции создаются
`if not exists`/`create or replace`, повторный запуск безопасен).

## 5. Заправки

Один из вариантов:

```bash
npm run seed:db    # lib/regions/krasnodar.json (163 АЗС) — быстрый старт для теста
npm run seed       # импорт из OSM Overpass API (SEED_BBOX, по умолчанию Москва)
```

Для полноценного прод-наполнения — `npm run sync:gdebenz` (см. `SYNC.md`).

## 6. Перенос существующих данных с Supabase

Если у вас уже есть данные на Supabase (или в NDJSON-бэкапе `backup/*.ndjson`),
после шага 4 (схема применена, но БД ещё пустая) прогоните:

```bash
node scripts/migrate-data-from-supabase.mjs [путь-к-папке-с-бэкапом]
```

Идемпотентен (`on conflict do nothing`) — безопасно перезапускать.

## 7. Деплой

`db` теперь физически на том же сервере, что и Next.js — деплой самого
приложения не меняется:

1. `npm run build` (`output: "standalone"`)
2. Загрузить `.next/standalone/`, `.next/static`, `public`
3. Env-переменные как в `.env` (включая `DATABASE_URL`, указывающий на
   `localhost`, а не на внешний хост)
4. `node server.js` (или `pm2 startOrRestart ecosystem.config.js`, см. `scripts/deploy.sh`)

Подробнее: [README.md](../README.md).
