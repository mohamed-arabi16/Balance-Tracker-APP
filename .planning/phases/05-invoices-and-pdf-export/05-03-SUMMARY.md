---
phase: 05-invoices-and-pdf-export
plan: 03
subsystem: ui
tags: [react, react-router, tanstack-query, typescript, invoices]

# Dependency graph
requires:
  - phase: 05-02
    provides: useInvoices hook, getDisplayStatus utility, InvoiceWithItems type
  - phase: 03-02
    provides: ClientsPage pattern for card list layout with filter/empty state
provides:
  - Invoice list page (InvoicesPage) with 4 filter tabs and invoice card list
  - Four invoice routes registered in App.tsx under AdvancedRoute
  - InvoiceStatusBadge stub component (full impl in Plan 05-05)
  - Stub pages for InvoiceNewPage, InvoiceEditPage, InvoiceDetailPage
affects:
  - 05-04 (InvoiceNewPage full implementation)
  - 05-05 (InvoiceDetailPage + InvoiceStatusBadge full implementation)
  - 05-06 (InvoiceEditPage full implementation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Filter tabs pattern using Tabs/TabsList/TabsTrigger from shadcn/ui
    - Client-side overdue derivation via getDisplayStatus (never written to DB)
    - O(1) client map lookup via Object.fromEntries for card enrichment
    - Stub pages pattern: minimal stubs allow App.tsx to compile before full implementation

key-files:
  created:
    - src/pages/advanced/InvoicesPage.tsx
    - src/components/invoice/InvoiceStatusBadge.tsx
    - src/pages/advanced/InvoiceNewPage.tsx
    - src/pages/advanced/InvoiceEditPage.tsx
    - src/pages/advanced/InvoiceDetailPage.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "InvoicesPage uses client-side overdue derivation via getDisplayStatus — 'overdue' is never stored in DB"
  - "Route order: /invoices/new declared before /invoices/:id to prevent React Router v6 matching 'new' as UUID param"
  - "Stub pages created for InvoiceNewPage, InvoiceEditPage, InvoiceDetailPage — allows App.tsx to compile before full implementation in Plans 05-04 through 05-06"
  - "InvoiceStatusBadge created as stub with Badge variant=outline — full color-coded implementation deferred to Plan 05-05"

patterns-established:
  - "Filter tab pattern: Tabs component with FilterTab union type, filter function using getDisplayStatus"
  - "Stub page pattern: minimal export default with coming-soon div, enables route registration without blocking compilation"

requirements-completed: [INV-01, INV-03]

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 5 Plan 03: Invoice List Page and Route Registration Summary

**InvoicesPage with 4 filter tabs (All/Draft/Sent & Overdue/Paid) using client-side overdue derivation, plus all 4 invoice routes registered in App.tsx**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T22:49:44Z
- **Completed:** 2026-02-24T22:52:50Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- InvoicesPage renders filter tabs using shadcn/ui Tabs, filters via `getDisplayStatus` (never writes 'overdue' to DB)
- Each invoice card shows invoice number, status badge, client name (via O(1) map lookup), issue date, and total
- All 4 invoice routes registered under AdvancedRoute in App.tsx with correct ordering (/invoices/new before /invoices/:id)
- Stub pages created for InvoiceNewPage, InvoiceEditPage, InvoiceDetailPage to allow App.tsx to compile now
- InvoiceStatusBadge stub created at `src/components/invoice/` (full color-coded implementation in Plan 05-05)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create InvoicesPage with filter tabs and invoice card list** - `7f2a9cc` (feat)
2. **Task 2: Register four invoice routes in App.tsx** - `333b7b3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/pages/advanced/InvoicesPage.tsx` - Invoice list page with 4 filter tabs, card list, empty state, loading skeleton
- `src/components/invoice/InvoiceStatusBadge.tsx` - Stub badge component (full implementation in Plan 05-05)
- `src/pages/advanced/InvoiceNewPage.tsx` - Stub page (full implementation in Plan 05-04)
- `src/pages/advanced/InvoiceEditPage.tsx` - Stub page (full implementation in Plan 05-06)
- `src/pages/advanced/InvoiceDetailPage.tsx` - Stub page (full implementation in Plan 05-05)
- `src/App.tsx` - Added 4 lazy imports and 4 invoice routes under AdvancedRoute

## Decisions Made

- Route order: `/invoices/new` declared before `/invoices/:id` — React Router v6 matches top-to-bottom; 'new' would be treated as UUID param if order reversed
- Stub pages created for all 3 unimplemented invoice pages — allows the App.tsx route registration to compile cleanly before Plans 05-04 through 05-06 ship
- InvoiceStatusBadge uses `variant="outline"` stub — color coding (green for paid, yellow for draft, red for overdue) deferred to Plan 05-05 where full badge semantics are defined

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 invoice routes active and navigable from the sidebar (wired in Phase 2)
- InvoicesPage fully functional for read-only browsing as soon as invoices exist in DB
- Plan 05-04 (InvoiceNewPage) can now replace the stub with the full invoice creation form
- Plan 05-05 (InvoiceDetailPage + InvoiceStatusBadge) replaces both stubs with full implementations

---
*Phase: 05-invoices-and-pdf-export*
*Completed: 2026-02-24*
