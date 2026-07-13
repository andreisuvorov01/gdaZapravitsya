# Shared infrastructure with benzryadom.ru (read this before touching ports/DB/deploy)

This repo started as a fork of **benzin-map / benzryadom.ru** (see `CLAUDE.md`
for the full architecture — data model, status-aggregation algorithm, request
flow, etc. all still apply as-is). This is a **second, independently designed
site** on the intended domain **где-заправиться.рф**, sharing the same
Postgres database and the same self-hosted map-tile server as the original
site, on the same VPS. It does **not** have Telegram/VK/MAX bots — `benzbot/`
was intentionally excluded from this copy and should stay that way.

Both sites live on the same physical VPS as separate processes. Never assume
this repo is the only thing running there — always check what's already
listening before changing ports/services.

## Database — same Postgres instance, same tables, no new schema

- Connects with the exact same `DATABASE_URL` value as the original site:
  role `benzin_app`, database `benzin`, Postgres+PostGIS, listening on
  `localhost:5432` only (not exposed externally).
- `db/schema.sql` (`stations`, `reports`, `report_confirms`, view
  `station_status`, etc.) is **already applied** by the original site —
  do **not** run `npm run setup:db` against the shared DB expecting a clean
  slate, and don't add a second schema/prefix. Both sites read and write the
  **same rows**: a report submitted on one site shows up on the other, since
  there is no per-site column or tenant isolation in the schema.
- `lib/db.ts` opens its own `Pool` (max 10 connections) per Node process —
  this app running alongside the original site's Next.js process against the
  same `DATABASE_URL` is fine at the connection level, nothing to configure.
- If you ever want independent report streams per site instead of a shared
  feed, that requires a schema change (e.g. a `site` column) — not currently
  in place.

## Map tiles — same self-hosted tile server, reused via this site's own nginx

- The tile data (`tiles/world.pmtiles`, `tiles/russia.pmtiles`) and the
  `pmtiles serve` process are **not part of either repo** — they're
  VPS-local, gitignored, and run as their own pm2 app (`benzin-tiles`,
  `pmtiles serve ./tiles --port=8081`) independent of both Next.js apps.
  Never start a second copy of this process — one `benzin-tiles` on
  `127.0.0.1:8081` serves both sites.
- Each site reaches it through **its own** nginx, same pattern, no CORS
  needed because it's same-origin per domain:
  ```nginx
  location /tiles/ {
      proxy_pass http://127.0.0.1:8081/;
  }
  ```
- `.env` on this site should point at the same relative paths as the
  original (`docs/TILES.md` in the original repo has the full nginx/pmtiles
  setup story if you need it):
  ```
  NEXT_PUBLIC_TILES_URL=/tiles/russia/{z}/{x}/{y}.mvt
  NEXT_PUBLIC_WORLD_TILES_URL=/tiles/world/{z}/{x}/{y}.mvt
  NEXT_PUBLIC_TILES_MAXZOOM=14
  ```
  If self-hosted tiles aren't wired up yet (e.g. during local dev), leave
  these empty — the app falls back to the public OpenFreeMap style with no
  further config.

## Ports — this app must NOT run on 3000

- The original site's Next.js process (`benzin-map`) already owns **port
  3000** on the VPS (pm2, `ecosystem.config.js` → `PORT: 3000`). This app
  needs its **own port** — use **3001** — in its own `ecosystem.config.js`:
  ```js
  env: { NODE_ENV: "production", PORT: 3001, HOSTNAME: "0.0.0.0" }
  ```
  and its own pm2 app name (e.g. `gde-zapravitsya`), separate from
  `benzin-map`/`benzin-tiles`. `pm2 start ecosystem.config.js` here must not
  touch or restart the original repo's pm2 apps.
- Local dev: `npm run dev` defaults to `:3000` (see `package.json`). If you
  ever run this repo's dev server **at the same time** as the original
  repo's on the same machine, one of them needs an override, e.g.
  `PORT=3001 npm run dev`, to avoid a port clash — they are unrelated to the
  VPS port assignment above, just a local convenience.
- nginx on the VPS needs its own server block for где-заправиться.рф
  proxying `/` and `/api/` to `127.0.0.1:3001` and `/tiles/` to
  `127.0.0.1:8081` (same target as the original site, different vhost).

## Known blocker before this site can go live on где-заправиться.рф

The domain `где-заправиться.рф` (punycode
`xn----8sbaibghrm1elpm4lxb.xn--p1ai`) is currently registered on the VPS as
an **IDN mirror of the original site** and gets force-redirected to
`benzryadom.ru` in two places there:
- nginx config `benzradar` (original repo root) — `server_name` includes
  this host in both the `:80` and `:443` redirect blocks.
- `middleware.ts` (original repo) — `REDIRECT_TO_CANONICAL_HOSTS` includes
  the same host and 301s it at the Next.js level too.

Both must be edited (remove this host) and the original site redeployed
before DNS/nginx for this site will actually reach this app instead of
bouncing straight back to benzryadom.ru.

## What's deliberately NOT here

- `benzbot/` (Telegram/VK/MAX bots) — excluded on purpose, this site has no
  bots. Don't set `FEED_API_KEY` unless that changes; `/api/feed/*` routes
  stay dormant without it.
- `tiles/`, `backup/` — VPS-local/stale, not part of the app.

## `.env` — shared vs. must-differ from the original site

| Var | Value |
|---|---|
| `DATABASE_URL` | **same** as original site |
| `NEXT_PUBLIC_TILES_URL` / `NEXT_PUBLIC_WORLD_TILES_URL` / `NEXT_PUBLIC_TILES_MAXZOOM` | **same** as original site |
| `TRUST_PROXY` | **same** (`true`, behind nginx) |
| `NEXT_PUBLIC_SITE_URL` | own — `https://где-заправиться.рф` |
| `FEED_API_KEY` | leave unset (no bots) |
| `CRON_SECRET`, `INDEXNOW_KEY` | own, new random values |
| `NEXT_PUBLIC_YANDEX_RTB_BLOCK_*` | unset/disabled until this site has its own ad account |
| `NEXT_PUBLIC_VK_APP_ID`, `VK_SECRET_KEY` | unset (no VK Mini App) |
| `NEXT_PUBLIC_DONATE_URL`, `NEXT_PUBLIC_LEGAL_OPERATOR` | own values if applicable |
