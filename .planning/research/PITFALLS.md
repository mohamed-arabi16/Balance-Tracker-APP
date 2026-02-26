# PITFALLS — Adding Freelancer Advanced Mode to Balance Tracker

**Research Type:** Project Research — Pitfalls dimension
**Milestone:** Subsequent — Adding Advanced Mode (client management, invoicing, P&L)
**Date:** 2026-02-23
**Downstream Consumer:** Roadmap/planning to prevent mistakes during implementation

---

## Overview

This document catalogues the specific pitfalls likely to emerge when adding an Advanced (Freelancer) Mode to the existing Balance Tracker — a React 18 + TypeScript + Supabase + TanStack React Query app. The six primary risk zones are: mode state complexity, client-side PDF generation, dual-mode UI divergence, relational data model migration, Supabase RLS policy additions, and i18n coverage for new features.

Each pitfall includes warning signs, a prevention strategy, and the phase where it should be addressed.

---

## 1. Mode State Complexity

### 1.1 Mode State Stored in Wrong Layer

**What goes wrong:** Storing `isAdvancedMode` in local React state (component or context) means the mode resets on refresh, causing flicker and confusion. Alternatively, storing it only in `user_settings` without a local cache means every page load waits for a round-trip query before rendering the correct UI shell — the sidebar, nav items, and dashboard tiles all render incorrectly for a moment.

**Warning signs:**
- Sidebar flickers between simple and advanced layouts on hard refresh
- Mode toggle state lost when user opens a new browser tab
- Components conditionally rendering based on `isAdvancedMode` before `user_settings` has loaded

**Prevention strategy:**
- Store `advanced_mode` as a boolean column in `user_settings` (consistent with how `theme`, `language`, and `net_worth_calculation` are already persisted)
- Expose `isAdvancedMode` from `useUserSettings()` hook, not a separate context
- During the loading window, render a neutral layout that works for both modes (skeleton state), not a mode-specific one
- Regenerate `src/integrations/supabase/types.ts` after adding the column so TypeScript catches mismatches at compile time

**Phase:** Database migration + `useUserSettings` hook extension should be Phase 1 of the milestone, before any UI work begins.

---

### 1.2 Mode-Dependent Routing Without Guards

**What goes wrong:** Advanced mode routes (`/clients`, `/invoices`, `/advanced-dashboard`) are added to the router unconditionally. A Simple mode user navigating directly to `/invoices` via URL either sees a broken page or crashes because the hooks attempt to query tables that have no data — or in a worst case, tables that RLS denies.

**Warning signs:**
- Direct URL access to advanced routes works for simple-mode users
- React Query throws an unhandled error when `useClients()` is called on a page a simple-mode user can reach

**Prevention strategy:**
- Wrap advanced routes in a `RequiresAdvancedMode` guard analogous to the existing `ProtectedRoute` component
- The guard reads from `useUserSettings()` and redirects to `/dashboard` if `isAdvancedMode` is false
- Do not use conditional route registration (which Vite's lazy-loading does not support cleanly) — always register the routes but gate at the component level

**Phase:** Phase 1 — routing guard must exist before advanced pages ship.

---

### 1.3 Mode Toggle Race Condition During Settings Mutation

**What goes wrong:** The mode toggle fires a `useUpdateUserSettings()` mutation. While the mutation is in-flight, the user navigates. React Query's optimistic cache update is reverted on error, causing the UI to snap back — but the user has already navigated to an advanced-mode page. The page is now in an inconsistent state.

**Warning signs:**
- Mode toggle button is clickable during pending mutation
- UI mode and database mode diverge after a network error during toggle

**Prevention strategy:**
- Disable the mode toggle button while the settings mutation is pending (`isPending` from `useMutation`)
- Use optimistic updates carefully: set the optimistic value and revert only in `onError`, ensuring the route guard re-checks after revert
- Add a toast notification on toggle failure ("Could not save mode preference — please try again")

**Phase:** Phase 1 — implement alongside mode persistence.

---

## 2. Client-Side PDF Generation

### 2.1 Arabic RTL Text Rendering Broken in PDF

**What goes wrong:** The two most common client-side PDF libraries — `jsPDF` and `@react-pdf/renderer` — have incomplete or broken RTL text support. Arabic characters either render as disconnected glyphs, display LTR, or are omitted entirely. This app already supports Arabic and RTL layout (i18n in `src/i18n/index.ts` covers Arabic; Tailwind RTL classes are used). PDFs must match.

**Warning signs:**
- Arabic invoice text appears as reversed disconnected letters in the PDF preview
- The library's text alignment is always LTR regardless of `dir="rtl"` on the DOM

**Prevention strategy:**
- Evaluate `@react-pdf/renderer` first — it has explicit `dir` support and font embedding but requires registering an Arabic font (e.g., Noto Sans Arabic) via `Font.register()`
- Test Arabic rendering before committing to a PDF library; do not assume DOM rendering fidelity
- If `@react-pdf/renderer` proves insufficient, fall back to the `html2canvas` + `jsPDF` approach (screenshot the DOM), which preserves RTL but produces a raster image rather than selectable text
- Document the chosen approach and its RTL limitations in CONVENTIONS.md

**Phase:** Phase 2 (PDF export feature) — library selection must happen before invoice UI is built, not after.

---

### 2.2 Bundle Size Blowup from PDF Library

**What goes wrong:** `@react-pdf/renderer` adds ~350–500KB gzipped to the bundle. `jsPDF` adds ~200KB. The app's current bundle budget warning limit is 650KB per chunk (set in `vite.config.ts`). Adding a PDF library to the main bundle blows this budget immediately and degrades initial load for all users — including simple-mode users who will never generate a PDF.

**Warning signs:**
- `npm run check:bundle` (the `scripts/check-bundle-budget.mjs` script) starts failing after the PDF library is added
- The PDF library appears in the initial JavaScript waterfall in browser DevTools

**Prevention strategy:**
- Lazy-load the PDF generation module: only import the library when the user clicks "Export PDF", using dynamic `import()`
- This keeps the PDF library in a separate Vite chunk that is never loaded for simple-mode users
- Example pattern: `const { generateInvoicePDF } = await import('@/lib/invoicePdf')` inside the button handler
- Run `npm run check:bundle` in CI before merging the PDF feature branch

**Phase:** Phase 2 — enforce lazy-loading as an architectural constraint when the PDF feature is planned, not as a fix after the fact.

---

### 2.3 PDF Generation Blocking the UI Thread

**What goes wrong:** PDF generation is CPU-intensive. Running it on the main thread freezes the UI for 1–3 seconds for complex invoices. This is especially problematic on mobile (the app is a PWA used on mobile). Users perceive the app as crashed.

**Warning signs:**
- "Export PDF" button click causes the page to freeze visibly
- Browser DevTools shows a long task (>50ms) on the main thread during PDF generation

**Prevention strategy:**
- Show a loading spinner immediately on button click, before generation starts
- For `@react-pdf/renderer`, the `pdf()` call is async and returns a Blob — chain a `.then()` to trigger the download, keeping the UI responsive
- If generation still blocks, move it to a Web Worker; the existing service worker infrastructure (`public/sw.js`) shows the team is comfortable with worker patterns
- Test PDF generation on a mid-range Android device, not just desktop

**Phase:** Phase 2 — performance test on mobile is a go/no-go gate before shipping PDF export.

---

### 2.4 Inconsistent Number and Currency Formatting in PDF

**What goes wrong:** The app uses `formatCurrency()` from `src/lib/currency.ts` and `CurrencyContext` for display. PDF generation happens outside the React tree (in a utility function or worker), so `useCurrency()` and `useAuth()` hooks are unavailable. Developers reach for `Intl.NumberFormat` directly but use different locale assumptions, producing PDFs where numbers are formatted differently from the UI (e.g., `1,234.56` in UI vs `1234.56` in PDF).

**Warning signs:**
- Currency values in PDF do not match the values shown on the invoice preview in the browser
- Numbers in exported PDF ignore the user's selected currency or locale

**Prevention strategy:**
- Extract currency formatting into a pure function in `src/lib/currency.ts` that takes locale and currency code as parameters (no hook dependency)
- The PDF generation utility calls this pure function directly, with locale and currency passed as arguments from the calling React component
- This also makes the formatting logic independently testable (no React render environment needed)

**Phase:** Phase 2 — enforce the pure-function extraction pattern when building the PDF utility.

---

## 3. Dual-Mode UI

### 3.1 Simple Mode Regression When Adding Advanced-Mode UI

**What goes wrong:** The Sidebar (`src/components/layout/Sidebar.tsx`) and navigation are modified to add advanced-mode links. A conditional rendering bug (`isAdvancedMode` check in the wrong place) causes simple-mode users to see broken navigation, missing icons, or broken route links. This is the most visible regression risk because it affects every page, every session.

**Warning signs:**
- Manual testing in simple mode after every sidebar change is skipped
- The sidebar component grows to conditionally render large blocks without extracting to separate components

**Prevention strategy:**
- Treat simple mode as the "baseline" and advanced mode as additive — never remove or wrap existing simple-mode nav items in advanced-mode conditionals
- Extract `<SimpleModeSidebar>` and `<AdvancedModeSidebar>` as separate components that share a common base, rather than embedding conditionals throughout a single component
- Add a Vitest test that renders `Sidebar.tsx` with `isAdvancedMode=false` and asserts all existing simple-mode routes are present (this is the regression test the codebase currently lacks for page components)

**Phase:** Phase 1 — the sidebar/navigation pattern decision must be made before any advanced UI is built.

---

### 3.2 Advanced Dashboard Conflicts with Existing Dashboard

**What goes wrong:** The existing `src/pages/Dashboard.tsx` is already 500+ lines and already loads all hooks on mount (the dashboard renders `useIncomes`, `useExpenses`, `useDebts`, `useAssets` simultaneously — a known concern in CONCERNS.md). Adding advanced-mode tiles (revenue per client, outstanding invoices, P&L trend) to the same component creates an unmaintainable file and adds more unconditional hook calls.

**Warning signs:**
- `Dashboard.tsx` grows past 700 lines
- Advanced-mode hooks (`useClients`, `useInvoices`) are called unconditionally even when `isAdvancedMode` is false

**Prevention strategy:**
- Create `src/pages/AdvancedDashboard.tsx` as a separate page — route `/advanced-dashboard` — rather than conditionally rendering inside `Dashboard.tsx`
- The mode toggle redirects the user to the appropriate dashboard; both dashboards exist independently
- This respects the existing architecture's "one responsibility per page" convention and avoids making the already-large Dashboard.tsx worse
- Advanced-mode hooks only load when the advanced dashboard page mounts, eliminating unnecessary queries for simple-mode users

**Phase:** Phase 2 — plan the advanced dashboard as a separate page from the start.

---

### 3.3 Settings Page Advanced Mode Preferences Bleed into Simple Mode UX

**What goes wrong:** The Settings page (`src/pages/Settings.tsx`) currently manages theme, currency, language, and net worth calculation. Adding advanced-mode settings (default invoice terms, client currency defaults, etc.) to the same settings page without gating them causes simple-mode users to see irrelevant settings. This creates confusion and trust erosion ("why does my finance app ask about invoice due dates?").

**Warning signs:**
- Simple-mode users contact support asking what "invoice payment terms" means
- Settings page content is not conditionally rendered based on mode

**Prevention strategy:**
- Add a dedicated "Advanced Settings" section in Settings, rendered only when `isAdvancedMode` is true
- Alternatively, add an "Advanced" tab to Settings using the existing Shadcn `Tabs` component
- Gate the section with the same `isAdvancedMode` check pattern used for navigation

**Phase:** Phase 2 — implement alongside advanced settings, not as a settings retrofit.

---

## 4. Relational Data Model — Adding Clients to a Flat Transaction Schema

### 4.1 Nullable FK Makes Client Linking Inconsistent Across Queries

**What goes wrong:** The plan correctly uses a nullable `client_id` FK on `incomes` and `expenses` (so existing transactions remain valid without a client). However, every query that fetches transactions now has two paths: with client context and without. Developers forget to handle the null case in one hook, causing client-linked transactions to appear in the wrong aggregate or be excluded from P&L calculations when they should be included.

**Warning signs:**
- Client-linked income entries appear in the simple-mode income list but not in the advanced P&L summary
- A new `useIncomes()` query with a `client_id` join returns different totals than the old query without the join

**Prevention strategy:**
- Never modify the existing `useIncomes()`, `useExpenses()` hooks — they must continue to query all transactions regardless of `client_id` (simple mode must be unchanged)
- Create new hooks `useClientIncomes(clientId)` and `useClientExpenses(clientId)` for advanced mode that filter by `client_id`
- P&L calculations use the client-specific hooks; simple mode aggregate dashboards use the existing hooks
- Add a TypeScript type guard: `type LinkedTransaction = Transaction & { client_id: string }` to distinguish linked from unlinked at the type level

**Phase:** Phase 1 (schema design) — this pattern must be established in the data model design, not discovered during implementation.

---

### 4.2 Invoice-Transaction Dual Identity Creates Accounting Confusion

**What goes wrong:** An invoice represents money owed. An income entry represents money received. If marking an invoice as "paid" automatically creates an income entry, and the user also manually adds an income entry for the same payment, the transaction is double-counted in the P&L and net worth dashboard.

**Warning signs:**
- Net worth increases by 2x the invoice amount when an invoice is marked paid
- The simple-mode income total mysteriously increases after invoice operations

**Prevention strategy:**
- Make the relationship explicit: an invoice has a `status` of `unpaid`/`paid` and optionally links to an `income_id` (the payment record)
- When marking an invoice paid: prompt the user "Create an income entry for this payment?" rather than auto-creating one silently
- Simple mode income list: never show auto-created invoice payments without a clear label
- Document this business rule in the schema migration as a SQL comment

**Phase:** Phase 1 (data model design) — the invoice-to-income linkage semantics must be resolved before the schema is created.

---

### 4.3 Cascade Deletion of Client Deletes All Client-Linked Transactions

**What goes wrong:** If `clients` table has `ON DELETE CASCADE` to transactions (income/expenses), deleting a client permanently deletes all the user's financial records linked to that client. This is catastrophic data loss. If `ON DELETE RESTRICT` is used without UI guidance, the user gets a cryptic foreign key error when trying to delete a client who has linked transactions.

**Warning signs:**
- "Delete client" button works silently with no confirmation about linked transactions
- Supabase returns a `FOREIGN KEY VIOLATION` error that the UI doesn't handle

**Prevention strategy:**
- Use `ON DELETE SET NULL` on the `client_id` FK in `incomes` and `expenses` — deleting a client unlinks its transactions but does not delete them
- The UI should confirm: "Deleting this client will unlink 12 transactions. They will remain in your records without a client. Continue?"
- For `invoices`, use `ON DELETE RESTRICT` — the user must archive or reassign invoices before deleting a client
- Define and test cascade behavior in the migration file before the feature goes to production

**Phase:** Phase 1 — cascade behavior must be in the migration, not a post-launch fix.

---

### 4.4 React Query Cache Invalidation Cascade Becomes Unmanageable

**What goes wrong:** The existing pattern invalidates `['incomes', user.id]` after income mutations. After adding client linking, mutations that affect incomes (e.g., linking an income to a client) must also invalidate `['clients', clientId]`, `['client-incomes', clientId]`, and `['pl-summary', clientId]`. Developers forget one cache key. The UI shows stale data silently — the client's P&L shows the old total, but the income list shows the new amount.

**Warning signs:**
- After linking a transaction to a client, the client's revenue figure does not update immediately
- Multiple `queryClient.invalidateQueries` calls scattered across different mutation hooks without a documented invalidation map

**Prevention strategy:**
- Centralize cache key definitions: create `src/lib/queryKeys.ts` with a factory for all query keys (`queryKeys.incomes(userId)`, `queryKeys.clientIncomes(clientId)`, etc.)
- Document the invalidation dependency graph: "mutating an income also invalidates these keys"
- Each mutation hook explicitly lists all keys it must invalidate in a comment
- Add a test that a mutation invalidates the expected cache keys (using `vi.spyOn(queryClient, 'invalidateQueries')`)

**Phase:** Phase 1 — establish the `queryKeys.ts` pattern before writing any new hooks.

---

## 5. Supabase RLS Policy Additions

### 5.1 New Tables Ship Without RLS Enabled

**What goes wrong:** RLS is not enabled by default on new Supabase tables. A developer adds the `clients` or `invoices` table via a migration that creates the table without explicitly enabling RLS. All user data is now publicly readable by any authenticated user who knows the table name.

**Warning signs:**
- The migration SQL for `clients` does not contain `ALTER TABLE clients ENABLE ROW LEVEL SECURITY`
- No PR review checklist item for "new table has RLS enabled and tested"

**Prevention strategy:**
- Every migration SQL file for a new table must include:
  1. `CREATE TABLE ...`
  2. `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
  3. `CREATE POLICY "Users can only access their own <table>" ON <table> FOR ALL USING (user_id = auth.uid());`
- Add a comment block at the top of each migration: `-- RLS: enabled, policy: user_id = auth.uid()`
- Test RLS by querying the table with a second test user's JWT and asserting an empty result

**Phase:** Phase 1 — the migration template must enforce this before any table is created.

---

### 5.2 Invoice RLS Must Scope to Client Owner, Not Just Invoice Owner

**What goes wrong:** An invoice is linked to a client. If RLS on `invoices` only checks `invoices.user_id = auth.uid()`, it is correct. But if the join query fetches client data alongside invoice data in a single Supabase query (using `select('*, clients(*)')`), the client RLS policy must also allow the read. If client RLS is misconfigured, the joined data returns null client rows silently, breaking the invoice display without an error.

**Warning signs:**
- Invoice list shows client name as "Unknown" even though the client exists
- Supabase query with embedded join returns `null` for the client relationship field

**Prevention strategy:**
- Test join queries (`invoices` with embedded `clients`) explicitly in a migration test or Supabase Studio
- Keep RLS policies simple: `user_id = auth.uid()` on both `clients` and `invoices` independently
- Do not rely on implicit join authorization — always test that the joined result matches expectations for both the owning user and a different user

**Phase:** Phase 1 — RLS testing for join queries must be part of the schema migration acceptance criteria.

---

### 5.3 RLS Policy Added to Existing Tables (incomes, expenses) Breaks Simple Mode

**What goes wrong:** To support client-transaction linking, a new policy or modification is made to the existing `incomes` or `expenses` RLS policies (e.g., adding a policy for "allow read if transaction is linked to a client you own"). An error in the policy expression causes all income/expense queries to return empty results for simple-mode users.

**Warning signs:**
- After a migration that touches `incomes` RLS, the income list returns no rows for existing users
- Tests for `useIncomes()` pass locally but fail in the staging environment after migration

**Prevention strategy:**
- Do NOT modify existing RLS policies on `incomes` or `expenses` — the client relationship is managed entirely through the new `clients` table and nullable FKs
- New policies are additive only (add `SELECT` policy for client context queries if needed), never replacing the base `user_id = auth.uid()` policy
- Run the existing simple-mode smoke test (income list shows existing records) against staging immediately after any RLS migration

**Phase:** Phase 1 — establish the rule "never modify existing RLS policies" as a documented constraint.

---

## 6. i18n Coverage for New Features

### 6.1 Advanced Mode UI Ships with English-Only Text

**What goes wrong:** The existing i18n file (`src/i18n/index.ts`) is 680 lines of a single large translation object — already flagged as fragile in CONCERNS.md. New advanced-mode strings (client names, invoice labels, P&L terminology) are added to the English object but the Arabic object is not updated. Arabic-language users see English text mixed into their Arabic UI, or worse, the i18next key literal (e.g., `"freelancer.invoices.markAsPaid"`) is displayed instead of a readable string.

**Warning signs:**
- Arabic UI shows raw key strings like `freelancer.clients.add` instead of translated text
- No translation completion check runs in CI
- The Arabic developer (or reviewer) does not manually test the advanced mode in Arabic before shipping

**Prevention strategy:**
- Add all Arabic translations simultaneously with English — never commit a new English key without the Arabic equivalent in the same PR
- Add a translation completeness test: a Vitest test that compares the key sets of `en` and `ar` translation objects and fails if they differ
- This test is straightforward to write since translations are plain objects in `src/i18n/index.ts`
- Consider splitting `src/i18n/index.ts` into domain files (`i18n/freelancer.ts`, `i18n/common.ts`) as part of this milestone — the 680-line file will grow by ~150+ keys for the freelancer mode

**Phase:** Phase 2 — the translation completeness test must be added before freelancer strings are written, so it catches missing keys automatically.

---

### 6.2 RTL Layout Breaks for Advanced Mode Components

**What goes wrong:** New advanced-mode components (invoice form, client list, P&L table) are built without RTL testing. Tailwind's RTL utility classes (`rtl:`, `ltr:`) are used inconsistently, or `flex-row` layouts appear mirrored in Arabic, or PDF invoice layout is LTR-only.

**Warning signs:**
- Client management page looks correct in English but has misaligned labels, reversed button order, or overlapping text in Arabic
- No RTL screenshot test or manual check in the development workflow

**Prevention strategy:**
- Test every new page component in both English (LTR) and Arabic (RTL) during development — add `"lang": "ar"` to the browser's user settings test to force RTL
- Use the existing `dir` attribute pattern established in the codebase — do not invent new RTL workarounds
- For the invoice PDF, explicitly set `dir` on the PDF component root and test with an Arabic client name
- Add a CI note: "Freelancer mode components require RTL review before merge"

**Phase:** Phase 2 — RTL review is a mandatory review criterion for each advanced-mode PR.

---

### 6.3 Financial Terminology Does Not Translate Directly

**What goes wrong:** "Profit & Loss", "Invoice", "Net Revenue", "Outstanding Balance" are English accounting terms. Direct translation to Arabic may be technically correct but colloquially unfamiliar to Arabic-speaking freelancers. Using machine translation or Google Translate for financial terminology produces awkward or confusing labels.

**Warning signs:**
- Arabic-speaking test users cannot identify what "P&L" means in the Arabic translation
- Translation keys are added using Google Translate without domain review

**Prevention strategy:**
- Review financial terminology translations with a native Arabic speaker who has accounting domain knowledge
- Use a glossary approach: document the canonical Arabic translation for each accounting term before writing any translation keys
- Prefer simpler, commonly understood terms where possible ("What clients owe you" instead of "Outstanding Receivables")

**Phase:** Phase 2 — terminology review is a pre-implementation task before translation keys are created.

---

## Summary Table

| # | Pitfall | Zone | Phase |
|---|---------|------|-------|
| 1.1 | Mode state in wrong layer causes flash/reset | Mode State | Phase 1 |
| 1.2 | Advanced routes accessible without mode guard | Mode State | Phase 1 |
| 1.3 | Toggle race condition during mutation | Mode State | Phase 1 |
| 2.1 | Arabic RTL broken in PDF output | PDF Generation | Phase 2 |
| 2.2 | PDF library bloats main bundle | PDF Generation | Phase 2 |
| 2.3 | PDF generation freezes UI thread | PDF Generation | Phase 2 |
| 2.4 | Currency formatting inconsistent in PDF | PDF Generation | Phase 2 |
| 3.1 | Simple mode sidebar regresses when advanced nav added | Dual-Mode UI | Phase 1 |
| 3.2 | Advanced dashboard inflates existing Dashboard.tsx | Dual-Mode UI | Phase 2 |
| 3.3 | Advanced settings bleed into simple mode Settings page | Dual-Mode UI | Phase 2 |
| 4.1 | Nullable FK makes query paths inconsistent | Data Model | Phase 1 |
| 4.2 | Invoice-income dual identity causes double-counting | Data Model | Phase 1 |
| 4.3 | Cascade deletion wipes client-linked transactions | Data Model | Phase 1 |
| 4.4 | React Query cache invalidation cascade unmanageable | Data Model | Phase 1 |
| 5.1 | New tables ship without RLS enabled | Supabase RLS | Phase 1 |
| 5.2 | Invoice-client join breaks if client RLS misconfigured | Supabase RLS | Phase 1 |
| 5.3 | RLS modification on existing tables breaks simple mode | Supabase RLS | Phase 1 |
| 6.1 | Advanced mode ships English-only (missing Arabic) | i18n | Phase 2 |
| 6.2 | RTL layout broken in new advanced-mode components | i18n | Phase 2 |
| 6.3 | Financial terminology does not translate correctly | i18n | Phase 2 |

---

## Phase 1 Must-Haves (Before Any UI)

1. `advanced_mode` column added to `user_settings` table with migration
2. `queryKeys.ts` query key factory established
3. `RequiresAdvancedMode` route guard component built
4. Data model design: `clients`, `invoices` tables with nullable FKs on `incomes`/`expenses`
5. Cascade/delete behavior defined (`ON DELETE SET NULL` for transaction links)
6. RLS policies written and tested for all new tables
7. Rule documented: never modify existing `incomes`/`expenses` RLS policies
8. Invoice-income linkage business rule documented and agreed

## Phase 2 Must-Haves (Before Feature Ships)

1. PDF library selected and RTL-tested before invoice UI is built
2. PDF library lazy-loaded via dynamic `import()`
3. Currency formatting extracted to pure functions for PDF utility
4. `AdvancedDashboard.tsx` as a separate page, not merged into `Dashboard.tsx`
5. Translation completeness test (EN vs AR key parity) running in CI
6. Arabic financial terminology glossary reviewed before translation keys are written
7. RTL review required for every advanced-mode component PR

---

*Pitfalls research: 2026-02-23*
