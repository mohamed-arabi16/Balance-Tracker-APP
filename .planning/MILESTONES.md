# Milestones

## v1.0 Advanced Mode MVP (Shipped: 2026-02-25)

**Phases completed:** 5 phases, 21 plans | 86 files changed, ~15,300 insertions | ~16,650 LOC TypeScript | 3 days (2026-02-23 → 2026-02-25)

**Key accomplishments:**
1. Supabase schema — clients, invoices, invoice_items tables with RLS, computed columns (generated amount/tax/total), FK cascade behaviors, invoice_status enum
2. Advanced Mode infrastructure — mode toggle with Supabase persistence, AdvancedRoute guards, sidebar extension, Settings integration
3. Full client management — CRUD (list with search, create, edit, detail with linked transactions), 5 hooks + i18n
4. Transaction-client linking — optional ClientCombobox on income and expense entry/edit forms, client_id persisted to DB
5. Complete invoice lifecycle — create with line items (useFieldArray), Draft→Sent→Paid transitions, client-side overdue detection, atomic invoice numbering via RPC, lazy PDF export (@react-pdf/renderer), paid→income prompt, full Arabic i18n parity

**Known gaps carried to v1.1:**
- DASH-01: Revenue per client widget (Phase 6: Advanced Dashboard)
- DASH-02: Outstanding invoices panel (Phase 6: Advanced Dashboard)

---

