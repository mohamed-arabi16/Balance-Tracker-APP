# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26 after v2.0 milestone start)

**Core value:** Anyone can track their money simply — and freelancers can manage their business without switching apps.
**Current focus:** v2.0 iOS Native App

## Current Position

Milestone: v2.0 iOS Native App
Phase: Not started (defining requirements)
Status: Defining requirements
Last activity: 2026-02-26 — Milestone v2.0 started

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: human-gated (01-02, 03-03, 06-02 were human-checkpoint plans)
- Total execution time: ~21 min (automated) + human-gated

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Database & Type Foundation | 3/3 (complete) | 6 min (automated) + human-gated | human-gated |
| 2. Mode Infrastructure | 4/4 (complete) | 7 min | 1.75 min |
| 3. Client Management | 3/3 (complete) | ~5 min + human-verify | human-gated |
| 4. Transaction Client Linking | 4/4 (complete) | ~7 min + human-verify | human-gated |
| 5. Invoices & PDF Export | 7/7 (complete) | 14 min (automated) + human-verify | human-gated |
| 6. Advanced Dashboard | 2/2 (complete) | 2 min + human-verify | human-gated |

**Recent Trend:**
- Last 5 plans: 05-04 (2 min), 05-05 (2 min), 05-06 (3 min), 06-01 (2 min), 06-02 (human-gated)
- Trend: Fast (UI pages follow established patterns)

*Updated after each plan completion*
| Phase 06 P01 | 2 | 2 tasks | 2 files |
| Phase 06 P02 | human-gated | 1 task | 0 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Advanced mode is additive — Simple mode UI never modified, advanced features added alongside
- [Roadmap]: Phase 1 has no requirement IDs (pure foundation) — unlocks all 19 v1 requirements
- [Roadmap]: TXN phase split from CLNT phase — transaction linking depends on ClientSelector component existing first
- [Roadmap]: I18N-01 assigned to Phase 5 (Invoices) — translation parity enforced before invoice UI ships, not as a separate cleanup phase
- [01-01]: invoices.client_id uses ON DELETE RESTRICT (not CASCADE) — prevents silent invoice deletion when client is removed
- [01-01]: incomes/expenses.client_id uses ON DELETE SET NULL — preserves financial history when client is deleted
- [01-01]: UNIQUE(user_id, invoice_number) compound constraint — per-user uniqueness, not global
- [01-03]: Generated columns (tax_amount, total, amount) excluded from Insert/Update types — Supabase computes them server-side
- [01-03]: app_mode defaults to 'simple' in DEFAULT_USER_SETTINGS — new users start in Simple mode; satisfies constraint enforces completeness at compile time
- [01-03]: invoice_status added to both Enums type definition and Constants runtime array — enables UI dropdowns without hardcoding string arrays in components
- [02-01]: No localStorage for mode — default 'simple' is safe state, no flash risk, per research decision
- [02-01]: No isLoading guard in AdvancedRoute — cold-cache flash deferred until it becomes a real user issue
- [02-01]: Existing hooks not migrated to queryKeys — only new Phase 3+ hooks use factory from day one
- [02-02]: ModeProvider placed between ThemeProvider and CurrencyProvider — inside AuthProvider (needs useUserSettings/useAuth), outside CurrencyProvider (advanced pages may need currency)
- [02-02]: AdvancedDashboard is a stub only — full widget implementation deferred to Phase 6
- [02-02]: i18n Mode keys placed at top of each language object in Navigation + Mode sections for easy auditing
- [02-03]: sidebarItems array moved inside Sidebar function body — required for useMode() hook access; content unchanged
- [02-03]: Settings Mode Card calls setMode() from useMode() directly (not persistSettings) — avoids double-persist and double toast
- [02-04]: Mode toggle placed in <nav> section (not footer) — footer div is opacity-0/h-0 when collapsed, making footer controls completely inaccessible
- [02-04]: Interactive controls must never live inside the collapsed footer div — that div is fully hidden when sidebar collapses on desktop
- [03-01]: No onSuccess in useQuery — TanStack Query v5 removed this API; onSuccess only used in useMutation
- [03-01]: Prefix invalidation for useUpdateClient — invalidating queryKeys.clients(userId) automatically covers detail keys via prefix matching
- [03-01]: Defensive updated_at in useUpdateClient — set explicitly since moddatetime trigger presence is an open question
- [03-01]: Pre-existing build failure (lovable cloud-auth-js) is out of scope — confirmed identical error exists before plan changes
- [03-02]: e.stopPropagation() on DropdownMenuTrigger — required when card has onClick; prevents dropdown click from also triggering card navigation
- [03-02]: form.reset() in useEffect for edit pages — defaultValues only run at init; async data always set via reset after useQuery resolves
- [03-02]: FK violation detection in delete handler — check err.message for 'foreign key' or 'violates' to show specific deleteRestricted message vs generic error
- [03-03]: Three separate useQuery calls on ClientDetailPage (invoices, incomes, expenses) — each independently cacheable; combined query would require a view or RPC not yet available
- [03-03]: Route order: /clients/new before /clients/:id — React Router v6 top-to-bottom matching; 'new' captured as UUID param if :id declared first
- [03-03]: invoices.total selected as read-only — generated column valid for SELECT, excluded from Insert/Update types only
- [04-01]: ClientCombobox uses modal={true} on Popover — required for Dialog-hosted usage (same as date pickers in Income.tsx and Expenses.tsx)
- [04-01]: Empty state uses income.form.noClients and income.form.addClient keys even for expense context — component is shared, expense forms pass placeholder prop for label
- [04-01]: filteredClients computed inline rather than via CommandInput's built-in filter — explicit case-insensitive name matching
- [04-02]: client_id ?? null in mutation payloads — explicit null prevents undefined leaking into Supabase insert/update, ensures column is cleared on client deselect
- [04-02]: Advanced-only form field pattern: useMode() inside component, {isAdvanced && <FormField />} wrapping, client_id in defaultValues always (null when no selection)
- [04-02]: editIncomeSchema inherits client_id automatically via .refine() wrapper over incomeSchema — no separate schema change needed
- [04-03]: client_id spreads automatically into addExpense/updateExpense — both use spread-based Supabase calls so adding client_id to interface and payload is sufficient; no function body changes
- [04-03]: expense.client_id ?? null in EditExpenseForm defaultValues — handles expenses created before client linking was added
- [05-01]: generate_invoice_number uses SELECT FOR UPDATE on all user invoice rows to serialize concurrent calls — prevents duplicate numbers without application-level locking
- [05-01]: regex guard (invoice_number ~ '^\d+$') skips non-numeric invoice numbers safely — allows mixed formats without crashing CAST
- [05-01]: Migration pending manual application via Supabase dashboard SQL editor — CLI not linked (supabase link not run); file is the primary deliverable
- [05-01]: @react-pdf/renderer deliberately NOT statically imported — will only use dynamic import() in InvoiceDetailPage (Plan 05-05) to stay within 350KB gzip bundle budget
- [05-02]: 'overdue' is client-side only — getDisplayStatus derives it from status='sent' + past due_date via date-fns isBefore; DB enum includes 'overdue' but it is never written
- [05-02]: generate_invoice_number RPC cast via (supabase as any) — RPC not in Database.Functions type yet; relaxed tsconfig (noImplicitAny: false) avoids compile errors
- [05-02]: delete-then-reinsert for line items on update — simplest correct approach, avoids diff complexity
- [05-02]: useDeleteInvoice has no DB-level draft guard — UI (05-04) is the enforcement layer per plan must_haves
- [05-03]: Route order: /invoices/new declared before /invoices/:id — React Router v6 top-to-bottom matching; 'new' captured as UUID param if :id declared first
- [05-03]: InvoiceStatusBadge created as stub (variant=outline) — full color-coded implementation deferred to Plan 05-05 where badge semantics are defined
- [05-03]: Stub pages created for InvoiceNewPage, InvoiceEditPage, InvoiceDetailPage — allows App.tsx route registration to compile before Plans 05-04 through 05-06
- [05-04]: field.id used as React key in useFieldArray — index-based keys cause focus loss and state corruption when removing middle items
- [05-04]: z.coerce.number() on quantity and unit_price — HTML number inputs return strings; coerce converts transparently
- [05-04]: currency enum locked to USD|TRY — matches DB currency_code enum confirmed in types.ts
- [05-04]: due_date converts empty string to null before mutation — avoids passing '' to Supabase date column
- [05-04]: InvoiceLineItemsField accepts Control<any> — enables reuse by InvoiceEditPage (Plan 05-06) with different form type
- [05-05]: @ts-ignore used before JSX in handleExportPdf — TypeScript cannot type-check JSX from dynamically imported module; runtime works correctly
- [05-05]: Mark as Paid button conditions on invoice.status === 'sent' (not displayStatus) — overdue is a client-side display derivation of sent; DB condition is correct for UI gating
- [05-05]: useAddIncome hook called (not raw Supabase) in paid→income handler — hook also creates income_amount_history initial record; bypassing would break history tracking
- [05-05]: InvoicePdfDocument WARNING comment added — file must only be imported via dynamic import(); static import bundles ~450KB renderer into main chunk
- [05-06]: InvoiceEditPage uses value= (not defaultValue=) on Select — required for controlled re-render when form.reset() fires after data loads
- [05-06]: Redirect guard uses replace: true in navigate — prevents user pressing Back and landing on edit URL for a sent invoice
- [05-06]: Zod schema duplicated from InvoiceNewPage (not extracted) — shared extraction is out of scope per plan
- [06-01]: Outstanding invoices panel filters on inv.status === 'sent' (DB value), not displayStatus — avoids false negatives if overdue logic changes
- [06-01]: Revenue grouped by client_id then joined to clientMap (Object.fromEntries) — avoids extra query, O(1) lookup
- [06-01]: sortedRevenue sorted descending by converted total — highest-value client leads the list
- [06-01]: outstandingInvoices sorted ascending by due_date (nulls last) — most urgent invoice at top
- [06-01]: Skeleton component declared before default export (not inside) — prevents re-creation on each render
- [06-01]: Revenue per client uses convertCurrency() before summing — currency-safe aggregation across USD/TRY invoices
- [06-02]: No code changes required — 06-01 shipped correctly; all 7 browser verification checks passed without remediation

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 06-02-PLAN.md — Phase 6 human verification approved. DASH-01 and DASH-02 browser-verified. v1.1 Advanced Dashboard milestone complete.
Resume file: None
