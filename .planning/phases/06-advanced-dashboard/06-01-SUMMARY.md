---
phase: 06-advanced-dashboard
plan: "01"
subsystem: ui
tags: [react, i18n, react-i18next, tanstack-query, supabase, currency-conversion]

# Dependency graph
requires:
  - phase: 05-invoices-and-pdf-export
    provides: useInvoices hook, getDisplayStatus function, InvoiceStatusBadge component, invoice data model
  - phase: 03-client-management
    provides: useClients hook, Client type
  - phase: 02-mode-infrastructure
    provides: AdvancedRoute guard, CurrencyContext/useCurrency, AdvancedDashboard stub at /advanced
provides:
  - AdvancedDashboard page with Revenue per Client widget (DASH-01)
  - AdvancedDashboard page with Outstanding Invoices widget (DASH-02)
  - advancedDashboard.* i18n keys in EN and AR
  - invoices.form.clientPlaceholder i18n key (fixes STATE.md blocker)
affects: [07-*]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Filter outstanding invoices on DB status='sent', apply getDisplayStatus() client-side for display — never write 'overdue' to DB"
    - "Always convertCurrency() per invoice before summing — invoices can be mixed USD/TRY while display currency may differ"
    - "Skeleton component declared outside default export to avoid re-creation on each render"
    - "clientMap pattern: Object.fromEntries(clients.map(c => [c.id, c])) for O(1) client lookup by ID"

key-files:
  created: []
  modified:
    - src/pages/advanced/AdvancedDashboard.tsx
    - src/i18n/index.ts

key-decisions:
  - "Outstanding invoices panel filters on inv.status === 'sent' (DB value), not displayStatus — avoids false negatives if overdue logic changes"
  - "Revenue grouped by client_id then joined to clientMap — no separate query needed since clients already loaded"
  - "sortedRevenue sorted descending by converted total — highest-revenue client appears first"
  - "outstandingInvoices sorted ascending by due_date (nulls last) — most urgent invoice appears first"

patterns-established:
  - "DASH-01 revenue pattern: filter paid, reduce by client_id with convertCurrency, sort descending"
  - "DASH-02 outstanding pattern: filter DB sent, map with getDisplayStatus, sort by due_date ascending"

requirements-completed: [DASH-01, DASH-02]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 6 Plan 01: Advanced Dashboard — Revenue + Outstanding Widgets Summary

**Advanced Dashboard with Revenue per Client (DASH-01) and Outstanding Invoices (DASH-02) using currency-safe aggregation, DB-status filtering, and full EN/AR i18n**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T02:15:23Z
- **Completed:** 2026-02-25T02:17:06Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced AdvancedDashboard stub (12 lines, hardcoded English) with 162-line full implementation
- DASH-01: Revenue per Client — groups paid invoices by client_id, converts each via convertCurrency() before summing, sorted descending
- DASH-02: Outstanding Invoices — filters on DB status='sent', applies getDisplayStatus() for overdue label display, sorted by due_date ascending
- Added all 9 advancedDashboard.* i18n keys plus invoices.form.clientPlaceholder in both EN and AR blocks (fixes STATE.md blocker)
- Loading skeleton, empty states for both widgets, all strings via t() — zero hardcoded text
- Dashboard.tsx (Simple mode) confirmed untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Add advancedDashboard i18n keys** - `6de378a` (feat)
2. **Task 2: Replace AdvancedDashboard stub** - `d96fd3b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/pages/advanced/AdvancedDashboard.tsx` - Full Advanced Dashboard with Revenue per Client + Outstanding Invoices widgets (162 lines, was 12-line stub)
- `src/i18n/index.ts` - Added advancedDashboard.* and invoices.form.clientPlaceholder keys to EN and AR blocks

## Decisions Made
- Outstanding invoices panel filters on `inv.status === 'sent'` (DB value) — using getDisplayStatus() only for display label, not for filtering
- Revenue grouped by client_id then joined to clientMap (Object.fromEntries) for O(1) lookup — avoids extra query
- sortedRevenue descending by converted total — highest-value client leads the list
- outstandingInvoices sorted ascending by due_date (nulls last) — most urgent invoice at top
- Skeleton component declared before default export (not inside) — prevents re-creation on each render

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DASH-01 and DASH-02 requirements satisfied — Advanced Dashboard delivers real financial overview
- v1.1 Phase 6 Plan 01 complete
- Ready for next plan in Phase 6 (if any remain) or v1.1 milestone

---
*Phase: 06-advanced-dashboard*
*Completed: 2026-02-25*
