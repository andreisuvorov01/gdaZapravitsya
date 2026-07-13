# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project overview

**benzin-map** (benzryadom.ru) — a crowdsourced map of fuel stations in Russia: fuel
availability, per-person limits, queue length, updated in real time by anonymous
user reports. Next.js 15 (App Router) + TypeScript + Tailwind, backed by a
self-hosted Postgres + PostGIS on the same VPS as the app (accessed directly via
`pg`, no REST/ORM layer in between). MapLibre GL renders the map (OpenFreeMap/
Protomaps/self-hosted PMTiles vector tiles).

> Migrated off Supabase on 2026-07-08 after their PostgREST/Kong layer hung
> project-wide (see incident notes in git history around that date) right as the
> Supabase billing plan lapsed. The app previously used Supabase for Postgres +
> Realtime + Storage; Realtime and Storage were dropped in the migration (Storage/
> photo-upload was already dead code; Realtime's job is now done by a faster
> client-side poll). `supabase/migrations/*.sql` and `migrate.mjs` remain in the repo
> as historical record of the schema's evolution on Supabase — `db/schema.sql` is
> the current source of truth.

If `DATABASE_URL` is missing or looks like a placeholder, `lib/db.ts` sets
`isDbConfigured = false` and the whole app falls back to a **demo mode**: data
comes from bundled `lib/regions/*.json` + an in-memory store (`lib/demo-store.ts`),
writes are not persisted, and a "Демо-режим" banner is shown. This is the default
state right after `npm install` with no `.env` — don't be surprised if DB queries
in `lib/data.ts` appear dead-code-like; check `isDbConfigured` branches first.

## Commands

```bash
npm run dev             # start dev server on :3000
npm run dev:clean       # kill stray dev ports + clear .next cache, then dev
npm run build           # next build (output: "standalone")
npm run start           # run production build
npm run lint            # next lint

npm run setup:db        # apply db/schema.sql via DATABASE_URL (idempotent)
npm run seed:db         # import lib/regions/krasnodar.json into `stations`
npm run seed            # import stations from OSM Overpass API (SEED_BBOX env, default Moscow)
npm run sync:gdebenz    # sync fuel-status data from gdebenz.ru (full-RF sweep by default; pass a bbox arg to limit: `npm run sync:gdebenz -- "55.6,37.4,55.85,37.75"`)

npm run icons           # regenerate favicon/PWA icons from public/brand/mark.png
npm run social:export   # screenshot brand-export route via Playwright for social assets
```

There is no automated test suite in this repo (no `test` script, no test runner
configured) — Playwright is only used for screenshot generation, not testing.

Local dev works with zero configuration (demo mode). For the real backend, copy
`.env.example` → `.env`, point `DATABASE_URL` at a Postgres+PostGIS instance and run
`npm run setup:db` — see `docs/SETUP-DB.md` and `README.md` for the full walkthrough,
and `SYNC.md` for the gdebenz.ru sync/cron setup.

## Architecture

### Request flow (the one thing to understand first)

```
Browser (components/AppShell.tsx)
  → GET /api/stations?bbox=... (also ?ids= for favorites)
    → lib/data.ts::getStationsWithStatus()
       - DB mode: SELECT stations in bbox + reports from last 24h (single
         `station_id = any($1::uuid[])` query — no PostgREST URL-length limit to
         chunk around anymore, unlike the old Supabase-era code)
       - Demo mode: lib/demo-store.ts + on-demand Overpass fetch (lib/osm.ts)
    → lib/freshness.ts::aggregateStation() turns raw reports into a StationStatus
       (weighted vote per station: status, queue, fuel_types, limit_liters, confidence, conflicting)
  ← StationStatus[] rendered as markers

User submits a report (components/ReportForm.tsx / QuickReportBar.tsx)
  → POST /api/reports (header x-client-id from lib/clientId.ts, honeypot `website` field)
  → PATCH /api/reports to confirm someone else's report (dedup via report_confirms table)

No realtime push anymore (Supabase Realtime was dropped in the 2026-07-08 migration) —
AppShell just polls the current bbox every 20s (was 180s when it was a fallback
behind Realtime; see components/AppShell.tsx).
```

`lib/types.ts` is the single source of truth for domain types (`Station`, `Report`,
`StationStatus`, `FuelType`, `FuelStatus`, `QueueLevel`, `BBox`, `CreateReportPayload`).
The `types/` directory at repo root is empty — don't look there.

### Status aggregation algorithm (`lib/freshness.ts`)

This is the core business logic and the thing most feature work touches indirectly:

- Only reports from the last **3 hours** (`FRESH_WINDOW_MS`) are considered fresh.
- Each report's weight = `decay * (1 + 0.5 * confirms)`, where
  `decay = 0.5 ^ (ageMs / 1h)` (1h half-life).
- The status/queue/fuel_types with the highest weighted sum wins a weighted vote.
- If the 2nd-place status has ≥75% of the winner's weight, the station is marked
  `conflicting: true`.
- `confidence()` scores freshness (65%) + report volume (35%) into `fresh`/`recent`/
  `old`/`none` levels used for UI badges.
- `lib/queue.ts` runs a parallel but separate estimate for queue length with a
  shorter window (2h) and faster decay (25min half-life) — queues change faster
  than fuel availability.

The SQL view `station_status` in `db/schema.sql` implements a cruder version of the
same idea (simple mode + recency tiebreak) — it's a fallback, not what the app
actually uses; the real logic lives in `lib/freshness.ts` on the Node side.

### Data model (self-hosted Postgres, `db/schema.sql`)

- `stations`: id, name, brand, lat/lng (+ auto-populated `geo geography(point)` via
  trigger), address, `source` (`'osm'` | `'user'`), `osm_id` (unique, used for
  upsert-based imports), plus sync-source bookkeeping columns (`gdebenz_id`,
  `gdebenz_comments_synced_at`, `benzinest_id`, `last_report_at`).
- `reports`: station_id → stations (cascade), status, fuel_types (text[]), queue,
  limit_liters, comment, photo_url, confirms, client_id, prices (jsonb), created_at.
- `report_confirms`: PK `(report_id, client_id)` — prevents a client confirming the
  same report twice.
- No RLS, no per-role grants: there's no REST layer or public anon key anymore —
  the app and scripts connect with one trusted `DATABASE_URL` role, and all writes
  already go exclusively through the Next.js API routes (`lib/data.ts`). Never
  expose `DATABASE_URL` to the client (it's server-only, not `NEXT_PUBLIC_`).
  `supabase/migrations/0002_security.sql`'s RLS policies are Supabase-era history,
  not part of the current schema.

### API routes (`app/api/**/route.ts`, no middleware.ts — auth is per-route)

- `stations` (GET/POST) — fetch by bbox or ids; create a user-submitted station.
- `reports` (GET/POST/PATCH) — fetch a station's report feed; submit a report;
  confirm an existing report. Rate-limited and honeypot-protected via
  `lib/apiSecurity.ts`.
- `geocode` (GET) — thin wrapper over Nominatim (`lib/nominatimServer.ts`).
- `feed/stations` (GET) — private JSON feed for bots (Telegram/VK), guarded by
  `FEED_API_KEY` with a timing-safe comparison.
- `cron/sync-gdebenz` (GET/POST) — spawns `scripts/sync-gdebenz.mjs` as a child
  process, guarded by `CRON_SECRET`. Only hit this with a narrow `?bbox=` — a
  full-Russia sweep takes minutes and will hit serverless/proxy timeouts; for the
  full sweep run the script directly via system cron (see `SYNC.md`).

### Frontend composition

`components/AppShell.tsx` (~900 lines) owns essentially all client state — map
viewport, filters, favorites, geolocation, route planning, bbox polling —
and composes the rest of the UI (`MapLibreMapView`, `MapDock`, `StationPanel`,
`ReportForm`, `MobileNearbySheet`, etc.). If you need to add UI state that several
components share, it almost certainly belongs in `AppShell`, not a new context.

`app/(content)/*` is a separate route group (own layout with `PublicHeader`/`Footer`)
for SEO/legal pages (cities, brand/network pages, FAQ, legal docs) — it is isolated
from the map SPA at `/`, which uses the root layout directly.

### External data sources feeding the database

- **OpenStreetMap Overpass API** — one-off imports via `scripts/fetch-region.mjs`
  (→ `lib/regions/*.json`) or `scripts/seed-osm.mjs` (→ Postgres directly).
- **gdebenz.ru** — a community-run public API; `scripts/sync-gdebenz.mjs` tiles all
  of populated Russia (six macro-regions, 1.2°×1.2° tiles, splits recursively on
  `bbox_too_large`, 300ms throttle between requests) and upserts stations +
  replaces `client_id='gdebenz'` reports on every run. Intended to run every 3h
  from a cron job (see `SYNC.md` for Beget/Windows Task Scheduler setup) — running
  it from a laptop/dev machine means data goes stale when the machine is off.
- **OSRM** (`lib/route.ts`) for routing, **Nominatim** for geocoding.

Be respectful of gdebenz.ru's rate limits (`THROTTLE_MS`) when touching the sync
script — its servers run on donations.
