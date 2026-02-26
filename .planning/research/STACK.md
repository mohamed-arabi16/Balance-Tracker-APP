# Advanced Mode Stack Research

**Research Date:** 2026-02-23
**Authored for:** Advanced Mode feature additions (client management, invoicing, PDF export, P&L, mode-switching)
**Audience:** Downstream planning and implementation agents

---

## Executive Summary

The existing stack (React 18 + TypeScript + Supabase + TanStack React Query + Shadcn/ui) requires **one new runtime dependency** to deliver the Advanced Mode: a PDF generation library. Everything else — mode state management, data fetching, form handling, schema validation, UI components — is already covered by existing packages. The database needs three new tables and one new enum type, following patterns already established in the codebase.

---

## 1. PDF Generation

### 1.1 Candidates Evaluated

#### `@react-pdf/renderer` (recommended)
- **Current version:** 4.x (4.3.0 as of late 2025)
- **Bundle size impact:** ~180KB gzipped added to the bundle when imported. This is a dedicated rendering engine that converts a React-like component tree into a PDF byte stream in the browser. It does not depend on any DOM or canvas API; it ships its own layout and font engine.
- **Install:** `npm install @react-pdf/renderer`
- **Approach:** You define invoice layout as JSX using `<Document>`, `<Page>`, `<View>`, `<Text>`, `<Image>` primitives, then call `pdf(<Invoice />).toBlob()` to get a `Blob`, which you trigger as a file download with a generated object URL.
- **Pros:**
  - React-native mental model: invoice layout is just a component. TypeScript types are first-class.
  - Produces fully vector PDF output (text is selectable, not rasterized).
  - Supports RTL text rendering — critical since the app already supports Arabic.
  - Supports custom fonts via `Font.register()`, enabling brand consistency.
  - No browser canvas or DOM screenshotting — does not depend on any external canvas state.
  - `pdf().toBlob()` API allows async generation without blocking the main thread in a Web Worker if needed.
  - Active maintenance, 14k+ GitHub stars as of research date.
- **Cons:**
  - ~180KB gzipped is the largest bundle cost of any option. Must be placed in its own lazy-loaded chunk (see Section 1.3).
  - Layout model uses an approximation of flexbox, not CSS. Complex multi-column layouts require learning the PDF layout primitives.
  - No inline HTML-to-PDF — invoice templates must be re-implemented using PDF primitives, not HTML.
  - Custom fonts must be pre-registered and fetched; system fonts are not automatically available.

**Confidence: HIGH**

---

#### `jsPDF` (not recommended for this use case)
- **Current version:** 2.5.2
- **Bundle size impact:** ~110KB gzipped
- **Approach:** Imperative drawing API (`doc.text(...)`, `doc.rect(...)`, `doc.addPage()`). You manually position every text string and shape using X/Y coordinates and font size calls.
- **Pros:** Small-ish bundle, very mature library (10+ years old), browser and Node compatible.
- **Cons:**
  - Imperative coordinate-based layout is extremely fragile for dynamic invoice content. Invoice line items of variable length, multi-line descriptions, and per-client addresses require manual pagination logic.
  - No React integration — JSX invoice template approach is impossible without html2canvas bridge (see below), which re-introduces canvas rasterization.
  - RTL text support is poor without additional plugins (`jspdf-autotable` does not natively support RTL).
  - jsPDF with `html2canvas` as a bridge (the common workaround for React components) produces rasterized PDF — text is not selectable and file sizes are large (typically 1–5MB per invoice page).
  - Maintenance activity has slowed; many open issues.

**Confidence: HIGH (confident it is the wrong choice)**

---

#### `pdfmake` (not recommended)
- **Current version:** 0.2.x
- **Bundle size impact:** ~250KB gzipped when fonts are included (the embedded Roboto font alone is ~150KB).
- **Approach:** JSON-based document definition object passed to `pdfMake.createPdf(docDefinition)`. Renders client-side or server-side.
- **Pros:** Handles tables natively with column widths, good for financial tables.
- **Cons:**
  - No React integration — document definition is a plain JS object, not JSX. Combining dynamic React state into the definition object is verbose.
  - Bundle is the largest of all options even before app code due to bundled fonts.
  - RTL is experimentally supported but underdocumented.
  - Less actively maintained than `@react-pdf/renderer`.

**Confidence: HIGH (confident it is the wrong choice)**

---

#### `html2canvas` (not recommended standalone)
- **Current version:** 1.4.1
- **Bundle size impact:** ~45KB gzipped (small by itself, but always paired with jsPDF or similar, adding 155KB+ total)
- **Approach:** Screenshots a DOM element into a `<canvas>`, then embeds the canvas image in a PDF via jsPDF.
- **Pros:** Easiest to integrate if you already have a rendered HTML invoice component.
- **Cons:**
  - Output is rasterized — text is not selectable or searchable in the PDF. This is a significant quality problem for invoices.
  - Canvas screenshot is affected by cross-origin images, browser rendering differences, and custom fonts (requires all fonts to be loaded in DOM before screenshot).
  - RTL layout depends entirely on the browser's CSS rendering at the moment of screenshot — unreliable across environments.
  - File sizes are 5–20x larger than vector PDF for equivalent content.
  - Cannot reliably handle content that overflows a viewport (multi-page invoices require hacks).

**Confidence: HIGH (confident it is the wrong choice)**

---

### 1.2 Recommendation

**Use `@react-pdf/renderer` version 4.x.**

The invoice feature requires: dynamic line items of variable count, per-client contact addresses, Arabic RTL layout compatibility, and selectable text in the output PDF. Only `@react-pdf/renderer` satisfies all four requirements cleanly within the existing React + TypeScript architecture.

Define a standalone `InvoicePDF` component in `src/components/invoices/InvoicePDF.tsx` using `@react-pdf/renderer` primitives. Keep this component completely separate from the Shadcn/ui component tree — it renders entirely within the PDF renderer's virtual environment, not the DOM.

---

### 1.3 Bundle Size Mitigation

The app's entry chunk budget is 350KB gzipped (`BUNDLE_GZIP_BUDGET_KB` in `check-bundle-budget.mjs`). Adding `@react-pdf/renderer` (~180KB gzipped) to the main bundle would blow this budget.

**Required mitigation: lazy-load the PDF library only when the user triggers invoice export.**

Pattern (to be implemented in the invoices page or hook):

```typescript
// Only imported when user clicks "Export PDF"
const generateInvoicePDF = async (invoice: Invoice) => {
  const { pdf } = await import('@react-pdf/renderer');
  const { InvoicePDF } = await import('@/components/invoices/InvoicePDF');
  const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${invoice.number}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
```

Vite's code splitting will automatically place `@react-pdf/renderer` and `InvoicePDF` into a separate chunk that is only fetched when the function is first called. This keeps the main entry chunk within budget and does not slow down the initial app load for Simple Mode users who will never use invoicing.

Add `@react-pdf/renderer` to a dedicated chunk hint in `vite.config.ts`:

```typescript
// In manualChunks:
if (id.includes('@react-pdf')) {
  return 'vendor-pdf';
}
```

---

## 2. Mode State Management

### 2.1 Options Evaluated

#### Option A: `user_settings` table — ADD A COLUMN (recommended)
- **Approach:** Add a column `mode text NOT NULL DEFAULT 'simple'` (values: `'simple'` | `'advanced'`) to the existing `user_settings` table via a new migration.
- **Read path:** `useUserSettings()` already fetches the full settings row on app load. The `mode` field is available immediately in any component that calls `useUserSettings()` or reads from the context.
- **Write path:** `updateSettings({ mode: 'advanced' })` — same call used by currency, theme, and net_worth_calculation preferences today. Optimistic update pattern in `useUserSettings` mutation covers instant UI response with rollback on error.
- **Pros:**
  - Zero new infrastructure — the fetch, cache, and update path already exist.
  - Mode preference survives device changes, browser data clears, and re-logins. Settings are tied to the Supabase user, not the browser.
  - Consistent with every other user preference in the app (currency, theme, language, net_worth_calculation, auto_convert, include_long_term, auto_price_update — all live in this table).
  - `DEFAULT 'simple'` ensures all existing users get Simple Mode automatically on migration — no data migration needed.
  - The TypeScript type in `src/integrations/supabase/types.ts` will be updated by the migration, giving full type safety.
- **Cons:**
  - Requires a new migration file and a Supabase type regeneration step.
  - The `DEFAULT_USER_SETTINGS` object in `useUserSettings.ts` must be updated to include `mode: 'simple'`.

**Confidence: HIGH**

---

#### Option B: `localStorage` only
- **Approach:** Read/write `localStorage.getItem('appMode')` directly, similar to how `ThemeContext` uses `localStorage.getItem('theme')` as an initial value before the DB setting loads.
- **Pros:** No migration, no network round-trip on toggle.
- **Cons:**
  - Mode preference is lost when the user clears browser data or switches to a new device.
  - ThemeContext uses localStorage as a *bootstrap cache* to avoid flash-of-wrong-theme, but always syncs to DB as the source of truth. Using localStorage as the *only* persistence for mode is a downgrade compared to all other preferences.
  - If a freelancer switches from desktop to mobile, they have to re-enable Advanced Mode manually. This is a friction point for the core Advanced Mode use case.

**Not recommended as sole storage. Acceptable as a fast-read cache (see implementation note below).**

---

#### Option C: New `ModeContext` with its own state
- **Approach:** Create `src/contexts/ModeContext.tsx` with `ModeProvider` and `useMode()`, backed by `user_settings` column.
- **Pros:** Clean separation of concerns; follows existing context patterns exactly.
- **Cons:** Not strictly necessary — mode is a single boolean-equivalent preference, not a complex state machine requiring its own context. `CurrencyContext` and `ThemeContext` already wrap `useUserSettings` for their specific column; mode can follow the same pattern without adding a new top-level context.

**Recommended only if mode state needs derived values or side effects** (e.g., disabling certain queries when in Simple Mode). If the implementation is `isAdvancedMode = settings?.mode === 'advanced'`, a context adds indirection without value. A simple hook export from `useUserSettings` suffices:

```typescript
// In useUserSettings.ts or a new useAppMode.ts
export const useAppMode = () => {
  const { settings, updateSettings } = useUserSettings();
  return {
    isAdvancedMode: settings?.mode === 'advanced',
    setMode: (mode: 'simple' | 'advanced') => updateSettings({ mode }),
  };
};
```

**Confidence: HIGH**

---

### 2.2 Recommendation

**Add `mode text NOT NULL DEFAULT 'simple'` column to `user_settings` table.** Do not create a new context. Expose mode state via a `useAppMode()` hook (a thin wrapper around `useUserSettings`) placed in `src/hooks/useAppMode.ts`. Components and page layouts check `isAdvancedMode` from this hook to conditionally render Advanced Mode sections.

**Implementation note on flash prevention:** Mirror the ThemeContext pattern. Read an `appMode` localStorage key as the initial state to prevent a flash of Simple Mode on page load for Advanced Mode users, then reconcile with the DB value when settings load:

```typescript
const [mode, setModeState] = useState<'simple' | 'advanced'>(() => {
  return (localStorage.getItem('appMode') as 'simple' | 'advanced') || 'simple';
});

useEffect(() => {
  if (settings?.mode) {
    setModeState(settings.mode as 'simple' | 'advanced');
    localStorage.setItem('appMode', settings.mode);
  }
}, [settings?.mode]);
```

---

## 3. Database Schema Additions

All new tables follow the established patterns from `20260220111031_*.sql`:
- `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- Index on `user_id` for all tables
- `ENABLE ROW LEVEL SECURITY` immediately after `CREATE TABLE`
- Single `FOR ALL` policy using `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`

---

### 3.1 Migration: `user_settings` mode column

```sql
-- Migration: add_advanced_mode_to_user_settings.sql
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'simple';

-- Ensure existing rows have valid value
UPDATE public.user_settings SET mode = 'simple' WHERE mode IS NULL;
```

No RLS change needed — the existing policy on `user_settings` already covers all columns for the row owner.

---

### 3.2 New Enum: `invoice_status`

```sql
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
```

- `draft` — created but not yet sent to client
- `sent` — exported/shared with client, awaiting payment
- `paid` — payment confirmed by user
- `overdue` — past due_date and not paid (can be computed or manually set)
- `cancelled` — voided

This matches the pattern of `debt_status`, `expense_status`, and `income_status` enums already in the schema.

**Confidence: HIGH**

---

### 3.3 `clients` Table

```sql
CREATE TABLE clients (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name       text        NOT NULL,
    email      text,
    phone      text,
    company    text,
    address    text,
    notes      text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clients_user_idx ON clients(user_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can manage own clients"
ON clients FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

**Column rationale:**
- `name` NOT NULL — minimum required to identify a client
- `email`, `phone`, `company`, `address`, `notes` — all nullable; not all clients need all fields
- `updated_at` — useful for sorting "recently active" clients; set via application or a DB trigger
- No `currency` column — invoices carry their own currency; clients may be billed in different currencies

**No additional indexes needed** beyond `user_idx` unless the P&L views are implemented as DB-level functions or views, in which case a `(user_id, name)` index on clients might be beneficial for name lookups. Start without it.

**Confidence: HIGH**

---

### 3.4 `invoices` Table

```sql
CREATE TABLE invoices (
    id            uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id     uuid           NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    invoice_number text          NOT NULL,
    status        invoice_status NOT NULL DEFAULT 'draft',
    currency      currency_code  NOT NULL DEFAULT 'USD',
    issue_date    date           NOT NULL,
    due_date      date,
    subtotal      numeric        NOT NULL DEFAULT 0,
    tax_rate      numeric        NOT NULL DEFAULT 0,
    tax_amount    numeric        GENERATED ALWAYS AS (subtotal * tax_rate / 100) STORED,
    total         numeric        GENERATED ALWAYS AS (subtotal + (subtotal * tax_rate / 100)) STORED,
    notes         text,
    created_at    timestamptz    NOT NULL DEFAULT now(),
    updated_at    timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX invoices_user_idx ON invoices(user_id);
CREATE INDEX invoices_client_idx ON invoices(client_id);
CREATE INDEX invoices_status_idx ON invoices(user_id, status);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can manage own invoices"
ON invoices FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

**Column rationale:**
- `client_id` FK is `ON DELETE RESTRICT` — prevents accidental deletion of a client that has invoices; user must delete invoices first or reassign them. This is intentionally stricter than the `ON DELETE CASCADE` used for user-owned data, because losing an invoice history due to a client deletion would be a bad user experience.
- `invoice_number` is `text NOT NULL` — allows user-defined formats ("INV-001", "2026-03", etc.) rather than forcing a sequence. User is responsible for uniqueness within their own context; enforce at application layer or add `UNIQUE(user_id, invoice_number)`.
- `currency_code` reuses the existing `currency_code` enum (`USD | TRY`). If multi-currency invoices beyond these two are needed in future, the enum would be extended then.
- `subtotal` is managed by the application (sum of line items). `tax_amount` and `total` are generated columns — same pattern as `assets.total_value`.
- `tax_rate` stored on invoice (not a global setting) because different invoices may have different rates or zero tax.
- `due_date` nullable — some invoices are due on receipt.

**Note on line items:** Invoice line items (description, quantity, unit price) should be stored in a separate `invoice_items` table, not as a JSONB column. This allows proper querying for P&L breakdowns per service type and avoids parsing JSONB in the application layer.

```sql
CREATE TABLE invoice_items (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  uuid    NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    user_id     uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description text    NOT NULL,
    quantity    numeric NOT NULL DEFAULT 1,
    unit_price  numeric NOT NULL,
    amount      numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
    sort_order  integer NOT NULL DEFAULT 0
);

CREATE INDEX invoice_items_invoice_idx ON invoice_items(invoice_id);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can manage own invoice items"
ON invoice_items FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

`user_id` on `invoice_items` is a denormalization (it could be derived via `invoice_id → invoices.user_id`) but is required for direct RLS policy application without a join — consistent with how `debt_amount_history` and `income_amount_history` carry `user_id` directly.

**Confidence: HIGH**

---

### 3.5 Transaction-to-Client Linking

**Decision: nullable FK on existing tables (not a junction table)**

Two options were considered:

**Option A — Nullable FK on `incomes` and `expenses`:**
```sql
ALTER TABLE incomes  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX incomes_client_idx  ON incomes(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX expenses_client_idx ON expenses(client_id) WHERE client_id IS NOT NULL;
```

**Option B — Junction table `transaction_clients`:**
```sql
CREATE TABLE transaction_clients (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id uuid NOT NULL,  -- polymorphic, requires application-level dispatch
    table_name     text NOT NULL,  -- 'incomes' or 'expenses'
    client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE
);
```

**Recommendation: Option A — nullable FK on each table.**

Rationale:
- Option B's polymorphic design (storing `table_name` text to reference either `incomes` or `expenses`) cannot have a proper FK constraint in PostgreSQL and would require application-level enforcement. This introduces a category of data integrity bug that doesn't exist in the current schema.
- Option A is consistent with how the schema already handles optional relationships (e.g., `debts.due_date` is nullable; `assets.conversion_rate` is nullable).
- `ON DELETE SET NULL` means deleting a client does not delete the income/expense records — only the association is removed. This is the correct behavior: a freelancer's earnings history must not disappear because they removed an old client.
- Partial indexes (`WHERE client_id IS NOT NULL`) keep index size small — the majority of existing records have no client and the index only covers linked records.
- The Supabase query in `useIncomes` can be extended with `select('*, income_amount_history(*)')` → `select('*, income_amount_history(*), clients(*)')` to join client data in a single query.
- No RLS change needed on `incomes` or `expenses` — the existing policies already cover all columns in those rows.

**Confidence: HIGH**

---

### 3.6 RLS Policy Summary

All new tables follow the single-policy pattern used universally in this codebase:

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can manage own <entity>"
ON <table_name> FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

The `FOR ALL` pattern (covers SELECT, INSERT, UPDATE, DELETE in one policy) is used on every existing table. Do not introduce per-operation policies unless a specific access control requirement demands it (e.g., if a client portal feature is ever added). Staying consistent with `FOR ALL` keeps the migration readable and the policy set small.

**The one exception:** `debt_amount_history` has both a `FOR ALL` policy and a duplicate `FOR SELECT` policy in the initial migration — this appears to be a redundancy from generation, not an intentional pattern. Do not replicate this in new migrations.

**Confidence: HIGH**

---

## 4. No New Dependencies Needed

The following Advanced Mode requirements are already covered by existing packages:

| Requirement | Existing Package | Notes |
|---|---|---|
| Client/invoice forms | `react-hook-form` 7.53.0 + `zod` 3.23.8 | Same form stack used for all existing add/edit forms |
| Form field validation schemas | `zod` 3.23.8 | Define `clientSchema`, `invoiceSchema` following `incomeSchema` pattern |
| Invoice status select dropdown | `@radix-ui/react-select` (via Shadcn) | Already in use across app |
| Invoice date picker | `react-day-picker` 8.10.1 (already used) + `date-fns` 3.6.0 | The existing date picker component in Settings/Income |
| P&L data calculations | `date-fns` 3.6.0 | Month/date range filtering already done with date-fns |
| Revenue-per-client charts | `recharts` 2.12.7 | Bar/line charts already rendered in Dashboard |
| Currency formatting on invoices | `CurrencyContext.formatCurrency()` | Already handles USD/TRY with locale formatting |
| Mode toggle UI | `@radix-ui/react-switch` (Shadcn Switch component) | Switch already in `src/components/ui/switch.tsx` |
| Toast notifications for actions | `sonner` 1.5.0 | Used universally across mutations |
| Activity logging for client/invoice events | `useLogActivity()` hook | Plug in the same hook used by incomes/expenses |
| Analytics events | `trackEvent()` in `src/lib/analytics.ts` | Same pattern as `income_created`, `expense_deleted` |
| i18n keys for new UI strings | `i18next` + `react-i18next` | Add keys to `src/i18n/index.ts` for both `en` and `ar` |
| RTL layout for new components | Existing Tailwind RTL utilities + i18n config | RTL already works; no new config needed |
| TypeScript types for new tables | Regenerate `src/integrations/supabase/types.ts` | Run `supabase gen types typescript` after migrations |
| Optimistic updates for client/invoice mutations | TanStack React Query `onMutate` / `onError` | Pattern established in `useUserSettings.ts` |

---

## 5. What NOT to Use

### PDF Generation — Avoid These

**`html2canvas` + `jsPDF` combo**
- Reason: Produces rasterized PDF. Text is not selectable. Files are 5–20x larger than necessary. RTL layout is unreliable. Do not use this for invoices.

**`jsPDF` alone (without canvas)**
- Reason: Requires manually positioning every text element with pixel coordinates. Any change to invoice content (added line items, long client names, multi-line addresses) requires recalculating layout by hand. Not maintainable.

**`pdfmake`**
- Reason: Larger bundle than `@react-pdf/renderer` due to bundled fonts, no React integration, weaker RTL support. Does not offer meaningful advantages over the recommended option.

**Server-side PDF (Supabase Edge Functions + Puppeteer/WeasyPrint)**
- Reason: Explicitly out of scope per PROJECT.md constraints: "Client-side PDF export only (no server-side rendering)" and "no new backend services." Additionally, Supabase Edge Functions run on Deno and cannot host a Chromium instance.

### State Management — Avoid These

**Redux / Zustand / Jotai for mode state**
- Reason: Massive overkill. Mode is a single `'simple' | 'advanced'` string that already fits in the `user_settings` table row fetched by `useUserSettings`. Adding a third-party state manager for this would contradict the existing architecture where all global preferences live in React Context + React Query.

**A new Supabase table `app_modes` or `mode_preferences`**
- Reason: `user_settings` already exists, has the correct RLS, and is fetched on every app load. A separate table adds a network request with no benefit.

### Schema — Avoid These

**JSONB columns for invoice line items**
- Reason: Prevents proper querying for P&L breakdowns. Cannot use PostgreSQL aggregate functions (SUM, GROUP BY) on JSONB arrays without unnesting. Harder to index. Use a normalized `invoice_items` table instead.

**Polymorphic `transaction_clients` junction table**
- Reason: Cannot enforce FK integrity across two tables from one column in PostgreSQL. Application-level integrity is fragile. Nullable FK directly on `incomes` and `expenses` is simpler and correct.

**New `currency_code` enum values for invoices**
- Reason: Do not expand the enum at this stage. The app supports USD and TRY. Invoice currency should use the same enum. Expanding currency support is a separate, larger feature.

---

## 6. Confidence Level Summary

| Decision | Recommendation | Confidence |
|---|---|---|
| PDF library | `@react-pdf/renderer` 4.x | HIGH |
| PDF lazy-loading strategy | Dynamic `import()` on user action | HIGH |
| Mode storage | `user_settings.mode` column | HIGH |
| Mode access pattern | `useAppMode()` hook, no new Context | HIGH |
| Flash prevention | localStorage bootstrap cache (ThemeContext pattern) | HIGH |
| `clients` table schema | As specified in Section 3.3 | HIGH |
| `invoices` table schema | As specified in Section 3.4 | HIGH |
| `invoice_items` table | Separate normalized table (not JSONB) | HIGH |
| Transaction-client link | Nullable FK on `incomes`/`expenses` | HIGH |
| RLS policy pattern | `FOR ALL` with `user_id = auth.uid()` | HIGH |
| `invoice_status` enum values | `draft/sent/paid/overdue/cancelled` | MEDIUM — `overdue` may be computed at query time rather than stored, depending on P&L implementation. Both approaches are valid. |
| `invoice_number` uniqueness | Application-enforced, optional DB constraint | MEDIUM — whether to add `UNIQUE(user_id, invoice_number)` depends on whether users want free-form numbering. Start without it; add if users need duplicate prevention. |
| i18n translation approach | Add keys to existing `src/i18n/index.ts` | HIGH — but note that the single-file i18n is already flagged as fragile in CONCERNS.md. Consider splitting by domain if the file exceeds ~1000 lines after Advanced Mode strings are added. |
| Vite chunk for PDF | `vendor-pdf` manual chunk in `vite.config.ts` | HIGH |
| Bundle budget | `@react-pdf/renderer` must be lazy-loaded to stay within 350KB gzip budget | HIGH |

---

## 7. Migration Execution Order

When implementing, apply migrations in this order to respect FK dependencies:

1. `user_settings` mode column (no FK dependencies)
2. `invoice_status` enum type (no FK dependencies)
3. `clients` table (FK to `auth.users` only)
4. `invoices` table (FK to `clients` — must exist first)
5. `invoice_items` table (FK to `invoices` — must exist first)
6. `ALTER TABLE incomes ADD COLUMN client_id` (FK to `clients` — must exist first)
7. `ALTER TABLE expenses ADD COLUMN client_id` (FK to `clients` — must exist first)

After all migrations are applied, regenerate TypeScript types:
```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

Update `DEFAULT_USER_SETTINGS` in `src/hooks/useUserSettings.ts` to include `mode: 'simple'`.

---

*Research completed: 2026-02-23*
