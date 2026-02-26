---
phase: 01-database-and-type-foundation
plan: 01
subsystem: database
tags: [supabase, postgresql, migrations, rls, sql, schema]

# Dependency graph
requires: []
provides:
  - "SQL migration file covering all 7 Advanced Mode schema changes in FK-dependency order"
  - "clients table with RLS (ON DELETE CASCADE from auth.users)"
  - "invoices table with RLS (client_id ON DELETE RESTRICT, UNIQUE(user_id, invoice_number))"
  - "invoice_items table with RLS (invoice_id ON DELETE CASCADE, generated amount column)"
  - "invoice_status enum: draft/sent/paid/overdue/cancelled"
  - "incomes.client_id nullable FK (ON DELETE SET NULL)"
  - "expenses.client_id nullable FK (ON DELETE SET NULL)"
  - "user_settings.app_mode column (DEFAULT 'simple')"
affects:
  - "01-02-PLAN.md: migration must be applied via Supabase Dashboard SQL Editor"
  - "01-03-PLAN.md: types.ts update depends on applied schema"
  - "All downstream phases depend on this schema being live in Supabase"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CREATE TABLE + CREATE INDEX + ENABLE ROW LEVEL SECURITY + CREATE POLICY as atomic block per table"
    - "GENERATED ALWAYS AS ... STORED for computed columns (tax_amount, total, amount)"
    - "ON DELETE RESTRICT on invoices.client_id to prevent silent invoice orphaning"
    - "ON DELETE SET NULL on incomes/expenses.client_id to preserve financial history on client delete"
    - "UNIQUE(user_id, invoice_number) for per-user uniqueness (not global)"

key-files:
  created:
    - "supabase/migrations/20260223000000_advanced_mode_schema.sql"
  modified: []

key-decisions:
  - "invoices.client_id uses ON DELETE RESTRICT (not CASCADE) — prevents silent invoice deletion when client is removed"
  - "incomes.client_id and expenses.client_id use ON DELETE SET NULL (not RESTRICT) — preserves financial history"
  - "UNIQUE(user_id, invoice_number) compound constraint — per-user uniqueness, not global"
  - "Generated columns tax_amount/total/amount are STORED and excluded from Insert/Update types"
  - "invoice_items.user_id denormalized for direct RLS (same pattern as debt_amount_history)"

patterns-established:
  - "FK dependency chain: user_settings → enum → clients → invoices → invoice_items → incomes/expenses FKs"
  - "All new tables: CREATE TABLE + INDEX + ENABLE ROW LEVEL SECURITY + FOR ALL policy (no SELECT-only redundancy)"

requirements-completed: []

# Metrics
duration: 1min
completed: 2026-02-23
---

# Phase 1 Plan 01: Write Advanced Mode SQL Migration Summary

**99-line SQL migration establishing clients/invoices/invoice_items tables with RLS, invoice_status enum, and nullable client FKs on incomes/expenses — all 7 schema changes in FK-dependency order**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-23T12:19:59Z
- **Completed:** 2026-02-23T12:20:44Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Created complete migration SQL file with all 7 Advanced Mode schema changes in correct FK dependency order
- All three new tables (clients, invoices, invoice_items) have ENABLE ROW LEVEL SECURITY and FOR ALL policies
- Critical FK cascade semantics encoded correctly: RESTRICT on invoices.client_id, SET NULL on incomes/expenses.client_id
- UNIQUE(user_id, invoice_number) per-user constraint prevents global collision
- Three generated columns (tax_amount, total, amount) correctly use GENERATED ALWAYS AS STORED

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the advanced mode SQL migration file** - `ec9b233` (feat)

**Plan metadata:** (pending — added in final commit)

## Files Created/Modified

- `supabase/migrations/20260223000000_advanced_mode_schema.sql` - Complete Advanced Mode schema migration covering all 7 schema changes. Includes clients table, invoices table with generated columns, invoice_items table, invoice_status enum, nullable client FKs on existing incomes and expenses tables, and app_mode column on user_settings.

## Decisions Made

- ON DELETE RESTRICT on `invoices.client_id` — a client with invoices cannot be silently deleted; DB enforces referential integrity
- ON DELETE SET NULL on `incomes.client_id` and `expenses.client_id` — client deletion nulls the FK, preserving all financial history
- UNIQUE(user_id, invoice_number) compound constraint — each user has their own invoice number namespace
- Generated columns excluded from Insert/Update — PostgreSQL rejects non-DEFAULT writes to GENERATED ALWAYS columns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** The migration file is written but must be applied via the Supabase Dashboard SQL Editor (supabase CLI is not installed in this project). See Plan 01-02 for the application checkpoint.

Steps for applying this migration:
1. Open Supabase Dashboard SQL Editor at https://supabase.com/dashboard/project/zdumkdzverjivwxicclj
2. Copy the full contents of `supabase/migrations/20260223000000_advanced_mode_schema.sql`
3. Paste and run in the SQL Editor
4. Verify tables clients, invoices, invoice_items appear in Table Editor
5. Verify incomes and expenses tables show new `client_id` column
6. Verify user_settings table shows new `app_mode` column

## Next Phase Readiness

- Migration file is complete and verified (all grep checks pass)
- Ready for Plan 01-02: human checkpoint to apply migration via Supabase Dashboard SQL Editor
- Plan 01-03 (TypeScript types update) depends on Plan 01-02 being applied to the live database
- `src/integrations/supabase/types.ts` not yet updated — that is Plan 01-03's scope
- `DEFAULT_USER_SETTINGS` in `src/hooks/useUserSettings.ts` not yet updated — that is Plan 01-03's scope

---
*Phase: 01-database-and-type-foundation*
*Completed: 2026-02-23*

## Self-Check: PASSED

- FOUND: supabase/migrations/20260223000000_advanced_mode_schema.sql
- FOUND: .planning/phases/01-database-and-type-foundation/01-01-SUMMARY.md
- FOUND commit ec9b233: feat(01-01): write advanced mode SQL migration file
