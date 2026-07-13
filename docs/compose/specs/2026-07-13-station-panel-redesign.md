# Spec: Station Panel Redesign — Hero Dashboard

## [S1] Problem

The current `StationPanel` uses a vertical ticket-style layout (header → gauge tiles → actions → reports) that works but feels dense and hierarchical information is unclear. Key metrics (price, queue, freshness) are small tiles that require tapping to expand, hiding important data behind interactions.

## [S2] Solution overview

Replace the ticket-gauge layout with a **Hero Dashboard** approach: a verdict banner with large metric cards prominently displayed at the top, followed by fuel prices, actions, and the existing report feed. The new layout prioritizes at-a-glance readability — the three most important numbers are always visible without tapping.

**What changes:**
- `components/StationPanel.tsx` — full rewrite of the JSX layout
- `app/globals.css` — new CSS classes for hero-metrics, verdict-banner, fuel-price-list

**What stays the same:**
- All data fetching logic (reports, route, confirm)
- Swipe-to-dismiss behavior
- All child components (StatusBadge, BrandBadge, VerdictBadge, QuickReportBar, RouteButtons, StatusTimeline, ShareButton)
- Props interface (`StationPanelProps`)
- Mobile bottom sheet + desktop sidebar behavior

## [S3] Layout structure (top to bottom)

### Header (compact, single-row)
- Left: `BrandBadge` (44px) with status-colored gradient ring
- Center: station name (`font-display`, bold) + address (muted, 1-2 lines)
- Right: ticket serial `#XXXX`, favorite star button, close button
- Same swipe-to-dismiss behavior on mobile

### Verdict banner
- `VerdictBadge` component (existing) — colored left border, title, subtitle
- Below: report count summary — «N отчётов · M подтверждений» with icons

### Three metric cards (hero row)
- Equal-width 3-column grid, `gap: 0.5rem`
- Each card: dark background (`rgba(0,0,0,0.16)`), inset shadow, `rounded-xl`
- **Price card**: large monospace number (e.g. `47.89`) + fuel type label below (e.g. `АИ-95 ₽/л`). Color: `brand-fuel` (#38BDF8). If no price data: «нет данных» in muted.
- **Queue card**: percentage or «Нет» text + level label. Color: `QUEUE_CHANCE_HEX[chance]`. If no data: «нет данных».
- **Freshness card**: score 0–100 + level label (Свежо/Недавно/Устарело). Color: `FRESHNESS_HEX[level]`.

### Quick report bar
- `QuickReportBar` component (existing) — 3 status buttons in a card container

### Fuel prices card
- Section title «Цены на топливо» (uppercase, muted)
- List of fuel rows: name (bold white) → dotted separator → price (monospace bold)
- Fuel types without price: muted name → «нет данных»
- Limit row (if present): «Лимит» → value in liters
- Price comparison: colored dot + label (дёшево/средне/дорого + percentage)
- Price confirm button: inline thumbs-up with count

### Action buttons
- 2-column grid: **Маршрут** (secondary, green accent) + **Поделиться** (secondary, ShareButton)
- Route info row below (distance + ETA) when route is active
- Location prompt when geolocation is off
- Navigator links: small tag chips (Яндекс, 2ГИС, Google, etc.)

### Status timeline
- `StatusTimeline` component (existing) — vertical event log with colored dots

### Report feed
- Section title «Последние отчёты»
- Skeleton loading (3 shimmer cards)
- Fresh reports (< 24h): visible immediately with status, details, comment, photo, confirm button
- Old reports: collapsible «Показать ещё N старых»
- Error banner for confirm failures

### Sticky footer
- Fixed at bottom, dark background (`rgba(12,16,22,0.97)`)
- Thin gradient divider line above
- Primary CTA: «＋ Сообщить ситуацию» — gradient blue button, full width

## [S4] CSS classes to add

```css
/* Hero metric cards — 3-column equal grid */
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
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
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

/* Report count line under verdict */
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

## [S5] Removed CSS classes

These classes from the current ticket-gauge system are no longer needed:
- `.ticket-gauge` / `.ticket-gauge__tile` / `.ticket-gauge__label` / `.ticket-gauge__value` / `.ticket-gauge__sub` / `.ticket-gauge__chevron`
- `.ticket-gauge__detail-grid` / `.ticket-gauge__detail-grid--open` / `.ticket-gauge__detail-inner` / `.ticket-gauge__detail`
- `.ticket-tear` / `.ticket-serial`

The `.gauge-cluster`, `.gauge-dial`, `.gauge-detail-grid` classes in globals.css remain untouched (they may be used elsewhere or for reference).

## [S6] Mobile vs Desktop

- **Mobile (<640px)**: Full-width bottom sheet, max-height `min(85dvh, calc(100dvh - 4.5rem))`. Swipe-to-dismiss. Glass effects disabled (opaque bg). Hero metrics stack naturally in 3-col grid.
- **Desktop (>=640px)**: Embedded in `MapSidebar` (22rem wide). No swipe gesture. Glass effects enabled. Same 3-col grid for metrics (fits in 22rem).

## [S7] Accessibility

- All interactive elements: `min-h-[44px]` touch targets
- Status colors: always paired with text/glyph (✓, !, ✕, ?) for colorblind users
- `aria-expanded` on expandable sections
- `aria-label` on icon buttons
- `prefers-reduced-motion: reduce` respected

## [S8] Out of scope

- Rating/reviews system (use existing VerdictBadge + report count)
- Services/amenities block (no data source yet)
- New backend changes
- Changes to other components (AppShell, StationList, MapDock, etc.)
