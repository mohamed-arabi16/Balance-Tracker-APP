---
phase: 01-database-and-type-foundation
plan: 03
subsystem: database
tags: [typescript, supabase, types, schema]

# Dependency graph
requires:
  - phase: 01-02
    provides: Advanced Mode schema (clients, invoices, invoice_items tables, app_mode column, client_id FKs) applied to live Supabase
provides:
  - Full TypeScript type contract for Advanced Mode schema in src/integrations/supabase/types.ts
  - clients, invoices, invoice_items table types (Row/Insert/Update + Relationships)
  - invoice_status enum in Enums section and Constants object
  - client_id fields in incomes and expenses tables
  - app_mode field in user_settings table
  - Updated DEFAULT_USER_SETTINGS satisfying new user_settings.Row type constraint
affects:
  - Phase 2 (Client Management) - ClientSelector, useClients hook depend on clients types
  - Phase 3 (Transaction Linking) - useIncomes/useExpenses hooks depend on client_id types
  - Phase 5 (Invoices) - Invoice CRUD hooks depend on invoices/invoice_items types

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generated columns (tax_amount, total, amount) appear in Row only — never in Insert or Update types"
    - "Relationships array populated with foreignKeyName, columns, isOneToOne, referencedRelation, referencedColumns"
    - "satisfies Omit<UserSettingsRow, 'user_id'> constraint enforces DEFAULT_USER_SETTINGS completeness at compile time"

key-files:
  created: []
  modified:
    - src/integrations/supabase/types.ts
    - src/hooks/useUserSettings.ts

key-decisions:
  - "Generated columns (tax_amount, total, amount) excluded from Insert/Update types — Supabase computes them, inserting them would cause errors"
  - "app_mode defaults to 'simple' in DEFAULT_USER_SETTINGS — ensures new users start in Simple mode before any Advanced features are enabled"
  - "invoice_status enum added to both Enums section and Constants object — Constants enables runtime value iteration (e.g., status dropdowns)"

patterns-established:
  - "Pattern 1: Generated/computed DB columns are Row-only — Insert and Update types omit them to prevent client-side write attempts"
  - "Pattern 2: satisfies constraint on DEFAULT_USER_SETTINGS — TypeScript enforces that the constant satisfies the full Row type minus user_id, preventing missing fields at compile time"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-02-23
---

# Phase 1 Plan 03: TypeScript Schema Types Update Summary

**Manual types.ts update adding clients/invoices/invoice_items tables, invoice_status enum, client_id FKs, and app_mode to user_settings — verified with zero TypeScript errors and a passing production build**

## Performance

- **Duration:** ~5 min (execution time; wall clock inflated by environment pauses)
- **Started:** 2026-02-23T12:38:26Z
- **Completed:** 2026-02-23T16:56:06Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `clients` table (Row/Insert/Update with all 10 fields and empty Relationships)
- Added `invoice_items` table with `amount` in Row only (generated column pattern)
- Added `invoices` table with `tax_amount` and `total` in Row only, FK to clients
- Added `invoice_status` enum ("draft" | "sent" | "paid" | "overdue" | "cancelled") to both Enums section and Constants object
- Updated `incomes` and `expenses` tables with `client_id: string | null` field and FK relationship entries
- Updated `user_settings` table with `app_mode: string` in Row, Insert, Update
- Added `app_mode: "simple"` to `DEFAULT_USER_SETTINGS` in `useUserSettings.ts`
- Confirmed `npm run typecheck` exits 0 and `npm run build` succeeds with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Update types.ts with all Advanced Mode schema types** - `a91154d` (feat)
2. **Task 2: Update DEFAULT_USER_SETTINGS and run final typecheck** - `6bd26c2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/integrations/supabase/types.ts` - Added clients/invoice_items/invoices tables, invoice_status enum, client_id to incomes/expenses, app_mode to user_settings
- `src/hooks/useUserSettings.ts` - Added app_mode: "simple" to DEFAULT_USER_SETTINGS constant

## Decisions Made
- Generated columns (`tax_amount`, `total` on invoices; `amount` on invoice_items) appear in Row only — not in Insert or Update — because Supabase computes them server-side
- `app_mode` defaults to `"simple"` in `DEFAULT_USER_SETTINGS` so new users start in Simple mode; the `satisfies` constraint ensures this field cannot be omitted without a compile error
- `invoice_status` added to Constants object (runtime array) as well as the Enums type definition — enables UI dropdowns and status filtering without hardcoding string arrays in components

## Deviations from Plan

None — plan executed exactly as written. Typecheck passed after Task 1 even before Task 2 (the `satisfies` constraint did not require `app_mode` immediately because TypeScript widened the constant type), but Task 2 was completed as specified to satisfy the done criteria.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- TypeScript type contract is complete and verified for all Advanced Mode tables
- Phase 2 (Client Management) can begin immediately — `clients` table types are in place
- Phase 3 (Transaction Linking) and Phase 5 (Invoices) have their prerequisite types ready
- No blockers

## Self-Check: PASSED
- FOUND: src/integrations/supabase/types.ts
- FOUND: src/hooks/useUserSettings.ts
- FOUND: a91154d (feat(01-03): add Advanced Mode schema types to types.ts)
- FOUND: 6bd26c2 (feat(01-03): add app_mode to DEFAULT_USER_SETTINGS)

---
*Phase: 01-database-and-type-foundation*
*Completed: 2026-02-23*
