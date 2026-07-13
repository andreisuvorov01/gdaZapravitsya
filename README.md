# ⛽ Где бензин — карта заправок РФ

Краудсорсинговый сайт, который показывает ситуацию на заправках России в реальном времени: где есть топливо, какие лимиты на руки (литры) и где очереди. Данные присылают сами пользователи.

## Возможности

- Интерактивная карта заправок (**Яндекс.Карты API**, стиль навигатора) с кластеризацией.
- Цветные маркеры по статусу: зелёный — есть, жёлтый — мало/лимит, красный — нет, серый — нет данных.
- Анонимные отчёты пользователей: наличие топлива, виды (АИ-92/95/98/100, ДТ, газ), лимит на руки, длина очереди, комментарий.
- Агрегация статуса с учётом свежести отчётов (взвешивание по времени и подтверждениям).
- Быстрое обновление данных на карте (периодический опрос, 20с).
- Кнопка "Подтвердить" для повышения доверия к отчёту.
- Фильтры по виду топлива и "только где есть бензин".
- Геолокация "заправки рядом со мной".
- Адаптивный интерфейс (десктоп + мобильные).
- Базовая защита от спама: rate-limit и honeypot.

## Технологии

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Яндекс.Карты API 2.1** — карта
- **Self-hosted Postgres + PostGIS** — бэкенд на том же сервере, что и приложение (прямое подключение через `pg`, без REST-слоя)
- Источник заправок: **OpenStreetMap** (bundled по регионам + импорт в БД)

## Быстрый старт (демо-режим)

Приложение запускается без бэкенда — с примерными данными в памяти:

```bash
npm install
npm run dev
```

Откройте http://localhost:3000. Вверху будет плашка "Демо-режим".

## Настройка базы данных (полноценный режим)

Подробная инструкция: [`docs/SETUP-DB.md`](docs/SETUP-DB.md).

1. Поднимите Postgres + PostGIS (локально или на том же сервере, где будет жить приложение).
2. Заполните `.env` (см. [`.env.example`](.env.example)): `DATABASE_URL`.
3. Примените схему: `npm run setup:db` (`db/schema.sql`, идемпотентно).
4. Загрузите заправки: `npm run seed:db` (Краснодар из `lib/regions/krasnodar.json`).
5. `npm run dev` — без плашки «Демо-режим».

Импорт других регионов из OSM: `npm run seed` с `SEED_BBOX=…` или `node scripts/fetch-region.mjs …`.

## Деплой

### Beget (VPS / Node.js) — git + pm2

Обновление и перезапуск прода — в одну команду: `npm run deploy`
(`scripts/deploy.sh`: `git pull` → `npm ci` → `npm run build` → копирует
`public`/`.next/static` в `.next/standalone` (Next.js `output: "standalone"`
сам этого не делает) → кладёт `.env` в бандл → `pm2 startOrReload`).

**Разовая подготовка сервера:**

```bash
# Node.js >= 18.18 и pm2
npm i -g pm2

# Клонировать репозиторий
git clone <URL_репозитория> /path/to/app
cd /path/to/app

# .env в репозиторий не попадает (см. .gitignore) — положить руками
cp /путь/к/вашему/.env .env

# Первый запуск
npm run deploy

# Чтобы pm2 поднимал процесс после перезагрузки сервера
pm2 startup   # выполнить команду, которую pm2 покажет в выводе
pm2 save
```

**Обновление:**

```bash
ssh user@server "cd /path/to/app && npm run deploy"
```

**Автодеплой на `git push` в `main`** — через `.github/workflows/deploy.yml`
(GitHub Actions по SSH выполняет тот же `scripts/deploy.sh`). Нужно один раз
добавить секреты в Settings → Secrets and variables → Actions репозитория:
`SSH_HOST`, `SSH_USER`, `SSH_KEY` (приватный ключ), `SSH_PORT`, `DEPLOY_PATH`.

**Если на сервере иногда тянут `git pull` вручную** (напр. тестовый сервер
без GitHub Actions, другая ветка) — стоит один раз включить git-хук, который
сам гоняет `npm run deploy` после `git pull`. Без него ручной `git pull` +
`pm2 restart` в обход `npm run build` роняет `benzin-map` с
`Cannot find module .../standalone/server.js` (`.next/standalone/` —
артефакт сборки, не в git, пересоздаётся только через `next build`):

```bash
git config core.hooksPath .githooks
```

БД теперь физически на этом же сервере — см. [`docs/SETUP-DB.md`](docs/SETUP-DB.md)
для установки Postgres+PostGIS, до первого `npm run deploy`.

### Vercel

С self-hosted Postgres на том же сервере, что и приложение, вариант "Vercel +
БД где-то ещё" больше не тот happy path, что был на Supabase: Vercel — serverless,
и без сетевого доступа к Postgres (который сознательно слушает только
localhost/unix-socket, см. `docs/SETUP-DB.md`) `DATABASE_URL` с Vercel просто не
достучится. Деплой на VPS (см. выше) — поддерживаемый способ; для Vercel нужен
Postgres, доступный по сети (свой инстанс с публичным хостом или managed БД).

## Структура проекта

```
app/
  layout.tsx           # корневой layout, SEO-метаданные
  page.tsx             # главная страница
  globals.css          # стили (Tailwind)
  api/
    stations/route.ts  # GET заправки по bbox + агрегированный статус
    reports/route.ts   # GET/POST/PATCH отчёты (валидация, rate-limit, подтверждение)
components/
  AppShell.tsx         # состояние, polling, геолокация, компоновка
  YandexMapView.tsx    # Яндекс.Карта, кластеры, маркеры
  Filters.tsx          # фильтры (топливо, "только есть")
  StationPanel.tsx     # карточка заправки + лента отчётов
  ReportForm.tsx       # форма отправки отчёта
  Legend.tsx           # легенда статусов
  StatusBadge.tsx      # бейдж статуса
lib/
  types.ts             # типы и справочники
  db.ts                # pg Pool (+ детект демо-режима)
  data.ts              # слой доступа к данным (Postgres ↔ демо)
  freshness.ts         # агрегация статуса по свежести отчётов
  demo-store.ts        # in-memory данные для демо-режима
  clientId.ts          # анонимный id клиента (rate-limit)
scripts/
  setup-db.mjs         # применяет db/schema.sql через DATABASE_URL
  migrate-data-from-supabase.mjs  # восстановление NDJSON-бэкапа в новую БД
  seed-supabase.mjs    # импорт lib/regions/*.json в stations
  seed-osm.mjs         # импорт из Overpass OSM
db/
  schema.sql           # текущая схема (таблицы/индексы/функции)
supabase/
  migrations/          # история эволюции схемы на Supabase (архив, не источник истины)
```

## Как считается статус заправки

Берутся отчёты за последние 3 часа. Каждый отчёт получает вес: чем свежее (период полураспада 1 час) и чем больше подтверждений — тем больше вес. Затем проводится взвешенное голосование по статусу, очереди и лимиту. Если второй по весу статус близок к первому — заправка помечается как "противоречивые данные". Если свежих отчётов нет — "нет данных" / "данные устарели". Логика в [`lib/freshness.ts`](lib/freshness.ts).

## Лицензия данных

Данные о расположении заправок — из OpenStreetMap (© участники OpenStreetMap, ODbL).
