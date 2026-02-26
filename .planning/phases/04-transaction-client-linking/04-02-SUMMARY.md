---
phase: 04-transaction-client-linking
plan: "02"
subsystem: ui
tags: [react, typescript, supabase, zod, react-hook-form, tanstack-query]

# Dependency graph
requires:
  - phase: 04-01
    provides: ClientCombobox component (Command+Popover, modal mode, clear button) + 16 i18n keys for income/expense client fields
  - phase: 02-01
    provides: ModeContext and useMode() hook with isAdvanced boolean
provides:
  - Income interface with client_id field (useIncomes.ts)
  - UpdateIncomePayload with optional client_id (useIncomes.ts)
  - AddIncomeForm with conditional ClientCombobox in Advanced mode
  - EditIncomeForm with conditional ClientCombobox pre-populated from income.client_id
affects:
  - 04-03 (expense form client linking — same pattern applies)
  - Phase 5 (invoice creation may reference client linking for context)

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
    - src/hooks/useIncomes.ts
    - src/pages/Income.tsx

key-decisions:
  - "client_id ?? null used in both addIncome and updateIncome payloads — explicit null prevents undefined leaking into Supabase insert/update"
  - "client_id field placed last before submit buttons in both forms — consistent pattern with EditExpenseForm expected in 04-03"
  - "EditIncomeForm defaultValues uses income.client_id ?? null — handles existing incomes without client (null) and those with client (uuid string)"

patterns-established:
  - "Advanced-only form field pattern: useMode() inside component, {isAdvanced && <FormField />} wrapping, client_id in defaultValues always (null when no selection)"
  - "Schema pattern for optional advanced fields: z.string().nullable().optional() in incomeSchema — inherited automatically by editIncomeSchema refine wrapper"

requirements-completed: [TXN-01]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 4 Plan 02: Income Form Client Linking Summary

**client_id added to Income type and mutations; AddIncomeForm and EditIncomeForm conditionally render ClientCombobox in Advanced mode via isAdvanced gate**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-24T21:26:05Z
- **Completed:** 2026-02-24T21:28:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Income interface extended with `client_id: string | null` — type-safe across all consumers
- UpdateIncomePayload extended with `client_id?: string | null` and wired into Supabase update call
- AddIncomeForm: imports useMode and ClientCombobox, renders client combobox only when `isAdvanced` is true, includes client_id in mutate payload
- EditIncomeForm: same pattern, pre-populates combobox from `income.client_id`, includes client_id in update payload
- Simple mode: client field completely absent from DOM — not hidden, not disabled, not rendered

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Income type and mutations to support client_id** - `37e7977` (feat)
2. **Task 2: Add conditional client field to AddIncomeForm and EditIncomeForm** - `c152742` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/hooks/useIncomes.ts` - Added `client_id: string | null` to Income interface, `client_id?: string | null` to UpdateIncomePayload, `client_id: payload.client_id ?? null` in updateIncome Supabase call
- `src/pages/Income.tsx` - Added useMode and ClientCombobox imports; added client_id to incomeSchema; updated both AddIncomeForm and EditIncomeForm with isAdvanced conditional rendering

## Decisions Made

- `client_id ?? null` in mutation payloads — explicit null ensures Supabase clears the column when client is deselected (avoids undefined behavior in update objects)
- Field placed after date (AddIncomeForm) and after note (EditIncomeForm) — last before button row, following the plan's discretion guidance
- `editIncomeSchema` inherits `client_id` automatically since it wraps `incomeSchema` via `.refine()` — no separate schema change needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TXN-01 satisfied: Advanced mode users can tag income entries to clients; Simple mode users see no client field
- Pattern established for 04-03 (expense form client linking): identical approach — useMode() + ClientCombobox + isAdvanced gate + client_id in schema and payload
- 04-03 can proceed immediately using this plan as template

---
*Phase: 04-transaction-client-linking*
*Completed: 2026-02-25*
