# Architecture Research: Dual-Mode UI Extension

**Research Date:** 2026-02-23
**Scope:** Adding Advanced Mode (freelancer features) to the existing React 18 + TypeScript + Supabase SPA

---

## 1. ModeContext Design

### Where Mode State Lives

The mode toggle follows the exact same pattern as `ThemeContext` and `CurrencyContext`: a new `ModeContext` at `src/contexts/ModeContext.tsx`. This is the correct placement because:

- Mode is a global UI concern that gate-keeps entire pages and navigation sections — it needs the same global scope as theme or currency.
- The existing provider chain in `App.tsx` wraps: `AuthProvider` → `ThemeProvider` → `CurrencyProvider` → `DateProvider`. `ModeProvider` slots in after `ThemeProvider` and before `CurrencyProvider`, since mode does not depend on currency but advanced mode components may want currency access.

The updated provider chain in `App.tsx`:

```tsx
<AuthProvider>
  <ThemeProvider>
    <ModeProvider>          {/* NEW — inserted here */}
      <CurrencyProvider>
        <DateProvider>
          ...
        </DateProvider>
      </CurrencyProvider>
    </ModeProvider>
  </ThemeProvider>
</AuthProvider>
```

### ModeContext Interface

```tsx
// src/contexts/ModeContext.tsx

type AppMode = 'simple' | 'advanced';

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isAdvanced: boolean;        // derived: mode === 'advanced'
  isUpdating: boolean;        // true while DB persist is in-flight
}
```

The `isAdvanced` boolean shorthand eliminates repeated `mode === 'advanced'` checks across components. This mirrors how `ThemeContext` exposes `actualTheme` as a derived value alongside `theme`.

### How Mode Preference Is Persisted

Mode preference is stored as a new column `app_mode` on the existing `user_settings` table — not a separate table. This follows the established pattern: every other user preference (theme, default_currency, language, auto_convert, include_long_term, auto_price_update, net_worth_calculation) lives in `user_settings`.

**Required DB change:**

```sql
ALTER TABLE user_settings
ADD COLUMN app_mode TEXT NOT NULL DEFAULT 'simple'
CHECK (app_mode IN ('simple', 'advanced'));
```

**Persistence mechanism in ModeContext** mirrors ThemeContext exactly:

1. On mount: read `settings?.app_mode` from `useUserSettings()`. Initialize local state to `'simple'` (the safe default, matching the `DEFAULT_USER_SETTINGS` constant in `useUserSettings.ts`).
2. When `settings` loads and contains a non-null `app_mode`, sync the local state via `useEffect` (same pattern as `ThemeContext`'s sync on `settings?.theme`).
3. `setMode()` calls `updateSettings({ app_mode: nextMode })` asynchronously via the existing optimistic-update mutation in `useUserSettings`. If the DB write fails, the optimistic update reverts automatically — the same error recovery ThemeContext benefits from.
4. The `DEFAULT_USER_SETTINGS` object in `useUserSettings.ts` gets `app_mode: 'simple'` added so that new users always start in Simple mode.

**No localStorage fallback needed.** ThemeContext uses localStorage as a pre-auth bootstrap (to avoid flash of wrong theme before settings load), but mode does not need this — there is no visual flash risk from starting in Simple mode briefly. If a returning user briefly sees Simple mode before their settings load, it is acceptable. Do not add localStorage for mode.

### How Components Conditionally Render Based on Mode

Components access mode via the `useMode()` hook:

```tsx
const { isAdvanced } = useMode();
```

Three conditional rendering patterns are used, chosen by scope:

**Pattern A — Sidebar navigation sections (coarse-grained, in Sidebar.tsx):**
The `sidebarItems` array is currently a static constant. It must be refactored to a function or computed inside the component so it can read `isAdvanced`:

```tsx
// Inside Sidebar component
const { isAdvanced } = useMode();

const advancedItems = [
  { titleKey: "nav.advanced.dashboard", href: "/advanced", icon: BarChart3 },
  { titleKey: "nav.clients",            href: "/clients",  icon: Users },
  { titleKey: "nav.invoices",           href: "/invoices", icon: FileText },
];

// Render a section divider + advanced items when isAdvanced is true
```

Simple mode nav items always render. Advanced mode nav items are appended beneath a visual divider when `isAdvanced` is true.

**Pattern B — Dashboard widget slots (medium-grained, in Dashboard.tsx):**
The existing `Dashboard.tsx` is not replaced. A section is added at the bottom that conditionally renders the `AdvancedDashboardSection` component:

```tsx
// Bottom of Dashboard.tsx JSX
{isAdvanced && <AdvancedDashboardSection />}
```

This keeps Simple mode dashboard untouched and Advanced mode additions purely additive.

**Pattern C — Form fields (fine-grained, inside form components):**
Income and Expense forms get an optional client selector that only renders in Advanced mode:

```tsx
{isAdvanced && (
  <FormField name="client_id" label="Client (optional)" .../>
)}
```

### Route Structure

**Decision: Advanced mode gets dedicated new routes, not conditional content on existing routes.**

Rationale: Client management and Invoice builder are full CRUD pages with their own data, their own hooks, and their own navigation breadcrumbs. Forcing them into conditional content on `/income` or `/` would create deep conditional branching and break the clean page-per-concern convention the app already follows. New routes are cleaner, lazy-loadable individually, and easier to guard.

The route additions to `App.tsx`:

```tsx
// Inside the ProtectedRoute > AppLayout > Routes block
{/* Advanced Mode Routes — only accessible when mode is 'advanced' */}
<Route path="/advanced"              element={<AdvancedRoute><AdvancedDashboard /></AdvancedRoute>} />
<Route path="/clients"               element={<AdvancedRoute><Clients /></AdvancedRoute>} />
<Route path="/clients/:clientId"     element={<AdvancedRoute><ClientDetail /></AdvancedRoute>} />
<Route path="/invoices"              element={<AdvancedRoute><Invoices /></AdvancedRoute>} />
<Route path="/invoices/new"          element={<AdvancedRoute><InvoiceBuilder /></AdvancedRoute>} />
<Route path="/invoices/:invoiceId"   element={<AdvancedRoute><InvoiceDetail /></AdvancedRoute>} />
```

`AdvancedRoute` is a thin guard component analogous to `ProtectedRoute`:

```tsx
// src/components/AdvancedRoute.tsx
export function AdvancedRoute({ children }: { children: React.ReactNode }) {
  const { isAdvanced } = useMode();
  if (!isAdvanced) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

All advanced page components are lazy-loaded like existing pages:

```tsx
const AdvancedDashboard = lazy(() => import("./pages/advanced/AdvancedDashboard"));
const Clients           = lazy(() => import("./pages/advanced/Clients"));
const ClientDetail      = lazy(() => import("./pages/advanced/ClientDetail"));
const Invoices          = lazy(() => import("./pages/advanced/Invoices"));
const InvoiceBuilder    = lazy(() => import("./pages/advanced/InvoiceBuilder"));
const InvoiceDetail     = lazy(() => import("./pages/advanced/InvoiceDetail"));
```

The existing Simple mode routes (`/`, `/income`, `/expenses`, `/debts`, `/assets`, `/settings`) are untouched and remain accessible in both modes. Advanced mode is additive.

---

## 2. Database Schema Additions

### clients Table

```sql
CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  company     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Only `name` is required; all contact fields are nullable to minimize friction when creating a new client quickly.

### invoices Table

```sql
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');

CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  status         invoice_status NOT NULL DEFAULT 'draft',
  issue_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,
  items          JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total          NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'USD',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`items` JSONB structure** — each element in the array:

```json
{
  "description": "Website design",
  "quantity": 1,
  "unit_price": 1500.00,
  "amount": 1500.00
}
```

`subtotal` and `total` are redundant computed fields stored for fast querying (e.g., summing outstanding invoice totals without parsing JSONB). They are computed and set by the client before insert/update, not by a DB trigger, keeping the pattern consistent with how `total_value` is computed and stored on the `assets` table.

`client_id` on invoices uses `ON DELETE RESTRICT` — an invoice must not be silently orphaned if a client is deleted. The user must either reassign or delete the invoices first. This is explicit UX behavior, not silent cascade.

`invoice_number` is a user-visible identifier (e.g., "INV-001"). It is a plain TEXT column, not auto-generated by the DB, because invoice numbering conventions vary by user/business. The client generates the number (e.g., sequential counter stored client-side or fetched via a `COUNT(*)` query on the user's invoices).

### Linking Existing Transactions to Clients: Nullable FK Approach

**Recommendation: Add nullable `client_id` FK columns directly on the `incomes` and `expenses` tables. Do not use a junction table.**

```sql
-- Migration
ALTER TABLE incomes
ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE expenses
ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
```

**Rationale against junction table:**

A junction table (`income_clients`) would introduce a third table join for every income query that needs client context. The existing `useIncomes` hook already joins `income_amount_history` in a single Supabase select (`'*, income_amount_history(*)'`). Adding another join table inflates query complexity without any benefit, since the requirement is one-to-one: each income or expense belongs to at most one client. Junction tables are appropriate for M:N relationships; this is M:1 (many transactions to one client). A nullable FK is the correct relational model for an optional M:1.

**`ON DELETE SET NULL` behavior:** If a client is deleted, their linked transactions are not deleted — only the `client_id` pointer is nulled. The transactions remain in the user's income/expense history but become unlinked. This is the correct financial behavior: a transaction's historical fact is preserved even if the client relationship ends.

**TypeScript type update:** After the migration, the `Income` interface in `useIncomes.ts` gains an optional field:

```typescript
export interface Income {
  // ... existing fields ...
  client_id?: string | null;
}
```

Same for the `Expense` interface in `useExpenses.ts`.

### RLS Policies

All new tables follow the existing pattern: `user_id = auth.uid()`. The existing tables all use this pattern (visible in the types file — every table has a `user_id` column). No exceptions.

```sql
-- clients RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients: users manage their own"
  ON clients FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- invoices RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices: users manage their own"
  ON invoices FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

The `FOR ALL` single-policy pattern (covering SELECT, INSERT, UPDATE, DELETE) matches the style used on existing tables. No per-verb splitting is needed; the user_id check is sufficient for both `USING` (read/delete gate) and `WITH CHECK` (insert/update gate).

No new RLS policies are needed on `incomes` or `expenses` — the `client_id` column additions do not affect the existing row-level ownership check. The existing policies already restrict reads/writes to the owning user.

---

## 3. Component Architecture

### Directory Structure for Advanced Mode

Advanced mode pages and components live in a dedicated subdirectory. This is the correct approach over co-location because:

- Advanced mode contains multiple pages that reference each other (e.g., the invoice builder navigates to client detail). A dedicated directory makes the dependency graph obvious.
- It prevents the `src/pages/` root from becoming a flat mix of Simple and Advanced concerns.
- It mirrors the convention already present in `src/components/layout/` — related components are grouped by feature/concern.

```
src/
  pages/
    advanced/                         # All Advanced Mode pages
      AdvancedDashboard.tsx
      Clients.tsx                     # Client list + add
      ClientDetail.tsx                # Client detail + transactions
      Invoices.tsx                    # Invoice list
      InvoiceBuilder.tsx              # Create/edit invoice
      InvoiceDetail.tsx               # View invoice + PDF export
  components/
    advanced/                         # Reusable Advanced Mode sub-components
      RevenuePerClientWidget.tsx
      OutstandingInvoicesWidget.tsx
      MonthlyProfitTrendWidget.tsx
      ClientSelector.tsx              # Dropdown for picking a client (used in forms)
      InvoiceLineItems.tsx            # Line item editor used in InvoiceBuilder
      InvoiceStatusBadge.tsx          # Status pill component
    AdvancedRoute.tsx                 # Mode guard (analogous to ProtectedRoute)
  hooks/
    useClients.ts                     # CRUD hooks for clients table
    useInvoices.ts                    # CRUD hooks for invoices table
    useClientTransactions.ts          # Fetch incomes+expenses filtered by client_id
    useLinkTransactionToClient.ts     # Mutation: set client_id on income/expense row
```

### Advanced Dashboard Component Structure

`AdvancedDashboard.tsx` at `/advanced` is a separate page — it does not replace the existing `Dashboard.tsx`. Users in Advanced mode see both: the Simple Dashboard at `/` still exists with all its existing widgets, and the Advanced Dashboard at `/advanced` adds the freelancer-specific widgets.

The sidebar in Advanced mode shows the Advanced Dashboard link first in its advanced section, making it the natural landing point for Advanced mode users.

**Three widgets in AdvancedDashboard:**

**Widget 1: RevenuePerClientWidget**
- Location: `src/components/advanced/RevenuePerClientWidget.tsx`
- Data source: `useIncomes()` data (already cached by React Query), grouped by `client_id`, then joined client name from `useClients()`.
- No new Supabase query needed — the grouping is done client-side in the component using the existing React Query cache. This avoids N+1 fetches.
- Renders as a ranked list or bar chart (Shadcn + Recharts if chart; plain list if no chart library).
- Shows: client name, total received income, percentage of total revenue.
- Unlinked income rows (null `client_id`) are grouped under "Unassigned" or excluded from the chart.

**Widget 2: OutstandingInvoicesWidget**
- Location: `src/components/advanced/OutstandingInvoicesWidget.tsx`
- Data source: `useInvoices()` filtered to `status IN ('sent', 'overdue')`.
- Renders as a list of invoice cards: client name, invoice number, amount, due date, status badge.
- Overdue invoices (past due_date with status 'sent') are highlighted. Auto-detection of overdue state happens client-side at render time by comparing `due_date` with today's date. The `status` field in the DB is not auto-updated to 'overdue' by a trigger — it is controlled by the user marking it, but the UI visually flags past-due 'sent' invoices.

**Widget 3: MonthlyProfitTrendWidget**
- Location: `src/components/advanced/MonthlyProfitTrendWidget.tsx`
- Data source: `useIncomes()` and `useExpenses()` (both already cached). Profit = received income - paid expenses, grouped by month.
- Renders as a line or bar chart showing last 6 months.
- Uses existing `DateContext` month range logic or computes its own 6-month window independently.
- This widget always shows all income/expenses (not filtered to only client-linked ones) so the P&L is complete.

### Client Management CRUD Pages

**`Clients.tsx` (`/clients`):**
- Lists all clients from `useClients()`.
- Each row: client name, company, email, total revenue (computed from `useIncomes()` filtered by client_id — client-side join), total outstanding invoices (from `useInvoices()`).
- "Add Client" button opens a `Dialog` (Shadcn) containing `ClientForm` — same modal pattern used in Dashboard quick actions.
- Click on a client row navigates to `/clients/:clientId`.

**`ClientDetail.tsx` (`/clients/:clientId`):**
- Fetches single client via `useClients()` filtered by id, or a dedicated `useClient(id)` hook.
- Shows client info card with edit-in-place or an Edit button opening a Dialog with `ClientForm`.
- Transaction history section: `useClientTransactions(clientId)` — fetches incomes and expenses where `client_id = clientId`. Displayed as a unified chronological list.
- Outstanding invoices section: `useInvoices()` filtered by `client_id`.
- P&L summary: total received income vs. total expenses for this client.
- Delete client button: triggers a confirmation dialog. Checks if client has invoices with `ON DELETE RESTRICT` — catches the Supabase FK violation error and surfaces it as a toast message.

**`ClientForm` component (reusable, not a page):**

```tsx
// src/components/advanced/ClientForm.tsx
// Props: client?: Client (for edit mode), onSuccess: () => void
// Fields: name (required), email, phone, company, notes
// Validation: Zod schema, same pattern as incomeSchema / expenseSchema
// Mutation: useAddClient() or useUpdateClient() depending on whether client prop is present
```

### Invoice Builder Component

**`InvoiceBuilder.tsx` (`/invoices/new` and `/invoices/:invoiceId/edit`):**

This is the most complex new component. Structure:

```
InvoiceBuilder
├── Header section
│   ├── InvoiceNumberField (text input, auto-suggested)
│   ├── ClientSelector (dropdown using useClients())
│   ├── StatusSelect (draft/sent/paid/overdue)
│   ├── IssueDatePicker
│   └── DueDatePicker
├── InvoiceLineItems
│   ├── Line item rows (description, qty, unit_price, computed amount)
│   ├── Add Line Item button
│   └── Remove row buttons
├── Totals section
│   ├── Subtotal (sum of line item amounts)
│   └── Total (same as subtotal for v1 — no tax)
├── Notes field (textarea)
└── Action buttons
    ├── Save as Draft
    ├── Mark as Sent
    └── Cancel
```

`InvoiceLineItems` (`src/components/advanced/InvoiceLineItems.tsx`) manages the JSONB array state locally using React `useState`. The parent `InvoiceBuilder` collects the final items array on submit and passes it into the insert/update mutation. This keeps the complex line item editing logic isolated.

**`InvoiceDetail.tsx` (`/invoices/:invoiceId`):**
- Read-only view of a saved invoice.
- Status-change buttons: "Mark as Sent", "Mark as Paid" (simple update mutations).
- "Export PDF" button: triggers client-side PDF generation (implementation deferred to a dedicated research doc on PDF generation options).
- "Edit" button navigates to `/invoices/:invoiceId/edit`.

**`InvoiceDetail` renders a print-formatted layout** (fixed-width, styled for PDF export) that is hidden from normal view via CSS class toggling, then triggered to capture via the PDF library. The print layout contains: user name (from AuthContext), client info, line items table, total, invoice number, dates.

---

## 4. Build Order

The dependency chain is strict. Each phase must be complete before the next begins because later phases read database tables and TypeScript types introduced by earlier phases.

### Phase 0: Foundation (no UI, no routes)

Must be built first because everything else depends on these.

1. **DB migration: `user_settings.app_mode` column** — required before ModeContext can read/write mode preference.
2. **DB migration: `clients` table + RLS policy** — required before useClients hooks or any client-related UI.
3. **DB migration: `invoices` table + RLS policy** — required before useInvoices hooks.
4. **DB migration: `incomes.client_id` + `expenses.client_id` nullable FKs** — required before any transaction-to-client linking UI.
5. **Update `src/integrations/supabase/types.ts`** — add the new tables, columns, and enum to the TypeScript type definitions. This is required before any hook or component can access new tables with type safety.
6. **Update `DEFAULT_USER_SETTINGS` in `useUserSettings.ts`** — add `app_mode: 'simple'` to the constant.

### Phase 1: Mode Infrastructure

Must come before any Advanced mode UI.

1. **`src/contexts/ModeContext.tsx`** — implement ModeProvider, useMode hook, AppMode type.
2. **Add ModeProvider to `App.tsx`** provider chain.
3. **`src/components/AdvancedRoute.tsx`** — mode guard component.
4. **Update `Sidebar.tsx`** — consume `useMode()`, conditionally render Advanced nav items (links to routes that don't exist yet — `<Link>` components render fine even without the target Route defined).
5. **Mode toggle control in `Settings.tsx`** — a new Card section with a toggle Switch that calls `setMode()`. This lets developers test mode switching immediately.

### Phase 2: Client Management

Depends on Phase 0 (DB + types) and Phase 1 (mode infrastructure).

1. **`src/hooks/useClients.ts`** — `useClients()`, `useAddClient()`, `useUpdateClient()`, `useDeleteClient()` following the pattern in `useIncomes.ts`.
2. **`src/components/advanced/ClientForm.tsx`** — reusable form with Zod schema.
3. **`src/pages/advanced/Clients.tsx`** — list page.
4. **`src/pages/advanced/ClientDetail.tsx`** — detail page (requires `useClientTransactions` hook).
5. **`src/hooks/useClientTransactions.ts`** — fetch incomes + expenses by `client_id`.
6. **Add client routes to `App.tsx`**.
7. **`src/components/advanced/ClientSelector.tsx`** — reusable dropdown (needed by income/expense forms and InvoiceBuilder).

### Phase 3: Transaction-to-Client Linking

Depends on Phase 2 (`ClientSelector` component must exist).

1. **`src/hooks/useLinkTransactionToClient.ts`** — mutation that updates `client_id` on an income or expense row. Uses the existing `useUpdateIncome` / `useUpdateExpense` pattern but targets only the `client_id` field.
2. **Update Income form** (`Income.tsx`) — add optional `ClientSelector` field, rendered only when `isAdvanced` is true.
3. **Update Expense form** (`Expenses.tsx`) — same as above.
4. **Retroactive linking UI** — an action in the income/expense row menu (the "Edit" flow) that allows setting `client_id` on an existing row. This reuses the existing edit dialog with the `ClientSelector` added.

### Phase 4: Invoices

Depends on Phase 2 (clients must exist to create invoices).

1. **`src/hooks/useInvoices.ts`** — `useInvoices()`, `useAddInvoice()`, `useUpdateInvoice()`, `useDeleteInvoice()`.
2. **`src/components/advanced/InvoiceLineItems.tsx`** — line item CRUD state component.
3. **`src/components/advanced/InvoiceStatusBadge.tsx`** — status pill.
4. **`src/pages/advanced/InvoiceBuilder.tsx`** — create/edit form.
5. **`src/pages/advanced/Invoices.tsx`** — list page.
6. **`src/pages/advanced/InvoiceDetail.tsx`** — view page with status controls.
7. **Add invoice routes to `App.tsx`**.
8. **PDF export** — add client-side PDF generation inside `InvoiceDetail.tsx`. Recommended library: `@react-pdf/renderer` (pure client-side, produces actual PDF blobs, no canvas rasterization). This is a contained addition to InvoiceDetail and does not affect other phases.

### Phase 5: Advanced Dashboard

Depends on Phase 2 (clients), Phase 3 (linked transactions), and Phase 4 (invoices). All three data sources must be available before the dashboard widgets are meaningful.

1. **`src/components/advanced/RevenuePerClientWidget.tsx`**.
2. **`src/components/advanced/OutstandingInvoicesWidget.tsx`**.
3. **`src/components/advanced/MonthlyProfitTrendWidget.tsx`**.
4. **`src/pages/advanced/AdvancedDashboard.tsx`** — composes the three widgets.
5. **Add `/advanced` route to `App.tsx`**.
6. **Optionally: embed `AdvancedDashboardSection` into the existing `Dashboard.tsx`** as a preview panel when `isAdvanced` is true, linking to `/advanced` for the full view.

---

## 5. Data Flow for Key Scenarios

### Scenario A: Tag Existing Transaction to Client (Retroactive Linking)

1. User is in Advanced mode. They open the Income page (`/income`).
2. On each income row, the existing action menu (edit/delete pattern) gains a "Link to Client" option — only rendered when `isAdvanced` is true.
3. Clicking "Link to Client" opens a Dialog containing a `ClientSelector` dropdown populated by `useClients()` data.
4. User selects a client and confirms. The `useLinkTransactionToClient` mutation fires:

```typescript
// Mutation internals
await supabase
  .from('incomes')
  .update({ client_id: selectedClientId })
  .eq('id', incomeId)
  .eq('user_id', user.id);  // belt-and-suspenders; RLS also enforces this
```

5. On success: `queryClient.invalidateQueries(['incomes', user.id])` causes the income list to re-fetch with the updated `client_id`. The `ClientDetail` page for that client (if open in another tab) would also stale its cache on next focus via React Query's `staleTime` defaults.
6. Activity log: `useLogActivity()` fires with `type: 'income', action: 'link_client', description: 'Linked income X to client Y'`.
7. The `RevenuePerClientWidget` on the Advanced Dashboard reflects the new link on next render, since it reads from the React Query cache for incomes which was just invalidated.

### Scenario B: Create Transaction Linked to Client from the Start

1. User is in Advanced mode. They open the Income page and click "Add Income".
2. The `AddIncomeForm` component (currently at `src/pages/Income.tsx`, exported as a named export) renders with an additional field at the bottom: a `ClientSelector` dropdown, conditionally rendered via `{isAdvanced && <ClientSelector ... />}`.
3. The Zod schema for the income form gains an optional field: `client_id: z.string().uuid().optional()`.
4. On form submit, the `useAddIncome` mutation's input payload includes `client_id` if selected.
5. The `addIncome` function in `useIncomes.ts` passes `client_id` through to the Supabase `insert` call. The DB column is nullable, so omitting it (Simple mode) is also valid.
6. No other change to the mutation flow — the existing success path (cache invalidation, activity log, analytics, toast) handles it unchanged.
7. The new income row immediately appears in `RevenuePerClientWidget` grouped under the selected client.

### Scenario C: How Invoice Total Relates to Tracked Income

This is a **deliberate loose coupling** — invoices and income transactions are related conceptually but are not automatically synchronized. The reasons:

- An invoice going from "sent" to "paid" does not auto-create an income record. The user manually records income when payment is received, following the existing workflow they already know.
- Forcing an auto-create would break the existing income history pattern (the `income_amount_history` table gets an initial entry on every income insert — automating this from an invoice status change would require either a DB trigger or a complex mutation chain, both of which add fragility).

**The recommended linking pattern:**

When a user marks an invoice as "paid", the UI shows an optional prompt:

> "Record this payment as income? This will create a new income entry linked to this client."

If the user confirms, the app calls `useAddIncome` with pre-populated fields:
- `title`: "Invoice #INV-001 Payment" (auto-generated from invoice number)
- `amount`: invoice total
- `currency`: invoice currency
- `category`: "Freelance" or a default category
- `client_id`: the invoice's client_id
- `status`: "received"
- `date`: today

The resulting income record is linked to the client via `client_id`, making it visible in `RevenuePerClientWidget` and `ClientDetail` transaction history.

**No FK relationship between `invoices` and `incomes` is created.** The link is semantic (same client, same amount, same date) but not enforced by the DB. This is intentional: it preserves flexibility (user may record income in a different amount, currency, or date than the invoice), avoids cascade complexity, and keeps the income table's structure unchanged for Simple mode users.

For the Advanced Dashboard P&L calculation: profit uses income and expenses data directly (already present), not invoice data. Invoice data is used only for outstanding/unpaid reporting in `OutstandingInvoicesWidget`.

---

## Appendix: TypeScript Types Summary

The following additions are needed in `src/integrations/supabase/types.ts` after running DB migrations:

```typescript
// New enum
invoice_status: "draft" | "sent" | "paid" | "overdue"

// clients table Row/Insert/Update (mirrors existing table type structure)
clients: {
  Row: {
    id: string
    user_id: string
    name: string
    email: string | null
    phone: string | null
    company: string | null
    notes: string | null
    created_at: string
    updated_at: string
  }
  Insert: { ... }   // id, created_at, updated_at optional; user_id, name required
  Update: { ... }   // all optional
  Relationships: []
}

// invoices table Row/Insert/Update
invoices: {
  Row: {
    id: string
    user_id: string
    client_id: string
    invoice_number: string
    status: Database["public"]["Enums"]["invoice_status"]
    issue_date: string
    due_date: string | null
    items: Json          // array of line item objects
    subtotal: number
    total: number
    currency: string
    notes: string | null
    created_at: string
  }
  Insert: { ... }
  Update: { ... }
  Relationships: [
    {
      foreignKeyName: "invoices_client_id_fkey"
      columns: ["client_id"]
      isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
  ]
}

// user_settings additions
user_settings: {
  Row: {
    // ... existing fields ...
    app_mode: string    // 'simple' | 'advanced'
  }
  Insert: {
    app_mode?: string
  }
  Update: {
    app_mode?: string
  }
}

// incomes and expenses additions
incomes: {
  Row: {
    // ... existing fields ...
    client_id: string | null
  }
  // ... Insert/Update gain optional client_id?: string | null
}

expenses: {
  Row: {
    // ... existing fields ...
    client_id: string | null
  }
  // ... Insert/Update gain optional client_id?: string | null
}
```

---

*Research complete. This document is the authoritative architecture reference for the Advanced Mode implementation. Phase planning documents should treat all decisions here as resolved unless a phase-specific constraint requires revisiting.*
