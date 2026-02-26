---
phase: 04-transaction-client-linking
plan: "03"
subsystem: ui
tags: [react, typescript, supabase, zod, react-hook-form, tanstack-query]

# Dependency graph
requires:
  - phase: 04-01
    provides: ClientCombobox component (Command+Popover, modal mode, clear button) + 16 i18n keys for income/expense client fields
  - phase: 04-02
    provides: pattern established for isAdvanced conditional ClientCombobox in income forms — same pattern applied here
  - phase: 02-01
    provides: ModeContext and useMode() hook with isAdvanced boolean
provides:
  - Expense interface with client_id field (useExpenses.ts)
  - AddExpenseForm with conditional ClientCombobox in Advanced mode
  - EditExpenseForm with conditional ClientCombobox pre-populated from expense.client_id
affects:
  - Phase 5 (invoice creation may reference client linking for context)
  - Phase 6 (AdvancedDashboard may display client-tagged expenses)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isAdvanced conditional rendering: {isAdvanced && (<FormField .../>) } — field absent from DOM entirely in Simple mode"
    - "client_id nullable typing: string | null in domain types, string | null | undefined in form schema (z.string().nullable().optional())"
    - "Mutation payload includes client_id ?? null — explicit null to clear previous selection"

key-files:
  created: []
  modified:
    - src/hooks/useExpenses.ts
    - src/pages/Expenses.tsx

key-decisions:
  - "client_id spreads automatically into addExpense and updateExpense — no function body changes needed since both use spread-based Supabase insert/update"
  - "EditExpenseForm defaultValues uses expense.client_id ?? null — handles existing expenses without client (null) and those with client (uuid string)"
  - "client_id field placed last before submit buttons in both forms — consistent with AddIncomeForm/EditIncomeForm pattern from 04-02"

patterns-established:
  - "Advanced-only form field pattern confirmed: useMode() inside component, {isAdvanced && <FormField />} wrapping, client_id in defaultValues always (null when no selection)"

requirements-completed: [TXN-02]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 4 Plan 03: Expense Form Client Linking Summary

**client_id added to Expense interface and mutations; AddExpenseForm and EditExpenseForm conditionally render ClientCombobox in Advanced mode via isAdvanced gate**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-24T21:29:00Z
- **Completed:** 2026-02-24T21:31:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Expense interface extended with `client_id: string | null` — type-safe across all consumers
- addExpense and updateExpense handle client_id automatically via spread-based Supabase calls (no function body changes needed)
- AddExpenseForm: imports useMode and ClientCombobox, client_id in schema and defaultValues, renders combobox only when `isAdvanced` is true, includes client_id in mutate payload
- EditExpenseForm: same pattern, pre-populates combobox from `expense.client_id ?? null`, includes client_id in update payload
- Simple mode: client field completely absent from DOM — not hidden, not disabled, not rendered

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Expense type and mutations to support client_id** - `2cab10f` (feat)
2. **Task 2: Add conditional client field to AddExpenseForm and EditExpenseForm** - `2a3d8c2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/hooks/useExpenses.ts` - Added `client_id: string | null` to Expense interface; addExpense and updateExpense automatically carry client_id via spread
- `src/pages/Expenses.tsx` - Added useMode and ClientCombobox imports; added client_id to expenseSchema; updated both AddExpenseForm and EditExpenseForm with isAdvanced conditional rendering and client_id in mutate payloads

## Decisions Made

- client_id spreads automatically — both `addExpense` and `updateExpense` use spread-based insert/update (`insert([newExpense])` / `update(updatedExpense)`), so adding `client_id` to the Expense interface and form payload is sufficient; no function body changes needed
- `expense.client_id ?? null` in EditExpenseForm defaultValues — handles the null case for expenses created before client linking was added
- Pattern perfectly mirrors 04-02 (income form) — useMode() inside component, conditional FormField block, client_id in schema + defaultValues + payload

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TXN-02 satisfied: Advanced mode users can tag expense entries to clients; Simple mode users see no client field
- Phase 4 (Transaction Client Linking) is now complete — all 3 plans done
- Phase 5 (Invoices) can proceed: client selection infrastructure is fully in place for both income and expense forms

---
*Phase: 04-transaction-client-linking*
*Completed: 2026-02-25*
