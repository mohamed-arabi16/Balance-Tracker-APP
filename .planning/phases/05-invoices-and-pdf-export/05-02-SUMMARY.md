---
phase: 05-invoices-and-pdf-export
plan: "02"
subsystem: api
tags: [react-query, supabase, typescript, date-fns, invoices]

# Dependency graph
requires:
  - phase: 05-01
    provides: generate_invoice_number RPC, invoices/invoice_items tables, queryKeys.invoices factory
  - phase: 03-01
    provides: useClients.ts pattern (useQuery + useMutation structure to follow)
provides:
  - src/hooks/useInvoices.ts — 6 CRUD hooks + getDisplayStatus utility + 3 exported types
  - Invoice, InvoiceItem, InvoiceWithItems TypeScript types
  - getDisplayStatus() — client-side overdue derivation (never writes 'overdue' to DB)
  - useInvoices() — list all invoices ordered by created_at desc
  - useInvoice() — single invoice with line items via relational join
  - useAddInvoice() — atomic: generate_invoice_number RPC → insert invoice → bulk-insert items
  - useUpdateInvoice() — header update + delete-then-reinsert line items
  - useUpdateInvoiceStatus() — typed to 'sent' | 'paid' | 'cancelled' only
  - useDeleteInvoice() — delete by id (UI enforces draft-only gate)
affects:
  - 05-03-invoices-list-page
  - 05-04-invoice-create-edit
  - 05-05-invoice-detail-pdf
  - 05-06-invoice-paid-flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Overdue status derived client-side via getDisplayStatus(status, due_date) — DB always stores 'sent'"
    - "generate_invoice_number RPC called as (supabase as any).rpc() — not yet in Database Function types"
    - "Line item replace strategy: delete all existing then bulk-insert new (simple, correct)"
    - "useUpdateInvoiceStatus accepts only 'sent' | 'paid' | 'cancelled' — overdue excluded from type"
    - "status: 'draft' as const used in insert to satisfy invoice_status enum type"

key-files:
  created:
    - src/hooks/useInvoices.ts
  modified: []

key-decisions:
  - "'overdue' is client-side only — getDisplayStatus derives it from status='sent' + past due_date via date-fns isBefore"
  - "generate_invoice_number RPC cast via (supabase as any) — RPC not in Database.Functions type yet, relaxed tsconfig avoids errors"
  - "delete-then-reinsert for line items on update — simplest correct approach, avoids diff complexity"
  - "useDeleteInvoice has no DB-level draft guard — comment documents that UI is the enforcement layer"

patterns-established:
  - "Composite type pattern: export type XWithItems = X & { items: XItem[] }"
  - "Relational select: .select('*, items:table_name(*)').order(col, { referencedTable: 'table_name' })"
  - "Status-specific mutation hook: useUpdateXStatus accepts narrow union type, never includes derived values"

requirements-completed: [INV-01, INV-02, INV-03, INV-04, INV-06]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 5 Plan 02: useInvoices Hook Summary

**6-hook invoice data layer with atomic RPC-based invoice numbering, client-side overdue derivation, and typed status transitions — single data file for all four invoice UI pages**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-24T22:44:31Z
- **Completed:** 2026-02-24T22:46:21Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments
- Created `src/hooks/useInvoices.ts` (257 lines) with all 6 CRUD hooks and getDisplayStatus utility
- Implemented atomic invoice creation: generate_invoice_number RPC → invoice insert → bulk item insert
- Established the overdue-never-in-DB invariant via getDisplayStatus() using date-fns isBefore()
- Typed useUpdateInvoiceStatus to accept only 'sent' | 'paid' | 'cancelled' — overdue excluded

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/hooks/useInvoices.ts with all CRUD hooks** - `e90f9b0` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/hooks/useInvoices.ts` - Complete invoice data layer: 6 hooks, getDisplayStatus, Invoice/InvoiceItem/InvoiceWithItems types

## Decisions Made
- **'overdue' client-side only:** `getDisplayStatus(status, due_date)` derives overdue from `status === 'sent' && isBefore(parseISO(due_date), new Date())`. The DB enum includes 'overdue' but it is never written — this keeps status transitions clean and prevents stale overdue records.
- **RPC type cast:** `generate_invoice_number` is not yet in `Database['public']['Functions']` (migration applied manually in 05-01). Used `(supabase as any).rpc(...)` since `noImplicitAny: false` in tsconfig — zero compile errors.
- **Delete-then-reinsert for line items:** On update, all existing items are deleted then new items bulk-inserted. This is simpler and more correct than diffing, at the cost of reset sort_order values (acceptable for the use case).
- **UI-enforced delete gate:** `useDeleteInvoice` has no DB-level guard restricting to draft-only. The comment documents that the UI (05-04) is the enforcement layer, consistent with the plan's must_haves.

## Deviations from Plan

None — plan executed exactly as written. The only implementation note is using `(supabase as any).rpc()` for the generate_invoice_number call since that RPC is not in the generated Database types, but this was anticipated in the plan and works correctly with the relaxed tsconfig.

## Issues Encountered
- `generate_invoice_number` not in `Database['public']['Functions']` type (expected — migration applied manually in 05-01). Handled with `(supabase as any).rpc()` cast. TypeScript compiled with zero errors.

## User Setup Required
None - no external service configuration required. The generate_invoice_number migration was applied in Plan 05-01.

## Next Phase Readiness
- `useInvoices.ts` is ready for import by all four invoice UI pages (05-03 through 05-06)
- All 10 named exports available: Invoice, InvoiceItem, InvoiceWithItems, getDisplayStatus, useInvoices, useInvoice, useAddInvoice, useUpdateInvoice, useUpdateInvoiceStatus, useDeleteInvoice
- TypeScript compiles with zero new errors

---
*Phase: 05-invoices-and-pdf-export*
*Completed: 2026-02-24*
