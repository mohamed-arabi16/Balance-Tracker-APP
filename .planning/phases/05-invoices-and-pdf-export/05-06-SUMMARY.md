---
phase: 05-invoices-and-pdf-export
plan: 06
subsystem: ui
tags: [react, react-hook-form, zod, react-router, tanstack-query, i18n]

# Dependency graph
requires:
  - phase: 05-03
    provides: InvoiceEditPage stub and route registration in App.tsx
  - phase: 05-04
    provides: InvoiceLineItemsField component (reused verbatim)
  - phase: 05-02
    provides: useInvoice(), useUpdateInvoice() hooks in useInvoices.ts
provides:
  - InvoiceEditPage.tsx — full Draft-only edit form replacing stub
  - Redirect guard blocking non-draft invoices from the edit URL
affects:
  - phase-05-07 (PDF builder) — no dependency, but now edit flow is complete

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useEffect redirect guard pattern for status-gated pages
    - form.reset() in useEffect for pre-populating from async queries (same as ClientEditPage)
    - navigate with replace:true to prevent polluting history stack on redirect

key-files:
  created: []
  modified:
    - src/pages/advanced/InvoiceEditPage.tsx

key-decisions:
  - "InvoiceEditPage uses value= (not defaultValue=) on Select — required for controlled re-render when form.reset() fires after data loads"
  - "Redirect guard runs AFTER data loads (useEffect on invoiceWithItems) not before — prevents premature redirect on first render when data is undefined"
  - "Zod schema repeated from InvoiceNewPage — shared extraction is out of scope per plan; both schemas identical"
  - "Button labels use common.cancel and common.save i18n keys (not hardcoded English) — matches InvoiceNewPage pattern"

patterns-established:
  - "Status-gate redirect pattern: useEffect checks status after data loads, navigates with replace:true"
  - "Edit page pre-population: always use form.reset() in useEffect, never rely on defaultValues for async data"

requirements-completed: [INV-04]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 5 Plan 06: InvoiceEditPage Summary

**Draft-only invoice edit form with status-based redirect guard, pre-populated via form.reset() from useInvoice() data, submitting through useUpdateInvoice() delete-then-reinsert strategy**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-24T23:03:53Z
- **Completed:** 2026-02-24T23:06:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced 4-line stub at InvoiceEditPage.tsx with 300-line full implementation
- Draft redirect guard fires via useEffect after data loads — non-draft invoices are redirected to /invoices/:id with replace:true and a toast (invoices.readOnly.notice)
- Form pre-populated via form.reset() in useEffect when invoiceWithItems.status === 'draft' — covers all fields including line items mapped from DB rows
- Submits via useUpdateInvoice (delete all existing items then re-insert — consistent with Plan 05-02 strategy)
- Reuses InvoiceLineItemsField unchanged from Plan 05-04
- Loading skeleton renders while useInvoice() fetches; null returned while redirect fires
- TypeScript: zero new errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Build InvoiceEditPage with Draft redirect guard** - `cad4e77` (feat)

**Plan metadata:** *(committed below)*

## Files Created/Modified
- `src/pages/advanced/InvoiceEditPage.tsx` - Full Draft-only invoice edit form (replaces stub); redirect guard for non-draft statuses; form.reset() pre-population; useUpdateInvoice submission

## Decisions Made
- Used `value=` (not `defaultValue=`) on Select components — form.reset() after async data load requires controlled value prop to update the displayed selection
- Redirect guard uses `replace: true` in navigate call — prevents user pressing Back and landing on the edit URL again for a sent invoice
- Zod schema duplicated from InvoiceNewPage as specified (not extracted) — shared extraction is out of scope
- Cancel button navigates to `/invoices/${id}` (not navigate(-1)) — safer than history traversal since user may have arrived via deep link

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — all i18n keys (invoices.readOnly.notice, invoices.toast.updateSuccess, invoices.toast.updateError, invoices.number, invoices.actions.edit) were already present from prior plans.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- InvoiceEditPage complete (INV-04 satisfied) — Draft invoices are editable; Sent/Paid/Cancelled are read-only via redirect guard
- Ready for Plan 05-07: PDF builder / final invoice feature (wave 5)
- No blockers introduced

---
*Phase: 05-invoices-and-pdf-export*
*Completed: 2026-02-25*
