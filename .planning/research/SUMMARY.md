# Research Summary: Advanced Mode (Freelancer Features)

**Synthesized:** 2026-02-23
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Consumed by:** gsd-roadmapper — phase planning and task generation

---

## Executive Summary

Balance Tracker is adding a freelancer "Advanced Mode" as a toggleable overlay on top of an existing personal finance tracker (React 18 + TypeScript + Supabase + TanStack React Query + Shadcn/ui). The feature is entirely additive — no existing functionality is removed or replaced. The existing stack is mature enough to absorb all required features with a single new runtime dependency: `@react-pdf/renderer` 4.x for client-side invoice PDF generation. Every other requirement (forms, validation, charts, currency, i18n, RLS patterns) is already served by packages and patterns in the codebase.

The recommended approach is a strict 5-phase build sequence: database and type foundations first, then mode infrastructure (context, routing guards, navigation), then client management (the central organizing entity), then invoice CRUD with PDF export, and finally the advanced analytics dashboard. This ordering is driven by hard dependency constraints — invoices cannot exist without clients, the analytics dashboard cannot be meaningful without invoice and client data, and all of it depends on the DB schema existing before hooks or UI are written. The architecture is clean: dedicated `src/pages/advanced/` and `src/components/advanced/` directories, lazy-loaded routes, a `ModeContext` backed by a new `user_settings.app_mode` column, and an `AdvancedRoute` guard analogous to the existing `ProtectedRoute`.

The most significant risks are not architectural — they are correctness traps: double-counting income if invoice payment auto-creates income records, stale P&L if historical exchange rates are not stored at payment time, and data loss if cascade delete behavior is wrong on the clients table. All three must be resolved in the database migration phase, before any UI is built. PDF RTL support for Arabic is a known hard problem; the pragmatic v1 decision is LTR-only PDFs with the limitation documented. The i18n surface area is large (~150+ new keys) and requires Arabic translation parity enforced by a new Vitest completeness test.

---

## Key Findings

### From STACK.md

**Core technology decisions — all HIGH confidence:**

| Technology | Decision | Rationale |
|---|---|---|
| `@react-pdf/renderer` 4.x | **Only new dependency** | Supports RTL/Arabic, React-native mental model, vector output, ~180KB gzipped |
| jsPDF / pdfmake / html2canvas | Explicitly rejected | Rasterized output, broken RTL, fragile coordinate layout, or oversized bundles |
| `user_settings.app_mode` column | Mode storage | Zero new infrastructure; DB persists across devices; consistent with all other preferences |
| `useAppMode()` hook | Mode access | No new Context needed; thin wrapper around existing `useUserSettings` |
| `localStorage` bootstrap | Flash prevention | Mirror ThemeContext pattern — fast initial read, DB is source of truth |
| Normalized `invoice_items` table | Line items storage | Enables SQL aggregations for P&L; JSONB columns rejected for this purpose |
| Nullable FK on `incomes`/`expenses` | Client linking | M:1 is correct model; polymorphic junction table would break FK integrity |

**Critical constraint:** `@react-pdf/renderer` (~180KB gzipped) must be lazy-loaded via dynamic `import()` on user action only. The app's bundle gzip budget is 350KB for the main entry chunk. Violation will break `scripts/check-bundle-budget.mjs`.

**Migration execution order (FK dependency chain):**
1. `user_settings.app_mode` column
2. `invoice_status` enum type
3. `clients` table
4. `invoices` table
5. `invoice_items` table
6. `ALTER TABLE incomes ADD COLUMN client_id`
7. `ALTER TABLE expenses ADD COLUMN client_id`
8. Regenerate `src/integrations/supabase/types.ts`

---

### From FEATURES.md

**Table Stakes (must-have for v1 — freelancers leave without these):**

| Feature | Complexity | Key Hidden Risks |
|---|---|---|
| Mode Toggle + Advanced Shell | Low | Flash prevention, race condition during mutation |
| Client Management (CRUD + archive) | Medium | Soft-delete pattern not in existing codebase |
| Invoice Creation (dynamic line items) | High | `useFieldArray` nested validation; atomic invoice number generation |
| Invoice Status Tracking | Medium | Overdue is derived state — must be computed on read, not stored |
| Invoice PDF Export | High | RTL PDF broken; bundle size; UI thread blocking |
| Revenue Per Client View | Medium | Historical exchange rates must be stored at payment time |
| Outstanding Amounts View | Low | Pure filtered view of existing invoice data |
| Profit & Loss Summary | Medium | Dual income source join (invoices + incomes table) |

**Differentiators (competitive advantage if included in v1):**

| Feature | Recommendation |
|---|---|
| Monthly Profit Trend Chart | **Build in v1** — Recharts already in stack, high value, low complexity |
| Expense Tagging Per Client | **Build in v1** — one nullable FK + form field extension |
| Recurring Invoice Templates | **Defer to post-v1** — manual duplicate acceptable; scheduling requires pg_cron |
| Client Portal / Sharing Link | **Defer to post-v1** — requires Edge Function, security model complexity |
| Time Tracking Integration | **Do not build in v1** — full sub-feature with product design questions |

**Anti-features (explicitly out of scope):**
- Email sending (requires third-party provider, compliance overhead)
- Tax calculation engine (jurisdiction-specific, legal risk)
- Multi-user / team accounts (requires architectural RLS rewrite)
- Subscription billing (requires payment processor integration)

**Critical complexity notes:**
- Invoice number generation is a concurrency problem, not a counter — requires Supabase RPC with `FOR UPDATE` lock or a PostgreSQL sequence
- Currency conversion accuracy for P&L requires storing `exchange_rate_at_payment` on the invoice at the moment of marking paid — cannot be corrected retroactively for existing records
- RTL PDF support: pragmatic v1 decision is LTR-only, with limitation documented for users

---

### From ARCHITECTURE.md

**Major components and their responsibilities:**

```
src/
  contexts/ModeContext.tsx          — AppMode state ('simple' | 'advanced'), isAdvanced derived bool
  components/AdvancedRoute.tsx      — Mode guard (redirect to '/' if not advanced)
  pages/advanced/
    AdvancedDashboard.tsx           — Separate page at /advanced (not merged into Dashboard.tsx)
    Clients.tsx                     — Client list + add
    ClientDetail.tsx                — Client detail, linked transactions, outstanding invoices
    Invoices.tsx                    — Invoice list
    InvoiceBuilder.tsx              — Create/edit, dynamic line items via useFieldArray
    InvoiceDetail.tsx               — View + status controls + PDF export
  components/advanced/
    RevenuePerClientWidget.tsx      — Client-side grouping of useIncomes() by client_id
    OutstandingInvoicesWidget.tsx   — Filtered view of useInvoices() for sent/overdue
    MonthlyProfitTrendWidget.tsx    — 6-month profit trend via Recharts
    ClientSelector.tsx              — Reusable dropdown (used in forms + InvoiceBuilder)
    InvoiceLineItems.tsx            — Line item editor (isolated state via useState)
    InvoiceStatusBadge.tsx          — Status pill component
  hooks/
    useClients.ts                   — CRUD following useIncomes.ts pattern
    useInvoices.ts                  — CRUD for invoices
    useClientTransactions.ts        — Fetch incomes+expenses by client_id
    useLinkTransactionToClient.ts   — Mutation: set client_id on income/expense row
```

**Key patterns to follow:**
- `ModeProvider` inserted in `App.tsx` provider chain: after `ThemeProvider`, before `CurrencyProvider`
- All advanced pages are `lazy()`-loaded — same pattern as existing pages
- `isAdvanced && <Component />` pattern for dashboard widgets (additive, not conditional replacement)
- Sidebar: `isAdvanced` drives a separate section with divider — simple-mode items always render unchanged
- Invoice-to-income coupling: **not automatic**. Marking invoice paid shows optional prompt "Record as income entry?" — user confirms. No FK between `invoices` and `incomes`. This is intentional to prevent double-counting.
- `AdvancedDashboard.tsx` is a separate page at `/advanced`, not merged into existing `Dashboard.tsx`

**Data flow for invoice paid → income (key correctness requirement):**
1. User marks invoice paid
2. UI prompts: "Record this payment as income?"
3. If confirmed: `useAddIncome()` called with pre-populated fields + `client_id` from invoice
4. Both `invoices.status` and `incomes` table updated; no FK linking them
5. Simple mode income list shows the record normally; P&L counts it via `incomes` table

---

### From PITFALLS.md

**Top pitfalls ranked by business impact:**

**CRITICAL — Must prevent in Phase 0/1 (before any UI):**

| # | Pitfall | Prevention |
|---|---------|------------|
| 4.2 | Invoice-income dual identity → double-counting P&L | Prompt-based optional income creation, never auto-create |
| 4.3 | `ON DELETE CASCADE` on clients wipes financial records | `ON DELETE SET NULL` on incomes/expenses FK; `ON DELETE RESTRICT` on invoices FK |
| 2.2 | PDF library in main bundle blows 350KB gzip budget | Lazy-load via dynamic `import()` on "Export PDF" click only |
| 5.1 | New tables ship without RLS enabled | Migration template: every new table must have `ENABLE ROW LEVEL SECURITY` + policy |
| 1.2 | Advanced routes accessible in Simple mode | `AdvancedRoute` guard wrapping all `/clients`, `/invoices`, `/advanced` routes |

**HIGH — Must prevent in Phase 1:**

| # | Pitfall | Prevention |
|---|---------|------------|
| 4.4 | React Query cache invalidation cascade | `src/lib/queryKeys.ts` factory before writing any new hooks |
| 4.1 | Nullable FK breaks query path consistency | New hooks `useClientIncomes(id)` for advanced; never modify `useIncomes()` |
| 1.1 | Mode flash/reset on refresh | `user_settings.app_mode` + localStorage bootstrap (ThemeContext pattern) |
| 5.3 | RLS modification on incomes/expenses breaks simple mode | Rule: never modify existing RLS policies |
| 3.1 | Simple mode sidebar regression | Extract baseline sidebar items as immutable; advanced section is purely additive |

**MEDIUM — Must prevent in Phase 2:**

| # | Pitfall | Prevention |
|---|---------|------------|
| 2.1 | Arabic RTL broken in PDF | Register Noto Sans Arabic font in `@react-pdf/renderer`; test before committing to library |
| 6.1 | Advanced mode ships English-only | Vitest translation completeness test (EN vs AR key parity) before writing freelancer strings |
| 6.3 | Financial terminology mistranslated | Arabic accounting glossary reviewed by domain-knowledgeable native speaker before keys written |
| 2.4 | Currency formatting inconsistent in PDF | Extract `formatCurrency()` to pure function; PDF utility calls it with explicit locale/currency args |

**Phase-wise summary:**
- Phase 1 must-haves: 8 items (mode column, queryKeys.ts, route guard, schema + RLS, cascade behavior, invoice-income rule)
- Phase 2 must-haves: 7 items (PDF library tested for RTL, lazy-loaded, currency pure functions, separate AdvancedDashboard page, i18n completeness test, terminology glossary, RTL review process)

---

## Implications for Roadmap

### Suggested Phase Structure (5 phases)

**Phase 0: Database & Type Foundation**
- **Rationale:** All subsequent phases depend on TypeScript types generated from Supabase schema. Zero UI. Zero hooks. Only migrations and type regeneration. Must complete fully before Phase 1 begins.
- **Deliverables:** `user_settings.app_mode` column, `clients` table, `invoices` table, `invoice_items` table, `invoice_status` enum, `incomes.client_id` + `expenses.client_id` nullable FKs, updated `src/integrations/supabase/types.ts`, updated `DEFAULT_USER_SETTINGS`
- **Pitfalls to avoid:** RLS on every new table (5.1), correct cascade behavior defined (4.3), invoice-income linkage rule documented (4.2)
- **Research flag:** Standard patterns — no deeper research needed. STACK.md provides exact SQL.

---

**Phase 1: Mode Infrastructure**
- **Rationale:** The `AdvancedRoute` guard and `ModeContext` must exist before any advanced page is built. Sidebar modifications happen here — this is the highest regression risk to simple mode. Establishing `queryKeys.ts` here prevents cache invalidation chaos later.
- **Deliverables:** `ModeContext` + `useMode()` hook, `ModeProvider` in `App.tsx`, `AdvancedRoute` guard, Sidebar advanced section (additive), Mode toggle in Settings, `src/lib/queryKeys.ts` factory
- **Pitfalls to avoid:** Mode flash/reset (1.1), toggle race condition (1.3), sidebar regression (3.1), advanced routes without guards (1.2)
- **Features from FEATURES.md:** Mode Toggle UI, Advanced Dashboard Shell (empty)
- **Research flag:** Standard patterns — well-documented in ARCHITECTURE.md.

---

**Phase 2: Client Management**
- **Rationale:** Clients are the central dependency for all invoice features. Client management is medium complexity and delivers standalone value (contact organization). Must complete before Phase 3.
- **Deliverables:** `useClients.ts` hook family, `ClientForm` component, `Clients.tsx` list page, `ClientDetail.tsx` detail page, `useClientTransactions.ts`, `ClientSelector.tsx` reusable component, client routes in `App.tsx`
- **Pitfalls to avoid:** Nullable FK query path consistency (4.1), cache invalidation cascade (4.4)
- **Features from FEATURES.md:** Client Management (table stakes)
- **Research flag:** Standard patterns — CRUD follows existing useIncomes.ts pattern exactly.

---

**Phase 3: Transaction-to-Client Linking**
- **Rationale:** `ClientSelector` from Phase 2 enables this. Linking existing income/expense records to clients unlocks P&L per client and populates the revenue widget. Best done before invoice phase so client detail pages show real data.
- **Deliverables:** `useLinkTransactionToClient.ts`, Income form + Expense form extended with optional `ClientSelector` field (Advanced mode only), retroactive linking action in row menus
- **Pitfalls to avoid:** Never modify existing `useIncomes()`/`useExpenses()` hooks (4.1), never modify existing RLS (5.3)
- **Features from FEATURES.md:** Expense Tagging Per Client (differentiator delivered early since schema is already in place)
- **Research flag:** Standard patterns — no deeper research needed.

---

**Phase 4: Invoices + PDF Export**
- **Rationale:** Invoices are the highest-complexity deliverable. PDF library decision must happen before UI is built. This phase includes the full invoice lifecycle (creation, status tracking, PDF export) and the outstanding amounts view.
- **Deliverables:** PDF library selected and RTL-tested, `useInvoices.ts` hook family, `InvoiceLineItems.tsx`, `InvoiceStatusBadge.tsx`, `InvoiceBuilder.tsx`, `Invoices.tsx` list, `InvoiceDetail.tsx` with PDF export, Outstanding Amounts View, invoice routes in `App.tsx`, i18n completeness test, Arabic terminology glossary
- **Pitfalls to avoid:** PDF bundle size (2.2), PDF RTL (2.1), UI thread blocking (2.3), currency formatting in PDF (2.4), English-only shipping (6.1), financial terminology translation (6.3), advanced settings bleed (3.3)
- **Features from FEATURES.md:** Invoice Creation (high complexity), Invoice Status Tracking, Invoice PDF Export, Outstanding Amounts View (all table stakes)
- **Research flag:** PDF library RTL testing needs hands-on validation before committing. Run `@react-pdf/renderer` against an Arabic invoice template. This is the one area where the research acknowledges uncertainty.

---

**Phase 5: Advanced Dashboard + P&L**
- **Rationale:** All data sources (clients, linked transactions, invoices) must exist before analytics are meaningful. This phase assembles the summary views and trend visualizations. Low-complexity given Recharts already in stack.
- **Deliverables:** `RevenuePerClientWidget.tsx`, `OutstandingInvoicesWidget.tsx`, `MonthlyProfitTrendWidget.tsx`, `AdvancedDashboard.tsx` page at `/advanced`, P&L Summary page, Monthly Profit Trend Chart, `/advanced` route in `App.tsx`
- **Pitfalls to avoid:** Advanced dashboard inflating Dashboard.tsx (3.2), P&L exchange rate accuracy (must use `exchange_rate_at_payment` stored in Phase 4), RTL layout in new components (6.2)
- **Features from FEATURES.md:** Revenue Per Client (table stakes), P&L Summary (table stakes), Monthly Profit Trend Chart (differentiator)
- **Research flag:** P&L exchange rate accuracy — confirm that `exchange_rate_at_payment` column is implemented in Phase 4 before this phase calculates historical P&L.

---

### Research Flags by Phase

| Phase | Research Flag | Reason |
|---|---|---|
| Phase 0 | Skip — standard patterns | SQL is exact in STACK.md; no unknowns |
| Phase 1 | Skip — standard patterns | ModeContext mirrors ThemeContext exactly |
| Phase 2 | Skip — standard patterns | CRUD follows useIncomes.ts exactly |
| Phase 3 | Skip — standard patterns | Form extension is trivial |
| Phase 4 | **Needs validation** | RTL PDF rendering with `@react-pdf/renderer` + Arabic Noto Sans font — test before building InvoiceBuilder UI |
| Phase 5 | Skip — standard patterns | Recharts aggregation follows existing dashboard patterns |

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | Single new dependency (`@react-pdf/renderer`). All other requirements covered by existing packages. Confident in all decisions. |
| Features | HIGH | Feature set is well-defined and scoped. Complexity ratings are calibrated. Anti-features are clearly justified. |
| Architecture | HIGH | Build order is enforced by concrete FK dependencies, not guesswork. Component structure mirrors established patterns. |
| Pitfalls | HIGH | 20 specific pitfalls identified with concrete prevention strategies. Phase placement is specific. |
| PDF RTL Support | MEDIUM | `@react-pdf/renderer` claims RTL support; needs hands-on validation with Noto Sans Arabic before InvoiceBuilder UI is built. v1 fallback (LTR-only) is documented. |
| Invoice Number Generation | MEDIUM | Concurrency safety requires Supabase RPC. Implementation detail not fully specified — needs a concrete RPC function designed before implementation. |
| Arabic Financial Terminology | MEDIUM | Glossary review required before translation keys are written. This is a human-review dependency, not a technical uncertainty. |

**Overall Confidence: HIGH**
The architecture is not exploratory — it builds directly on well-established patterns already present in the codebase. The main risks are correctness traps (data integrity, double-counting, historical exchange rates) that are all resolved at the schema migration level if addressed first.

---

## Gaps to Address

1. **Supabase RPC for atomic invoice number generation** — The pitfall of duplicate invoice numbers on concurrent inserts is identified, but the exact RPC function implementation is not specified in any research file. A `generate_invoice_number(user_id uuid)` function with `SELECT ... FOR UPDATE` semantics needs to be designed before Phase 4 implementation begins.

2. **Logo upload (Supabase Storage)** — FEATURES.md mentions an optional user logo on invoices stored in Supabase Storage (`user_id/logo.png`). Storage is not currently used in the app. If logo support is in scope for v1, a Storage bucket with appropriate access policy needs to be provisioned and the upload flow designed. If deferred, invoice PDF should gracefully omit the logo.

3. **Overdue status computation scope** — STACK.md recommends computing `overdue` derived from `status='sent' AND due_date < CURRENT_DATE`. ARCHITECTURE.md shows this done client-side. At scale, this should move to a Supabase RPC or database view. The hook should be designed to accept either approach from day one (the FEATURES.md "at scale" note). This is not urgent for v1 but the hook interface should not assume client-side computation is permanent.

4. **`invoice_number_prefix` + `last_invoice_sequence` in `user_settings`** — FEATURES.md mentions these fields in `user_settings` as a dependency for invoice creation. STACK.md's migration section does not include them. Either they belong in `user_settings` (requiring a migration) or they are computed from `COUNT(invoices)` + a user-defined prefix in Settings. This needs resolution before Phase 4.

5. **RTL PDF validation outcome** — If `@react-pdf/renderer` fails Arabic RTL validation in Phase 4, the fallback is LTR-only PDFs with a user-visible notice. This decision must be made and documented before InvoiceBuilder UI ships, not after.

---

## Sources

| Research File | Key Claims | Confidence |
|---|---|---|
| `STACK.md` | `@react-pdf/renderer` 4.x is the correct PDF library; all other requirements are covered by existing packages; exact SQL for all migrations; 7-step migration execution order | HIGH |
| `FEATURES.md` | Feature dependency graph; complexity ratings; anti-features with rationale; deceptively simple / genuinely hard callouts | HIGH |
| `ARCHITECTURE.md` | Provider chain insertion point; directory structure; 5-phase build order; component responsibilities; invoice-to-income intentional loose coupling | HIGH |
| `PITFALLS.md` | 20 specific pitfalls across 6 risk zones; phase-wise prevention strategies; Phase 1 and Phase 2 must-have checklists | HIGH |

---

*Synthesis complete: 2026-02-23. Ready for roadmap generation.*
