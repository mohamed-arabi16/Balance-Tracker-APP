---
phase: 05-invoices-and-pdf-export
plan: "04"
subsystem: invoices
tags: [invoice, form, react-hook-form, zod, useFieldArray, useWatch, line-items]
dependency_graph:
  requires:
    - "05-02"  # useAddInvoice hook and useInvoices hooks
    - "05-03"  # InvoiceNewPage stub and route /invoices/new registered
  provides:
    - "InvoiceNewPage — full invoice creation form"
    - "InvoiceLineItemsField — reusable dynamic line items component"
  affects:
    - "05-06"  # InvoiceEditPage will reuse InvoiceLineItemsField
tech_stack:
  added: []
  patterns:
    - "useFieldArray with field.id as key (never index) — stable identity on remove"
    - "useWatch for reactive live totals (subtotal, tax, total)"
    - "z.coerce.number() for numeric inputs from HTML string values"
    - "z.array(lineItemSchema).min(1) for array-level minimum validation"
key_files:
  created:
    - src/components/invoice/InvoiceLineItemsField.tsx
  modified:
    - src/pages/advanced/InvoiceNewPage.tsx
decisions:
  - "[05-04]: field.id used as React key in useFieldArray — index-based keys cause focus loss and state corruption when removing middle items"
  - "[05-04]: z.coerce.number() on quantity and unit_price — HTML number inputs return strings; coerce converts transparently"
  - "[05-04]: currency enum locked to USD|TRY — matches DB currency_code enum confirmed in types.ts"
  - "[05-04]: due_date converts empty string to null before mutation — avoids passing '' to Supabase date column"
  - "[05-04]: InvoiceLineItemsField accepts Control<any> — enables reuse by InvoiceEditPage (Plan 05-06) with different form type"
metrics:
  duration: "2 minutes"
  completed_date: "2026-02-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 05 Plan 04: Invoice Creation Form Summary

Invoice creation flow implemented: `InvoiceLineItemsField` (reusable dynamic line items component using `useFieldArray`) and `InvoiceNewPage` (full form replacing the stub). User can fill, validate, and submit an invoice that auto-numbers via the `generate_invoice_number` RPC.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create InvoiceLineItemsField reusable component | 76f0d1d | src/components/invoice/InvoiceLineItemsField.tsx (created) |
| 2 | Build InvoiceNewPage (replace stub with complete form) | 8bbbdbd | src/pages/advanced/InvoiceNewPage.tsx (replaced) |

## What Was Built

### InvoiceLineItemsField (`src/components/invoice/InvoiceLineItemsField.tsx`, 148 lines)

Reusable form section for dynamic line items:

- `useFieldArray({ control, name: 'items' })` manages the array — `field.id` used as React key (NEVER index) to preserve focus on mid-list removes
- `useWatch` subscribes to items and tax_rate for reactive totals: subtotal, tax amount, total update live as user types
- Add button appends `{ description: '', quantity: 1, unit_price: 0 }` as default
- Remove button is disabled when `fields.length === 1` — enforces at least one line item in the UI
- Column headers hidden on mobile (sm breakpoint) for clean responsive grid
- Exports `LineItemFormValues` and `InvoiceFormWithItems` interfaces for type-safe reuse

### InvoiceNewPage (`src/pages/advanced/InvoiceNewPage.tsx`, 250 lines)

Full invoice creation form:

- Zod schema validates: `client_id` (required), `issue_date` (required), `due_date` (optional), `currency` (`USD | TRY` enum), `tax_rate` (0-100 coerced), `notes` (optional), `items` (array min 1)
- Client dropdown populated from `useClients()` — shows `name — company` when company is present
- Today's date pre-filled as `issue_date` default
- `useAddInvoice.mutate()` called on submit — calls `generate_invoice_number` RPC atomically then inserts invoice + line items
- `due_date: values.due_date || null` — empty string safely converted to null before mutation
- On success: `toast.success` + `navigate('/invoices/:id')` for the new invoice
- On error: `toast.error` with the error message from Supabase

## Verification Results

```
1. ls src/components/invoice/InvoiceLineItemsField.tsx    FOUND
2. grep "field\.id"                                        STABLE_KEY_FOUND
3. grep "useWatch"                                         LIVE_TOTALS_FOUND
4. ls src/pages/advanced/InvoiceNewPage.tsx               FOUND (248+ lines)
5. grep "useAddInvoice"                                   MUTATION_FOUND
6. npx tsc --noEmit | grep "error TS" | wc -l             0
```

## Deviations from Plan

None - plan executed exactly as written. The only minor adaptation was using `t('invoices.form.details')` for the card header title (instead of hardcoded "Invoice Details") to maintain i18n consistency, and using `t('common.cancel')` / `t('common.saving')` for button labels.

## Self-Check

**Files created/modified:**
- [ ] src/components/invoice/InvoiceLineItemsField.tsx — `FOUND` (148 lines)
- [ ] src/pages/advanced/InvoiceNewPage.tsx — `FOUND` (250 lines)

**Commits:**
- [ ] 76f0d1d — feat(05-04): create InvoiceLineItemsField reusable component
- [ ] 8bbbdbd — feat(05-04): build InvoiceNewPage — replace stub with complete form

## Self-Check: PASSED
