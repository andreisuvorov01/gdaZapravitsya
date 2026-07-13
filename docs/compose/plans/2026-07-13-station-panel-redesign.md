# Station Panel Hero Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the StationPanel ticket-gauge layout with a Hero Dashboard that shows large metric cards (price, queue, freshness) prominently at the top.

**Architecture:** Rewrite `StationPanel.tsx` JSX layout (same props, same data logic, same child components). Add new CSS classes to `globals.css` for hero-metrics and report-count. Remove unused ticket-gauge/ticket-tear CSS references.

**Tech Stack:** React, Next.js 15, Tailwind CSS, custom CSS in globals.css

## Global Constraints

- Preserve all existing props interface (`StationPanelProps`)
- Preserve all data fetching logic (reports, route, confirm, price confirm)
- Preserve swipe-to-dismiss behavior on mobile
- Preserve `embedded` prop behavior (no handle/glow when embedded)
- Use existing design tokens: `brand-fuel` (#38BDF8), `fuel-yes/low/no`, `ink-muted`, `surface-raised`
- Mobile: max-height `min(85dvh, calc(100dvh - 4.5rem))`, glass disabled
- Desktop: embedded in 22rem sidebar, glass enabled
- Min touch target: 44px for all interactive elements

---

### Task 1: Add hero-metrics CSS to globals.css

**Covers:** [S3], [S4]

**Files:**
- Modify: `app/globals.css` — add new classes after `.gauge-detail` block (around line 2577)

**Interfaces:**
- Produces: CSS classes `.hero-metrics`, `.hero-metric`, `.hero-metric__value`, `.hero-metric__label`, `.hero-metric__sub`, `.hero-metric__sub--empty`, `.report-count`, `.report-count__icon`

- [ ] **Step 1: Add hero-metrics CSS block**

Add after the `.gauge-detail` block (after line 2577, before `.situation-map`):

```css
/* Hero Dashboard — крупные карточки метрик (цена / очередь / свежесть)
   вверху карточки станции вместо раскрывающихся талонов. */
.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}
.hero-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.16);
  padding: 0.75rem 0.5rem 0.625rem;
  text-align: center;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.35);
}
.hero-metric__value {
  font-family:
    ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 1.25rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: #ffffff;
}
.hero-metric__label {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #5c6a85;
  min-height: 1.2em;
}
.hero-metric__sub {
  font-size: 0.6875rem;
  color: #9aa8b5;
}
.hero-metric__sub--empty {
  color: #5c6a85;
}

/* Строка счётчика отчётов под вердиктом */
.report-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #9aa8b5;
  margin-top: 0.375rem;
}
.report-count__icon {
  display: inline-flex;
  width: 1rem;
  height: 1rem;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 2: Verify CSS is valid**

Run: `npm run build` (from project root)
Expected: No CSS errors in output

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add hero-metrics CSS for station panel redesign"
```

---

### Task 2: Rewrite StationPanel layout to Hero Dashboard

**Covers:** [S3], [S5], [S6], [S7]

**Files:**
- Modify: `components/StationPanel.tsx` — rewrite JSX return block (lines 403–893)

**Interfaces:**
- Consumes: All existing state/hooks (reports, route, confirm, etc.) — no changes
- Consumes: CSS classes from Task 1 (`.hero-metrics`, `.hero-metric`, `.report-count`)
- Produces: Same `StationPanelProps` interface — no changes for consumers

- [ ] **Step 1: Rewrite the JSX return block**

Replace the entire `return (...)` block (lines 403–893) with the new Hero Dashboard layout. The new structure:

```tsx
return (
  <div className="station-sheet flex h-full min-h-0 flex-col">
    {!embedded && (
      <>
        <span className="station-sheet__glow sm:hidden" aria-hidden />
        <span className="station-sheet__handle sm:hidden" aria-hidden />
      </>
    )}

    {/* === HEADER (compact, single-row) === */}
    <header
      className="station-sheet__head shrink-0"
      onPointerDown={onHeadPointerDown}
      onPointerMove={onHeadPointerMove}
      onPointerUp={onHeadPointerUp}
      onPointerCancel={onHeadPointerUp}
    >
      <div className="flex items-start gap-3">
        <span
          className="relative shrink-0 rounded-[0.875rem] p-0.5"
          style={{
            background: `linear-gradient(135deg, ${STATUS_HEX[station.status]}88, transparent)`,
          }}
        >
          <BrandBadge brand={station.brand} name={station.name} size={44} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-balance font-display text-base font-bold leading-snug text-white sm:text-lg">
            {displayName(station)}
          </h2>
          {station.address && (
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted sm:text-sm">
              {station.address}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="ticket-serial" title="Код станции">
            №{ticketSerial}
          </span>
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
              className={`station-sheet__icon-btn ${
                isFavorite ? "station-sheet__icon-btn--active" : ""
              }`}
            >
              <StarIcon className="h-5 w-5" filled={isFavorite} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть карточку заправки"
              className="station-sheet__icon-btn"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>

    <div className="station-sheet__divider mx-4" aria-hidden />

    {/* === SCROLLABLE BODY === */}
    <div
      ref={scrollRef}
      className="station-sheet__scroll thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="station-sheet__content space-y-3">

        {/* Verdict + report count */}
        <div>
          <VerdictBadge verdict={verdict} />
          <div className="report-count">
            <span className="report-count__icon">
              <ClockIcon className="h-3.5 w-3.5" />
            </span>
            <span>{station.reports_count} отчётов · {freshConfirms} подтверждений</span>
          </div>
        </div>

        {/* === HERO METRICS (3 large cards) === */}
        <div className="hero-metrics">
          {/* Price */}
          <div className="hero-metric">
            {mainPrice ? (
              <>
                <span className="hero-metric__value" style={{ color: "#38bdf8" }}>
                  {mainPrice.price.toFixed(2)}
                </span>
                <span className="hero-metric__label">Цена</span>
                <span className="hero-metric__sub">{mainPrice.fuel} ₽/л</span>
              </>
            ) : (
              <>
                <span className="hero-metric__value hero-metric__sub--empty">—</span>
                <span className="hero-metric__label">Цена</span>
                <span className="hero-metric__sub hero-metric__sub--empty">нет данных</span>
              </>
            )}
          </div>

          {/* Queue */}
          <div className="hero-metric">
            {queueEstimate.hasData && queueEstimate.confidence >= 20 ? (
              <>
                <span
                  className="hero-metric__value"
                  style={{ color: QUEUE_CHANCE_HEX[queueEstimate.chance] }}
                >
                  {queueEstimate.probability}%
                </span>
                <span className="hero-metric__label">Очередь</span>
                <span className="hero-metric__sub">
                  {QUEUE_CHANCE_LABEL[queueEstimate.chance]}
                </span>
              </>
            ) : (
              <>
                <span className="hero-metric__value hero-metric__sub--empty">—</span>
                <span className="hero-metric__label">Очередь</span>
                <span className="hero-metric__sub hero-metric__sub--empty">
                  {queueEstimate.hasData ? "мало данных" : "нет данных"}
                </span>
              </>
            )}
          </div>

          {/* Freshness */}
          <div className="hero-metric">
            <span
              className="hero-metric__value"
              style={{ color: FRESHNESS_HEX[conf.level] }}
            >
              {conf.score}
            </span>
            <span className="hero-metric__label">Свежесть</span>
            <span className="hero-metric__sub">{FRESHNESS_LABEL[conf.level]}</span>
          </div>
        </div>

        {/* === QUICK REPORT === */}
        <QuickReportBar
          stationId={station.id}
          onSubmitted={onChanged}
          primaryFuelType={station.fuel_types[0]}
        />

        {/* === FUEL PRICES CARD === */}
        <section className="station-sheet__card !p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted">
            Цены на топливо
          </h3>
          {priceEntries.length > 0 || fuelTypesWithoutPrice.length > 0 || station.limit_liters ? (
            <ul className="flex flex-col gap-1.5">
              {priceEntries.map(([fuel, price]) => (
                <li key={fuel} className="flex items-baseline gap-2">
                  <span className="whitespace-nowrap text-sm font-semibold text-white">
                    {fuel}
                  </span>
                  <span
                    aria-hidden
                    className="min-w-2 flex-1 -translate-y-1 border-b border-dotted border-white/20"
                  />
                  <span className="whitespace-nowrap font-mono text-[0.9375rem] font-bold tabular-nums text-white">
                    {price.toFixed(2)} ₽/л
                  </span>
                </li>
              ))}
              {fuelTypesWithoutPrice.map((f) => (
                <li key={f} className="flex items-baseline gap-2">
                  <span className="whitespace-nowrap text-sm font-medium text-ink-muted">
                    {f}
                  </span>
                  <span
                    aria-hidden
                    className="min-w-2 flex-1 -translate-y-1 border-b border-dotted border-white/15"
                  />
                  <span className="whitespace-nowrap font-mono text-[0.8125rem] font-medium text-ink-muted">
                    нет данных
                  </span>
                </li>
              ))}
              {station.limit_liters ? (
                <li className="flex items-baseline gap-2">
                  <span className="whitespace-nowrap text-sm font-semibold text-white">
                    Лимит
                  </span>
                  <span
                    aria-hidden
                    className="min-w-2 flex-1 -translate-y-1 border-b border-dotted border-white/20"
                  />
                  <span className="whitespace-nowrap font-mono text-[0.9375rem] font-bold tabular-nums text-white">
                    {station.limit_liters} л/чел
                  </span>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">
              Нет данных о цене — сообщите её в отчёте.
            </p>
          )}
          {station.price_updated_at && priceEntries.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-xs text-ink-muted">
                Цена на {timeAgo(station.price_updated_at)}
                {Date.now() - new Date(station.price_updated_at).getTime() >
                  PRICE_FRESH_MS && " (может быть неактуальна)"}
              </p>
              {station.price_report_id && (
                <button
                  type="button"
                  onClick={() => void confirmPriceClick()}
                  disabled={priceConfirming || priceConfirmed}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-1.5 text-xs font-medium text-brand-accent transition-[background-color,transform] hover:bg-white/5 active:scale-[0.96] disabled:opacity-50"
                >
                  <ThumbsUpIcon className="h-3.5 w-3.5" />
                  {priceConfirmed
                    ? "Спасибо!"
                    : `Цена верна (${station.price_confirms})`}
                </button>
              )}
            </div>
          )}
          {priceCompare && priceEntries.length > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: PRICE_LEVEL_HEX[priceCompare.level],
                  boxShadow: `0 0 8px ${PRICE_LEVEL_HEX[priceCompare.level]}88`,
                }}
                aria-hidden
              />
              <span
                className="text-sm font-medium"
                style={{ color: PRICE_LEVEL_HEX[priceCompare.level] }}
              >
                {PRICE_LEVEL_LABEL[priceCompare.level]}
                {priceCompare.diffPct != null &&
                  priceCompare.level !== "average" &&
                  ` (${priceCompare.diffPct > 0 ? "+" : ""}${priceCompare.diffPct}%)`}
              </span>
            </div>
          )}
        </section>

        {/* === ACTION BUTTONS === */}
        <div className="station-actions">
          <div className="station-actions__row">
            <button
              type="button"
              onClick={buildRoute}
              disabled={routeLoading}
              className="station-actions__secondary"
            >
              {routeLoading ? (
                <>
                  <span className="h-2 w-2 animate-pulse-dot rounded-full bg-brand-accent" />
                  Строим…
                </>
              ) : (
                <>
                  <RouteIcon className="h-5 w-5 shrink-0" />
                  {routeInfo ? "Перестроить" : "Маршрут"}
                </>
              )}
            </button>
            <ShareButton
              variant="station"
              url={shareStationUrl(station.id)}
              title={station.name}
              text={`${station.name} — наличие топлива на карте «${SITE_NAME}»`}
              label="Поделиться"
              copiedLabel="Скопировано"
              className="flex-1"
            />
          </div>

          {routeInfo && (
            <p className="flex items-center justify-center gap-2 text-sm tabular-nums text-white">
              <span className="font-semibold text-brand-accent">
                {formatRouteDistance(routeInfo.distanceM)}
              </span>
              <span className="text-ink-muted">·</span>
              <span>≈ {formatEta(routeInfo.durationS)}</span>
            </p>
          )}
          {!userLocation && !routeError && (
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
              <CrosshairIcon className="h-3.5 w-3.5" />
              Включите геолокацию для маршрута
            </p>
          )}
          {routeError && (
            <p className="text-center text-xs text-fuel-no">{routeError}</p>
          )}
        </div>

        <RouteButtons station={station} />

        <StatusTimeline reports={reports} />

        {/* === REPORT FEED === */}
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted">
            Последние отчёты
          </h3>
          {loading ? (
            <ul className="space-y-2" aria-live="polite" aria-label="Загрузка отчётов">
              {[0, 1, 2].map((i) => (
                <li key={i} className="station-sheet__card !p-3 station-skeleton">
                  <div className="station-skeleton__line station-skeleton__line--sm" />
                  <div className="station-skeleton__line station-skeleton__line--md" />
                  <div className="station-skeleton__line station-skeleton__line--lg" />
                </li>
              ))}
            </ul>
          ) : reports.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Пока нет отчётов. Станьте первым!
            </p>
          ) : (
            <ul className="space-y-2">
              {confirmError && (
                <li className="rounded-xl border border-fuel-no/30 bg-fuel-no/10 px-3 py-2 text-sm text-fuel-no">
                  {confirmError}
                </li>
              )}
              {freshReports.map((r) => (
                <li key={r.id} className="station-sheet__card !p-3">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={r.status} />
                    <span className="text-sm text-ink-muted">
                      {timeAgo(r.created_at)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
                    <span>{QUEUE_LABELS[r.queue]}</span>
                    {r.limit_liters && <span>лимит {r.limit_liters} л</span>}
                    {r.fuel_types.length > 0 && (
                      <span>{r.fuel_types.join(", ")}</span>
                    )}
                    {r.canister && <span>только в канистру</span>}
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-base text-white">{r.comment}</p>
                  )}
                  {r.photo_url && (
                    <img
                      src={r.photo_url}
                      alt="Фото с заправки"
                      className="mt-2 max-h-40 rounded-xl object-cover outline outline-1 outline-white/10"
                    />
                  )}
                  {now - new Date(r.created_at).getTime() <= FRESH_WINDOW_MS && (
                    <button
                      type="button"
                      onClick={() => void confirm(r.id)}
                      disabled={confirmingId === r.id}
                      className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand-accent transition-[background-color,transform] hover:bg-white/5 active:scale-[0.96] disabled:opacity-50"
                    >
                      <ThumbsUpIcon className="h-4 w-4" />
                      {confirmingId === r.id
                        ? "Отправка…"
                        : `Подтвердить (${r.confirms})`}
                    </button>
                  )}
                </li>
              ))}

              {oldReports.length > 0 && (
                <li>
                  <button
                    type="button"
                    onClick={() => setShowOldReports((v) => !v)}
                    className="w-full rounded-lg px-2 py-2 text-center text-sm font-medium text-ink-muted transition-colors hover:bg-white/5"
                  >
                    {showOldReports
                      ? "Свернуть старые отчёты"
                      : `Показать ещё ${oldReports.length} старых`}
                  </button>
                </li>
              )}

              {showOldReports &&
                oldReports.map((r) => (
                  <li key={r.id} className="station-sheet__card !p-3 opacity-70">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={r.status} />
                      <span className="text-sm text-ink-muted">
                        {timeAgo(r.created_at)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
                      <span>{QUEUE_LABELS[r.queue]}</span>
                      {r.limit_liters && <span>лимит {r.limit_liters} л</span>}
                      {r.fuel_types.length > 0 && (
                        <span>{r.fuel_types.join(", ")}</span>
                      )}
                      {r.canister && <span>только в канистру</span>}
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-base text-white">{r.comment}</p>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </div>

    {/* === STICKY FOOTER === */}
    <div className="station-sheet__footer shrink-0">
      <div className="station-sheet__divider mb-2.5" aria-hidden />
      <button
        type="button"
        onClick={onReport}
        className="station-actions__primary"
      >
        <PlusIcon className="h-5 w-5" />
        Сообщить ситуацию
      </button>
    </div>
  </div>
);
```

Key changes from current layout:
- Removed: `openTile`/`displayTile` state usage in JSX (state vars remain for now, harmless)
- Removed: ticket-gauge tiles (price/queue/freshness expandable)
- Removed: ticket-tear dividers
- Added: hero-metrics section (3 large metric cards, always visible)
- Added: report-count line under verdict
- Changed: divider uses `.station-sheet__divider` instead of `.ticket-tear`
- Verdict + report count grouped in a single div
- Fuel prices in a dedicated `.station-sheet__card` section
- StatusBadge in header removed (status shown in hero metric implicitly via color)

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors, build succeeds

- [ ] **Step 3: Commit**

```bash
git add components/StationPanel.tsx
git commit -m "feat: rewrite station panel to hero dashboard layout"
```

---

### Task 3: Remove unused ticket-gauge state and clean up

**Covers:** [S5]

**Files:**
- Modify: `components/StationPanel.tsx` — remove unused state variables

**Interfaces:**
- No interface changes

- [ ] **Step 1: Remove unused state declarations**

Remove these lines from StationPanel.tsx (they are no longer used in the JSX):

```tsx
// Remove these state variables (lines ~102-111):
const [openTile, setOpenTile] = useState<"price" | "queue" | "freshness" | null>(null);
const [displayTile, setDisplayTile] = useState<typeof openTile>(null);
useEffect(() => {
  if (openTile) setDisplayTile(openTile);
}, [openTile]);
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add components/StationPanel.tsx
git commit -m "chore: remove unused ticket-gauge state from StationPanel"
```

---

### Task 4: Visual verification

**Covers:** [S3], [S6]

**Files:**
- None (manual testing)

**Interfaces:**
- N/A

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts on localhost:3000

- [ ] **Step 2: Test mobile layout**

Open browser at localhost:3000, resize to mobile width (<640px):
- Click a station marker
- Verify: hero metrics (price/queue/freshness) are visible without scrolling
- Verify: verdict banner shows correctly
- Verify: fuel prices list is readable
- Verify: swipe-to-dismiss works
- Verify: sticky footer "Сообщить ситуацию" is always visible

- [ ] **Step 3: Test desktop layout**

Resize to desktop width (>=640px):
- Click a station marker
- Verify: sidebar shows hero metrics
- Verify: 3-column grid fits in 22rem sidebar
- Verify: all sections are scrollable

- [ ] **Step 4: Test edge cases**

- Station with no price data: shows "—" and "нет данных"
- Station with no queue data: shows "—" and "нет данных"
- Station with no reports: shows "Пока нет отчётов"
- Favorite toggle works
- Route button works
- Report submission works
