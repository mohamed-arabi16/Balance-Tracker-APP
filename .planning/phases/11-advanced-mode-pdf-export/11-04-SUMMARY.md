---
phase: 11-advanced-mode-pdf-export
plan: 04
subsystem: ui
tags: [expo-print, expo-sharing, pdf-export, invoice-detail, status-lifecycle, advanced-dashboard, currency-conversion]

# Dependency graph
requires:
  - phase: 11-advanced-mode-pdf-export
    plan: 02
    provides: useClients hook, ClientsListScreen pattern
  - phase: 11-advanced-mode-pdf-export
    plan: 03
    provides: useInvoice/useInvoices/useUpdateInvoiceStatus hooks, InvoicesListScreen, InvoiceEditScreen
  - phase: 11-advanced-mode-pdf-export
    plan: 01
    provides: ModeProvider, useMode (isAdvanced), expo-print/expo-sharing installed
provides:
  - pdfTemplate.ts — generateInvoiceHtml(invoice, clientName) pure function for expo-print HTML generation
  - InvoiceDetailScreen — line items table, inline status toggle (draft→sent, sent/overdue→paid), Export PDF button via expo-print+expo-sharing
  - RevenuePerClientWidget — grouped paid invoice revenue per client with convertCurrency() aggregation
  - OutstandingInvoicesWidget — sent invoices sorted by due_date, total outstanding, getDisplayStatus() badge
affects:
  - 11-05-PLAN.md (Phase 11 complete — all ADV requirements done)
  - Phase 12 (App Store submission — PDF export is EXPRT-02 requirement)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "const inv = invoice narrowing pattern — assign hook return to const after guard return to satisfy TypeScript closure narrowing in function-scoped handlers"
    - "RevenuePerClientWidget/OutstandingInvoicesWidget as local components passed t/convertCurrency/clientMap as props — avoids re-declaring hooks inside components, data flows from DashboardScreen"
    - "Always-call hooks rule for advanced widgets — useInvoices() and useClients() called unconditionally in DashboardScreen, widgets conditionally rendered via {isAdvanced && <Widget/>}"
    - "nextStatusMap: Record<string, 'sent' | 'paid' | null> — overdue maps to 'paid' (DB write), never 'overdue' (display-only)"
    - "convertCurrency() before summing — cross-currency aggregation requires per-invoice conversion before accumulation to avoid mixed-currency errors"

key-files:
  created:
    - BalanceTracker/src/lib/pdfTemplate.ts
    - BalanceTracker/app/(tabs)/invoices/[id]/index.tsx
  modified:
    - BalanceTracker/app/(tabs)/index.tsx

key-decisions:
  - "const inv = invoice after guard — TypeScript cannot narrow invoice across function closure boundaries (handleStatusToggle, handleExportPdf); assigning to const after early-return guard provides the required narrowing"
  - "RevenuePerClientWidget uses invoice.status === 'paid' filter (not getDisplayStatus) — 'overdue' is a display derivation of 'sent'; paid revenue must only include DB-confirmed paid status"
  - "OutstandingInvoicesWidget uses invoice.status === 'sent' then getDisplayStatus per row — fetches the right set (only sent invoices are outstanding) while displaying correct overdue badge per item"
  - "Always call hooks (useInvoices, useClients) in DashboardScreen unconditionally — React rules of hooks; widgets conditionally rendered but data pre-fetched regardless"

patterns-established:
  - "pdfTemplate.ts: pure function returning HTML string — no React, no imports from expo, easy to unit test independently"
  - "Status lifecycle map: nextStatusMap drives both the button label and the DB write; overdue→paid transition is always DB-safe"
  - "Advanced dashboard widgets as local function components with explicit prop types — clear data flow, no implicit hook coupling"

requirements-completed: [ADV-04, ADV-06, EXPRT-02]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 11 Plan 04: Invoice Detail Screen, PDF Export, and Advanced Dashboard Summary

**Invoice detail with inline status lifecycle (draft→sent→paid), PDF export via expo-print/expo-sharing, and Advanced Dashboard revenue-per-client and outstanding-invoices widgets with cross-currency aggregation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T11:15:45Z
- **Completed:** 2026-02-26T11:20:50Z
- **Tasks:** 2 (+ 1 human-verify checkpoint pending)
- **Files modified:** 3

## Accomplishments
- `pdfTemplate.ts`: `generateInvoiceHtml(invoice, clientName)` generates a complete standalone HTML doc with inline styles, system fonts, computed subtotal/tax/total (never reads `invoice.total` generated column), status badge, line items table, and notes section — English-only per i18n design decision
- `InvoiceDetailScreen`: 6-section layout (header, meta, line items table, totals, notes, actions); inline status toggle driven by `nextStatusMap` (overdue→paid DB-safe); Export PDF button wires `Print.printToFileAsync` → `Sharing.shareAsync`; Edit button shown only for Draft invoices
- `RevenuePerClientWidget`: filters paid invoices, groups by client_id, applies `convertCurrency()` before summing to avoid mixed-currency errors, renders sorted client revenue list
- `OutstandingInvoicesWidget`: filters `status === 'sent'` invoices, sorts by due_date ascending, computes total outstanding with currency conversion, renders each invoice with `getDisplayStatus()` badge (overdue detection)
- Zero TypeScript errors on all 3 files (npx tsc --noEmit)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build pdfTemplate.ts and InvoiceDetailScreen with status toggle and PDF export** - `4ac46c4` (feat)
2. **Task 2: Build Advanced Dashboard widgets in Dashboard tab** - `5d934af` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `BalanceTracker/src/lib/pdfTemplate.ts` — `generateInvoiceHtml()`: pure function returning HTML string for expo-print; computed totals from items; no local file:// URLs; English-only; 100+ lines
- `BalanceTracker/app/(tabs)/invoices/[id]/index.tsx` — InvoiceDetailScreen: line items table, status toggle, Export PDF, Edit (draft only); 400+ lines
- `BalanceTracker/app/(tabs)/index.tsx` — DashboardScreen updated: RevenuePerClientWidget + OutstandingInvoicesWidget added behind `isAdvanced` guard; always-called hooks; 330+ lines

## Decisions Made
- TypeScript cannot narrow query hook return types across function closure boundaries. After the `if (!invoice)` early-return guard, reassigning `const inv = invoice` provides the required narrowing for `handleStatusToggle` and `handleExportPdf` closures. This is the idiomatic TS narrowing pattern for this scenario.
- `RevenuePerClientWidget` uses raw `invoice.status === 'paid'` filter rather than `getDisplayStatus()` — revenue should only count invoices the DB confirms as paid; `getDisplayStatus` is for display purposes only.
- `OutstandingInvoicesWidget` uses `invoice.status === 'sent'` for filtering (correct DB set) then `getDisplayStatus()` per row for the overdue badge — captures the right invoices while showing accurate user-facing status.
- `useInvoices()` and `useClients()` always called in `DashboardScreen` (rules of hooks) — widgets conditionally rendered but data pre-fetched regardless; no hook call inside conditionals.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript closure narrowing for invoice query hook**
- **Found during:** Task 1 TypeScript check
- **Issue:** TypeScript reported `'invoice' is possibly 'undefined'` inside `handleStatusToggle` and `handleExportPdf` closures even after an `if (!invoice)` early-return guard above. TypeScript's narrowing does not flow into function-scoped closures declared after the guard.
- **Fix:** Added `const inv = invoice` immediately after the guard. All usages in closures and JSX template switched to `inv`. This is the standard TS narrowing pattern for this scenario.
- **Files modified:** `BalanceTracker/app/(tabs)/invoices/[id]/index.tsx`
- **Verification:** `npx tsc --noEmit` — 0 errors after fix
- **Committed in:** `4ac46c4` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — TypeScript narrowing bug)
**Impact on plan:** Essential for type safety. No scope creep — single variable aliasing change.

## Issues Encountered

None beyond the auto-fixed TypeScript narrowing issue above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 11 implementation complete: ADV-02 (clients), ADV-03 (invoice CRUD), ADV-04 (status lifecycle), ADV-05 (client picker on income/expense), ADV-06 (advanced dashboard), EXPRT-02 (PDF export) all delivered
- Human verification checkpoint (Task 3) pending — requires running `npx expo start`, logging in, and testing all 12 verification steps end-to-end on device/simulator
- Phase 12 (App Store Submission) unblocked after checkpoint passes

## Self-Check: PASSED

- FOUND: BalanceTracker/src/lib/pdfTemplate.ts
- FOUND: BalanceTracker/app/(tabs)/invoices/[id]/index.tsx
- FOUND: BalanceTracker/app/(tabs)/index.tsx
- FOUND: commit 4ac46c4 (Task 1)
- FOUND: commit 5d934af (Task 2)
- TypeScript: 0 errors (npx tsc --noEmit)

---
*Phase: 11-advanced-mode-pdf-export*
*Completed: 2026-02-26*
