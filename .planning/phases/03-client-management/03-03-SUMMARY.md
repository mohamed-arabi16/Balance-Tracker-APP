---
phase: 03-client-management
plan: 03
subsystem: ui
tags: [react, react-query, supabase, react-router, tanstack-query, i18n]

# Dependency graph
requires:
  - phase: 03-client-management/03-01
    provides: useClient/useClients hooks, Client type, clients.* i18n keys
  - phase: 03-client-management/03-02
    provides: ClientsPage, ClientNewPage, ClientEditPage (prerequisite pages)
provides:
  - "ClientDetailPage: /clients/:id view showing name, company, email, phone, notes"
  - "ClientDetailPage: filtered invoices section (linked by client_id, empty state included)"
  - "ClientDetailPage: filtered income+expense transactions section (sorted by date, empty state included)"
  - "App.tsx: all 4 client routes registered under AdvancedRoute guards"
  - "Route order: /clients/new before /clients/:id — prevents 'new' being treated as UUID"
  - "Human-verified: complete CLNT-01/02/03/04 CRUD flow confirmed working in browser"
affects:
  - 04-transaction-linking (client_id field in incomes/expenses now queryable per client)
  - 05-invoices (invoice rows already appear in ClientDetailPage when linked)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline useQuery per entity on detail pages — three focused queries (invoices, incomes, expenses) each filtered by client_id"
    - "Route declaration order matters — /clients/new must precede /clients/:id in React Router v6 Routes block"
    - "AdvancedRoute wrapping for all client routes — Simple mode users redirected to dashboard transparently"

key-files:
  created:
    - src/pages/advanced/ClientDetailPage.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "Three separate useQuery calls (invoices, incomes, expenses) on ClientDetailPage — keeps each query independently cacheable and re-fetched; combined query would require a view or RPC not yet available"
  - "Route order: /clients/new declared before /clients/:id — React Router v6 top-to-bottom matching means :id would capture 'new' as a UUID param if declared first, causing Supabase UUID format errors"
  - "invoices.total selected as read-only — generated column is fine for SELECT; excluded from Insert/Update types only"

patterns-established:
  - "Detail page pattern: useClient(id) for entity + N inline useQuery calls for related data, all filtered by id and user_id"
  - "All advanced-only routes wrapped in <AdvancedRoute> — single consistent guard for mode-switching redirect behavior"

requirements-completed: [CLNT-04]

# Metrics
duration: ~5min (human-gated: Tasks 1+2 automated, Task 3 human verification)
completed: 2026-02-24
---

# Phase 3 Plan 03: ClientDetailPage and Route Wiring Summary

**ClientDetailPage at /clients/:id showing client info with filtered invoices and linked transactions (income+expenses), plus all 4 client routes registered in App.tsx under AdvancedRoute guards — complete Phase 3 client management flow verified in browser**

## Performance

- **Duration:** ~5 min automated + human verification
- **Started:** 2026-02-24 (continuation from Phase 3 Plans 01-02)
- **Completed:** 2026-02-24
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Built `src/pages/advanced/ClientDetailPage.tsx` (172 lines) with client info card, filtered invoices section, and combined income+expense transactions section — all with empty states
- Registered all 4 client routes in App.tsx (`/clients`, `/clients/new`, `/clients/:id/edit`, `/clients/:id`) under AdvancedRoute guards with correct declaration order
- Human-verified complete end-to-end Phase 3 flow: CLNT-01 create, CLNT-02 edit, CLNT-03 list+search+delete, CLNT-04 detail all confirmed working in browser

## Task Commits

Each task was committed atomically:

1. **Task 1: Build ClientDetailPage** - `d7ee38d` (feat)
2. **Task 2: Register all 4 client routes in App.tsx** - `1000645` (feat)
3. **Task 3: Human verification approved** - `02abfc5` (docs)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/pages/advanced/ClientDetailPage.tsx` — Client detail view at /clients/:id; fetches client via useClient hook; three inline useQuery calls (invoices filtered by client_id, incomes filtered by client_id, expenses filtered by client_id); combined and date-sorted transactions list; empty states for both sections; Edit button linking to /clients/:id/edit
- `src/App.tsx` — Added 4 lazy imports (ClientsPage, ClientNewPage, ClientEditPage, ClientDetailPage) and 4 Route entries inside Routes block, all wrapped in AdvancedRoute; /clients/new declared before /clients/:id to prevent route collision

## Decisions Made

- Three separate useQuery calls on ClientDetailPage instead of a combined query — keeps caches independent and avoids needing a DB view or RPC that is not yet available
- Route order in App.tsx: /clients/new MUST precede /clients/:id — React Router v6 matches top-to-bottom; "new" would be captured as a UUID param by `:id` if declared first
- Selected `invoices.total` as a read-only field — it is a generated/computed column, valid for SELECT but excluded from Insert/Update types by Supabase type generation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 (Client Management) is now complete: all 4 CLNT requirements (CLNT-01 through CLNT-04) are implemented and browser-verified
- Phase 4 (Transaction Linking) can begin: ClientSelector component can now use useClients hook; client_id FK columns are confirmed present on incomes and expenses tables
- Phase 5 (Invoices): ClientDetailPage already renders invoice rows — linking invoices to clients is ready when invoice creation is built

## Self-Check

- FOUND: src/pages/advanced/ClientDetailPage.tsx
- FOUND: src/App.tsx (4 client routes added)
- FOUND commit: d7ee38d (feat(03-03): build ClientDetailPage)
- FOUND commit: 1000645 (feat(03-03): register all 4 client routes in App.tsx)
- FOUND commit: 02abfc5 (docs(03-03): human verification approved)

## Self-Check: PASSED

---
*Phase: 03-client-management*
*Completed: 2026-02-24*
