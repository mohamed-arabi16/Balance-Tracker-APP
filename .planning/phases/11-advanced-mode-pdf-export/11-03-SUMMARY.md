---
phase: 11-advanced-mode-pdf-export
plan: 03
subsystem: ui
tags: [expo-router, react-hook-form, zod, useFieldArray, swipe-to-delete, invoice-management]

# Dependency graph
requires:
  - phase: 11-advanced-mode-pdf-export
    plan: 01
    provides: Invoices tab stub screen, react-hook-form/zod/resolvers installed
  - phase: 11-advanced-mode-pdf-export
    plan: 02
    provides: useClients hook, client data available for invoice client picker
  - phase: 11-advanced-mode-pdf-export
    provides: useInvoices/useInvoice/useAddInvoice/useUpdateInvoice/useDeleteInvoice/getDisplayStatus hooks
provides:
  - InvoicesListScreen with FlatList, status badges, swipe-to-delete (Draft only), pull-to-refresh
  - InvoiceNewScreen with useFieldArray line items, Modal client picker, zod validation
  - InvoiceEditScreen with useEffect+reset() pre-fill, read-only banner for non-Draft
  - Shared invoiceFormSchema in src/lib/invoiceFormSchema.ts (FIX-01 compliant)
affects:
  - 11-04-PLAN.md (InvoiceDetailScreen can navigate from InvoicesListScreen row tap)

# Tech tracking
tech-stack:
  added:
    - "invoiceFormSchema.ts in src/lib/ — shared zod schema for new and edit screens"
  patterns:
    - "z.number() (not z.coerce) + parseFloat() in onChangeText — zod v4 + react-hook-form zodResolver compat"
    - "z.enum without .default() — avoids input/output type mismatch in zodResolver"
    - "useFieldArray with field.id as React key — stable identity across dynamic add/remove"
    - "useEffect+reset() pattern for edit screen pre-fill (same as ClientEditScreen in Plan 02)"
    - "Modal FlatList client picker — replaces @react-native-picker/picker (not installed)"
    - "DisplayStatus === 'draft' guard on Swipeable — only Draft invoices render delete action"

key-files:
  created:
    - BalanceTracker/app/(tabs)/invoices/_layout.tsx
    - BalanceTracker/app/(tabs)/invoices/new.tsx
    - BalanceTracker/app/(tabs)/invoices/[id]/edit.tsx
    - BalanceTracker/src/lib/invoiceFormSchema.ts
  modified:
    - BalanceTracker/app/(tabs)/invoices/index.tsx

key-decisions:
  - "z.number() + parseFloat() in onChangeText replaces z.coerce.number() — zod v4 changed coerce output type to unknown, breaking zodResolver generic inference; explicit parseFloat() at TextInput level is the clean fix"
  - "No .default() on schema fields — zod .default() makes the INPUT type optional (undefined), creating an input/output type split that zodResolver cannot resolve cleanly; defaults go in useForm defaultValues instead"
  - "currency enum limited to USD|TRY — matches DB currency_code enum exactly; EUR/GBP are not in the Supabase enum so the plan's z.enum(['USD','TRY','EUR','GBP']) was corrected to z.enum(['USD','TRY'])"
  - "invoiceFormSchema extracted to src/lib/ — avoids cross-directory import from app/(tabs)/invoices/[id]/edit.tsx to app/(tabs)/invoices/new.tsx (TypeScript brackets in path segment causes resolution issues)"
  - "invoices/_layout.tsx added (deviation Rule 3) — required for Expo Router to resolve nested routes under invoices/ with formSheet presentation (same pattern as clients/_layout.tsx from Plan 02)"

patterns-established:
  - "Shared form schema in src/lib/ — avoids cross-[id]-bracket import and keeps schema reusable"
  - "parseFloat() coercion at TextInput onChangeText level — keeps form state as numbers, avoids zod v4 coerce type issues"
  - "DisplayStatus guard for swipe delete — getDisplayStatus() result, not raw invoice.status"

requirements-completed: [ADV-03, FIX-01]

# Metrics
duration: 9min
completed: 2026-02-26
---

# Phase 11 Plan 03: Invoice Screens (List, New, Edit) Summary

**Invoice management workflow: FlatList with color-coded status badges, Modal client picker, useFieldArray line items, FIX-01 generated column exclusion confirmed**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-26T10:57:05Z
- **Completed:** 2026-02-26T11:06:00Z
- **Tasks:** 2
- **Files modified:** 5 (index.tsx replaced, new.tsx/edit.tsx created, _layout.tsx created, invoiceFormSchema.ts created)

## Accomplishments

- InvoicesListScreen: FlatList with color-coded status badges (getDisplayStatus), O(1) client name lookup via clientMap, swipe-to-delete restricted to Draft status only, pull-to-refresh, EmptyState with CTA
- InvoicesListScreen total display: `Number(invoice.total ?? 0).toFixed(2) + ' ' + currency` null guard on generated column
- InvoiceNewScreen: useFieldArray line items (field.id as React key), Modal FlatList client picker, parseFloat() coercion for numeric TextInputs, zod validation via zodResolver
- InvoiceEditScreen: useEffect+reset() pre-fill from useInvoice(), invoice.items.map() for defaultValues, read-only yellow banner for non-Draft invoices
- FIX-01 verified: `tax_amount` has zero occurrences in new.tsx — generated column is never included in INSERT/UPDATE payloads
- Zero TypeScript errors on all screens

## Task Commits

Each task was committed atomically:

1. **Task 1: Build InvoicesListScreen** - `689d407` (feat)
2. **Task 2: Build InvoiceNewScreen and InvoiceEditScreen with useFieldArray** - `7cb05b0` (feat)

## Files Created/Modified

- `BalanceTracker/app/(tabs)/invoices/index.tsx` — replaced stub with full FlatList screen (306 lines)
- `BalanceTracker/app/(tabs)/invoices/_layout.tsx` — Stack layout with formSheet presentation for new/edit (created, deviation Rule 3)
- `BalanceTracker/app/(tabs)/invoices/new.tsx` — InvoiceNewScreen with useFieldArray + Modal client picker (660 lines)
- `BalanceTracker/app/(tabs)/invoices/[id]/edit.tsx` — InvoiceEditScreen with pre-fill + read-only mode (766 lines)
- `BalanceTracker/src/lib/invoiceFormSchema.ts` — Shared zod schema (FIX-01 compliant, no tax_amount)

## Decisions Made

- zod v4 breaking change: `z.coerce.number()` output type is `unknown` in zod v4, which breaks zodResolver's TypeScript inference. Fix: use `z.number()` and handle string-to-number conversion with `parseFloat()` in `onChangeText`. This keeps form state as numbers throughout.
- `z.enum().default()` creates input/output type split in zod v4, causing `"USD" | "TRY" | undefined` vs `"USD" | "TRY"` mismatch in zodResolver. Fix: remove `.default()` from schema and provide defaults in `useForm` `defaultValues`.
- `invoiceFormSchema` extracted to `src/lib/invoiceFormSchema.ts` to avoid TypeScript path resolution issues when importing from `invoices/[id]/edit.tsx` to `invoices/new.tsx` (brackets in path segment).
- Currency enum corrected to `['USD', 'TRY']` to match `Database['public']['Enums']['currency_code']` which only contains `"USD" | "TRY"`.
- `invoices/_layout.tsx` created (deviation Rule 3 — blocking issue) to enable Expo Router to resolve nested routes under `invoices/` directory.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created invoices/_layout.tsx for route resolution**
- **Found during:** Task 1
- **Issue:** Without `_layout.tsx`, Expo Router cannot resolve nested routes under `invoices/` or use `formSheet` presentation for new/edit screens. The plan specified the screens but omitted the layout (clients/_layout.tsx exists from Plan 02 and is the required pattern).
- **Fix:** Created `invoices/_layout.tsx` with identical structure to `clients/_layout.tsx`, registering index/new/[id]/index/[id]/edit screens with formSheet presentation.
- **Files modified:** `BalanceTracker/app/(tabs)/invoices/_layout.tsx`
- **Commit:** `689d407`

**2. [Rule 1 - Bug] Fixed zod v4 zodResolver type incompatibility**
- **Found during:** Task 2 TypeScript check
- **Issue:** zod v4 changed `z.coerce.number()` output type to `unknown` and `.default()` creates input/output type split — both break `zodResolver`'s generic inference with react-hook-form.
- **Fix:** Used `z.number()` with `parseFloat()` in `onChangeText`, removed `.default()` from schema (defaults in `useForm defaultValues`).
- **Files modified:** `BalanceTracker/src/lib/invoiceFormSchema.ts`, `new.tsx`, `edit.tsx`
- **Commit:** `7cb05b0`

**3. [Rule 1 - Bug] Corrected currency enum to match DB**
- **Found during:** Task 2 TypeScript check
- **Issue:** Plan specified `z.enum(['USD', 'TRY', 'EUR', 'GBP'])` but DB `currency_code` enum is `"USD" | "TRY"` only. `useAddInvoice` payload type is `Pick<Insert, ... 'currency' ...>` and `Insert.currency` is `"USD" | "TRY" | undefined`.
- **Fix:** Changed schema to `z.enum(['USD', 'TRY'])`.
- **Files modified:** `BalanceTracker/src/lib/invoiceFormSchema.ts`
- **Commit:** `7cb05b0`

**4. [Rule 3 - Blocking] Extracted shared schema to src/lib/**
- **Found during:** Task 2 TypeScript check
- **Issue:** Cross-directory import from `invoices/[id]/edit.tsx` to `invoices/new.tsx` via relative path `./../../new` failed TypeScript module resolution due to bracket `[id]` in the path segment.
- **Fix:** Moved schema to `src/lib/invoiceFormSchema.ts` and imported via `@/lib/invoiceFormSchema` alias.
- **Files modified:** `BalanceTracker/src/lib/invoiceFormSchema.ts`, `edit.tsx` import changed
- **Commit:** `7cb05b0`

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None — all changes are code-only, no external service configuration required.

## Next Phase Readiness

- Plan 11-04 (InvoiceDetailScreen + PDF export) is unblocked: `router.push('/(tabs)/invoices/' + invoice.id)` taps are already wired in InvoicesListScreen
- `useInvoice(id)` is established and working in InvoiceEditScreen — Plan 04 can reuse the same pattern
- FIX-01 resolved: invoice creation will not error on `tax_amount` generated column

---
*Phase: 11-advanced-mode-pdf-export*
*Completed: 2026-02-26*
