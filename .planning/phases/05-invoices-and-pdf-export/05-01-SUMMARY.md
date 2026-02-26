---
phase: 05-invoices-and-pdf-export
plan: 01
subsystem: database, i18n
tags: [supabase, plpgsql, i18n, react-pdf, rpc, sql-migration]

# Dependency graph
requires:
  - phase: 01-database-and-type-foundation
    provides: invoices table with invoice_number column and user_id FK
  - phase: 03-client-management
    provides: clients table that invoices reference
provides:
  - generate_invoice_number(uuid) PL/pgSQL RPC function (migration file, pending dashboard apply)
  - All invoices.* i18n keys in both EN and AR translation blocks in src/i18n/index.ts
  - "@react-pdf/renderer@4.3.2 installed in package.json"
affects:
  - 05-02 (useInvoices hook uses supabase.rpc('generate_invoice_number'))
  - 05-03 (InvoicesPage uses t('invoices.*') keys)
  - 05-04 (InvoiceFormDialog uses all form-related invoices.* keys)
  - 05-05 (InvoiceDetailPage uses @react-pdf/renderer via dynamic import)

# Tech tracking
tech-stack:
  added:
    - "@react-pdf/renderer@4.3.2"
  patterns:
    - Dynamic import for heavy PDF library (avoids 350KB bundle budget violation)
    - SECURITY DEFINER RPC with empty search_path for safe cross-schema access
    - SELECT FOR UPDATE to serialize concurrent invoice number generation

key-files:
  created:
    - supabase/migrations/20260225_generate_invoice_number.sql
  modified:
    - src/i18n/index.ts
    - package.json
    - package-lock.json

key-decisions:
  - "generate_invoice_number uses SELECT FOR UPDATE on all user invoice rows to serialize concurrent calls — prevents duplicate numbers without application-level locking"
  - "regex guard (invoice_number ~ '^\\d+$') skips non-numeric invoice numbers safely — allows mixed formats without crashing CAST"
  - "Migration pending manual application via Supabase dashboard SQL editor — CLI not linked to project (supabase link not run)"
  - "@react-pdf/renderer deliberately NOT statically imported anywhere — will only be used via dynamic import() in InvoiceDetailPage (Plan 05-05) to stay within 350KB gzip bundle budget"
  - "All 58 invoice i18n keys added to both EN and AR blocks in one commit — ensures I18N-01 is fully satisfied before any invoice UI is built"

patterns-established:
  - "Invoice i18n key pattern: invoices.{section}.{key} (e.g., invoices.form.items.add)"
  - "RPC pattern for atomic DB operations: SECURITY DEFINER + SELECT FOR UPDATE + empty search_path"

requirements-completed:
  - INV-02
  - I18N-01

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 5 Plan 01: Foundations — SQL RPC, i18n Keys, PDF Dependency Summary

**Atomic invoice number RPC (PL/pgSQL SELECT FOR UPDATE), 58 invoice i18n keys in EN+AR, and @react-pdf/renderer@4.3.2 installed as the two foundational pillars for Phase 5**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T22:39:27Z
- **Completed:** 2026-02-24T22:41:42Z
- **Tasks:** 3
- **Files modified:** 4 (1 created SQL, 1 modified i18n, 2 modified npm files)

## Accomplishments
- Created `supabase/migrations/20260225_generate_invoice_number.sql` with the full PL/pgSQL RPC using `SELECT FOR UPDATE` for atomic sequential invoice numbering per user
- Added 58 invoice.* i18n keys to both the English and Arabic translation blocks in `src/i18n/index.ts` — 117 total occurrences, covering status labels, filter tabs, form fields, line items, totals, actions, toast messages, and detail labels
- Installed `@react-pdf/renderer@4.3.2` as a project dependency, correctly leaving it for dynamic import only (per bundle budget constraint)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create generate_invoice_number SQL migration** - `db9f15a` (feat)
2. **Task 2: Install @react-pdf/renderer** - `56b3ad1` (chore)
3. **Task 3: Add all invoice.* i18n keys to src/i18n/index.ts (EN + AR)** - `ff2151a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `supabase/migrations/20260225_generate_invoice_number.sql` - PL/pgSQL RPC for atomic invoice number generation with SELECT FOR UPDATE serialization
- `src/i18n/index.ts` - Added 58 invoice.* keys in both EN and AR translation blocks (153 lines added)
- `package.json` - Added @react-pdf/renderer@^4.3.2 dependency
- `package-lock.json` - Updated lock file after npm install

## Decisions Made
- Migration pending manual application via Supabase dashboard SQL editor — `supabase link` not configured and no local instance running; the file is the deliverable per plan spec
- @react-pdf/renderer installed but NOT statically imported — will only be used via `dynamic import()` in Plan 05-05 (InvoiceDetailPage) to avoid violating the 350KB gzip bundle budget
- regex guard `invoice_number ~ '^\d+$'` chosen to safely skip non-numeric invoice numbers without crashing `CAST()` — defensive pattern for mixed-format environments
- SELECT FOR UPDATE on all user invoice rows (not just COUNT) — ensures the lock is row-level even when the table is empty for a user's first invoice

## Deviations from Plan

None - plan executed exactly as written.

The migration CLI fallback (Supabase dashboard manual application) was documented as an expected outcome in the plan itself when CLI is not linked, so it is not a deviation.

## Issues Encountered

Supabase CLI not linked — `npx supabase db push` returned "Cannot find project ref. Have you run supabase link?" and `npx supabase migration up` failed with "connection refused" (no local Supabase running). Per plan spec, migration file is the primary deliverable and manual dashboard application is the documented fallback. No action needed.

## User Setup Required

**One manual step required:** Apply the migration to your Supabase project.

1. Open your Supabase dashboard → SQL Editor
2. Copy and paste the full contents of `supabase/migrations/20260225_generate_invoice_number.sql`
3. Click "Run"
4. Verify success: the function `public.generate_invoice_number` should appear in Database → Functions

This must be done before Plan 05-02 can be tested end-to-end (useInvoices hook calls this RPC).

## Next Phase Readiness
- Plan 05-02 (useInvoices hook) is unblocked: `supabase.rpc('generate_invoice_number', { p_user_id })` call pattern is established
- Plan 05-03 (InvoicesPage) is unblocked: all `t('invoices.*')` keys exist in both languages
- Plan 05-04 (InvoiceFormDialog) is unblocked: all form-related keys ready
- Plan 05-05 (InvoiceDetailPage) is unblocked: @react-pdf/renderer installed and ready for dynamic import

---
*Phase: 05-invoices-and-pdf-export*
*Completed: 2026-02-24*
