# Phase 1: Database & Type Foundation - Research

**Researched:** 2026-02-23
**Domain:** Supabase PostgreSQL migrations, TypeScript type generation, RLS policy design, PostgreSQL sequences
**Confidence:** HIGH

---

## Summary

Phase 1 is a zero-UI, zero-hooks migration phase. Its only job is to make the Supabase database reflect the full Advanced Mode schema and make the TypeScript type file reflect that schema — so every downstream phase can import fully-typed Supabase Row/Insert/Update shapes without any workarounds. No components, no hooks, no routes, no context wires are built in this phase.

The existing migration and RLS patterns in the codebase are well-established and directly applicable. Every new table follows the same migration template already used for `assets`, `debts`, `incomes`, `expenses`, and `user_settings`. The FK dependency chain is strict: `clients` must exist before `invoices`, `invoices` before `invoice_items`, and `clients` before the nullable FKs on `incomes`/`expenses`. All must land before `types.ts` is regenerated.

Two design decisions require careful implementation: (1) `invoices.client_id` uses `ON DELETE RESTRICT` (not CASCADE) to prevent silent invoice orphaning when a client is deleted; (2) `incomes.client_id` and `expenses.client_id` use `ON DELETE SET NULL` (not CASCADE) to preserve financial history when a client is deleted. Both behaviors are verified by the phase success criteria and must be tested with explicit SQL or Supabase dashboard checks, not assumed.

**Primary recommendation:** Write all migrations in a single new SQL file ordered by FK dependency. Manually edit `src/integrations/supabase/types.ts` to add the new tables and columns — the Supabase CLI is not installed in the project. Verify `DEFAULT_USER_SETTINGS` is updated with `app_mode: 'simple'`. Run `npm run typecheck` to confirm zero TypeScript errors.

---

## Standard Stack

### Core (no new packages needed)
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Supabase PostgreSQL | (hosted) | Tables, RLS, enums, triggers | Managed via migration SQL files |
| `@supabase/supabase-js` | 2.97.0 | DB client; types consumed from `types.ts` | Already installed |
| TypeScript | 5.5.3 | Type checking via `tsc --noEmit` | Already configured |

### No New Runtime Dependencies
Phase 1 installs nothing. All work is SQL migrations + editing one generated TypeScript file.

### Supabase CLI Status
**CRITICAL:** `supabase` CLI is not installed in the project (`which supabase` returns not found). The standard workflow `supabase gen types typescript --local > src/integrations/supabase/types.ts` is therefore unavailable. The types file at `src/integrations/supabase/types.ts` MUST be edited by hand, following the exact structure already present in the file.

---

## Architecture Patterns

### Migration File Convention

Existing migrations use timestamped filenames:
```
supabase/migrations/20260220111031_5984aa5c-5276-4ca7-9f01-7a14aff6c9c9.sql  (main schema)
supabase/migrations/20260220111106_e92db278-160a-4a8b-b70c-889d0ff4c55d.sql  (RPC functions)
supabase/migrations/20260220153000_debt_type_trigger.sql                       (trigger)
supabase/migrations/20260220184500_add_is_receivable_to_debts.sql             (column add)
supabase/migrations/20260220200000_add_net_worth_calc.sql                     (column add)
```

New migration should follow the descriptive-name pattern (not UUID-based), timestamped after the latest existing migration:
```
supabase/migrations/20260223000000_advanced_mode_schema.sql
```

### Established Table Template (from existing migrations)

Every existing table follows this exact pattern — replicate it without deviation:

```sql
CREATE TABLE <table_name> (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- ... columns ...
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX <table_name>_user_idx ON <table_name>(user_id);

ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user can manage own <entity>"
ON <table_name> FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

Key details:
- `uuid PRIMARY KEY DEFAULT gen_random_uuid()` — always
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` — always
- `CREATE INDEX` on `user_id` — always, named `<table>_user_idx`
- `ENABLE ROW LEVEL SECURITY` immediately after `CREATE TABLE`
- Single `FOR ALL` policy — matches all existing tables except `debt_amount_history` and `income_amount_history` which have an extra `FOR SELECT` (that appears to be a redundancy; do NOT replicate it in new tables)

### Column ADD Pattern (from `add_net_worth_calc.sql`)

```sql
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS <col_name> TEXT NOT NULL DEFAULT '<default>';
UPDATE public.user_settings SET <col_name> = '<default>' WHERE <col_name> IS NULL;
```

Use `IF NOT EXISTS` for idempotence. The `UPDATE` guard handles the edge case where `IF NOT EXISTS` skips but nulls still exist (should not happen with a DEFAULT, but defensive).

### Generated Columns Pattern (from `assets.total_value`)

`assets.total_value` uses `GENERATED ALWAYS AS (quantity * price_per_unit) STORED`. The research proposes the same for `invoices.tax_amount` and `invoices.total`. This is confirmed as a valid Supabase PostgreSQL pattern.

### Existing `DEFAULT_USER_SETTINGS` Pattern

In `src/hooks/useUserSettings.ts`, the constant is typed with `satisfies Omit<UserSettingsRow, "user_id">`:

```typescript
const DEFAULT_USER_SETTINGS = {
  default_currency: "USD",
  auto_convert: true,
  theme: "system",
  include_long_term: true,
  auto_price_update: true,
  language: "en",
  net_worth_calculation: "assets_minus_debts",
} satisfies Omit<UserSettingsRow, "user_id">;
```

After `types.ts` is updated to add `app_mode`, TypeScript will require `app_mode` to be added here too (because `satisfies` enforces the full shape). This is the mechanism that validates Phase 1 is complete: `npm run typecheck` will fail until `DEFAULT_USER_SETTINGS` includes `app_mode: 'simple'`.

---

## Complete Migration SQL

### Migration Execution Order (FK dependency chain)

1. `user_settings.app_mode` column — no FK dependencies
2. `invoice_status` enum type — no FK dependencies
3. `clients` table + RLS — FK to `auth.users` only
4. `invoices` table + RLS — FK to `clients` (must exist first)
5. `invoice_items` table + RLS — FK to `invoices` (must exist first)
6. `ALTER TABLE incomes ADD COLUMN client_id` — FK to `clients` (must exist first)
7. `ALTER TABLE expenses ADD COLUMN client_id` — FK to `clients` (must exist first)

### Full Migration SQL

```sql
-- =============================================================================
-- Migration: Advanced Mode Schema (Phase 1)
-- =============================================================================

-- Step 1: user_settings.app_mode column
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS app_mode TEXT NOT NULL DEFAULT 'simple';
UPDATE public.user_settings SET app_mode = 'simple' WHERE app_mode IS NULL;

-- Step 2: invoice_status enum
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Step 3: clients table
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

-- Step 4: invoices table
-- Note: client_id uses ON DELETE RESTRICT — cannot silently orphan an invoice
-- Note: UNIQUE(user_id, invoice_number) enforces no duplicate numbers per user
CREATE TABLE invoices (
    id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id      uuid           NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    invoice_number text           NOT NULL,
    status         invoice_status NOT NULL DEFAULT 'draft',
    currency       currency_code  NOT NULL DEFAULT 'USD',
    issue_date     date           NOT NULL,
    due_date       date,
    subtotal       numeric(14,2)  NOT NULL DEFAULT 0,
    tax_rate       numeric(5,2)   NOT NULL DEFAULT 0,
    tax_amount     numeric(14,2)  GENERATED ALWAYS AS (ROUND(subtotal * tax_rate / 100, 2)) STORED,
    total          numeric(14,2)  GENERATED ALWAYS AS (ROUND(subtotal + (subtotal * tax_rate / 100), 2)) STORED,
    notes          text,
    created_at     timestamptz    NOT NULL DEFAULT now(),
    updated_at     timestamptz    NOT NULL DEFAULT now(),
    UNIQUE (user_id, invoice_number)
);
CREATE INDEX invoices_user_idx    ON invoices(user_id);
CREATE INDEX invoices_client_idx  ON invoices(client_id);
CREATE INDEX invoices_status_idx  ON invoices(user_id, status);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user can manage own invoices"
ON invoices FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 5: invoice_items table
-- Note: user_id is denormalized (derivable via invoice_id) but required for direct RLS
--       (same pattern as debt_amount_history and income_amount_history)
CREATE TABLE invoice_items (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  uuid        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description text        NOT NULL,
    quantity    numeric     NOT NULL DEFAULT 1,
    unit_price  numeric(14,2) NOT NULL,
    amount      numeric(14,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED,
    sort_order  integer     NOT NULL DEFAULT 0
);
CREATE INDEX invoice_items_invoice_idx ON invoice_items(invoice_id);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user can manage own invoice items"
ON invoice_items FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 6: incomes.client_id nullable FK
-- Note: ON DELETE SET NULL — deleting a client preserves income history
ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX incomes_client_idx ON incomes(client_id) WHERE client_id IS NOT NULL;

-- Step 7: expenses.client_id nullable FK
-- Note: ON DELETE SET NULL — deleting a client preserves expense history
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX expenses_client_idx ON expenses(client_id) WHERE client_id IS NOT NULL;
```

---

## TypeScript Types Update

The `src/integrations/supabase/types.ts` file must be manually edited. The Supabase CLI is not installed.

### What to Add

**1. New enum in `Enums` section:**
```typescript
invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
```

**2. New tables in `Tables` section — `clients`:**
```typescript
clients: {
  Row: {
    id: string
    user_id: string
    name: string
    email: string | null
    phone: string | null
    company: string | null
    address: string | null
    notes: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    user_id: string
    name: string
    email?: string | null
    phone?: string | null
    company?: string | null
    address?: string | null
    notes?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    name?: string
    email?: string | null
    phone?: string | null
    company?: string | null
    address?: string | null
    notes?: string | null
    created_at?: string
    updated_at?: string
  }
  Relationships: []
}
```

**3. New tables in `Tables` section — `invoices`:**
```typescript
invoices: {
  Row: {
    id: string
    user_id: string
    client_id: string
    invoice_number: string
    status: Database["public"]["Enums"]["invoice_status"]
    currency: Database["public"]["Enums"]["currency_code"]
    issue_date: string
    due_date: string | null
    subtotal: number
    tax_rate: number
    tax_amount: number | null        // generated column — may be null if subtotal=0
    total: number | null             // generated column
    notes: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    user_id: string
    client_id: string
    invoice_number: string
    status?: Database["public"]["Enums"]["invoice_status"]
    currency?: Database["public"]["Enums"]["currency_code"]
    issue_date: string
    due_date?: string | null
    subtotal?: number
    tax_rate?: number
    notes?: string | null
    created_at?: string
    updated_at?: string
    // tax_amount and total are generated — NOT included in Insert
  }
  Update: {
    id?: string
    user_id?: string
    client_id?: string
    invoice_number?: string
    status?: Database["public"]["Enums"]["invoice_status"]
    currency?: Database["public"]["Enums"]["currency_code"]
    issue_date?: string
    due_date?: string | null
    subtotal?: number
    tax_rate?: number
    notes?: string | null
    updated_at?: string
    // tax_amount and total are generated — NOT included in Update
  }
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
```

**4. New tables in `Tables` section — `invoice_items`:**
```typescript
invoice_items: {
  Row: {
    id: string
    invoice_id: string
    user_id: string
    description: string
    quantity: number
    unit_price: number
    amount: number | null            // generated column
    sort_order: number
  }
  Insert: {
    id?: string
    invoice_id: string
    user_id: string
    description: string
    quantity?: number
    unit_price: number
    sort_order?: number
    // amount is generated — NOT included in Insert
  }
  Update: {
    id?: string
    invoice_id?: string
    user_id?: string
    description?: string
    quantity?: number
    unit_price?: number
    sort_order?: number
    // amount is generated — NOT included in Update
  }
  Relationships: [
    {
      foreignKeyName: "invoice_items_invoice_id_fkey"
      columns: ["invoice_id"]
      isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    }
  ]
}
```

**5. Additions to existing `incomes` table:**
```typescript
// In incomes.Row: add
client_id: string | null

// In incomes.Insert: add
client_id?: string | null

// In incomes.Update: add
client_id?: string | null

// In incomes.Relationships: add
{
  foreignKeyName: "incomes_client_id_fkey"
  columns: ["client_id"]
  isOneToOne: false
  referencedRelation: "clients"
  referencedColumns: ["id"]
}
```

**6. Additions to existing `expenses` table:**
```typescript
// In expenses.Row: add
client_id: string | null

// In expenses.Insert: add
client_id?: string | null

// In expenses.Update: add
client_id?: string | null

// In expenses.Relationships: add
{
  foreignKeyName: "expenses_client_id_fkey"
  columns: ["client_id"]
  isOneToOne: false
  referencedRelation: "clients"
  referencedColumns: ["id"]
}
```

**7. Additions to existing `user_settings` table:**
```typescript
// In user_settings.Row: add
app_mode: string

// In user_settings.Insert: add
app_mode?: string

// In user_settings.Update: add
app_mode?: string
```

**8. Add `invoice_status` to `Constants` at bottom of file:**
```typescript
// In Constants.public.Enums: add
invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cascade behavior on client delete | Application-level cleanup logic | SQL FK `ON DELETE RESTRICT`/`SET NULL` | DB enforces referential integrity; no code path can bypass it |
| Unique invoice numbers | UUID or random string | `UNIQUE(user_id, invoice_number)` DB constraint | Concurrent inserts cannot produce duplicates; DB rejects them at the constraint level |
| Updated_at timestamp refresh | Manual timestamp update in app code | DB trigger or app-layer `updated_at: new Date().toISOString()` | Both work; explicit app-layer is simpler and consistent with how other tables omit this trigger |
| Type generation | Handwriting all generic utility types | Preserve existing `Tables<>`, `TablesInsert<>`, `TablesUpdate<>`, `Enums<>` helpers in `types.ts` | Downstream hooks use these generics; losing them would break every existing hook |

**Key insight:** PostgreSQL FK constraints with explicit `ON DELETE` clauses are the only reliable way to enforce cascade behavior. Application-layer checks can be bypassed by direct DB access, concurrent requests, or bugs. Always encode cascade semantics in the schema.

---

## Common Pitfalls

### Pitfall 1: Wrong Cascade on `invoices.client_id`
**What goes wrong:** Using `ON DELETE CASCADE` instead of `ON DELETE RESTRICT` causes all invoices to silently disappear when a user deletes a client. The user loses billing history permanently.
**Why it happens:** `ON DELETE CASCADE` is the default mental model for parent→child data; invoices feel like "children" of clients.
**How to avoid:** Explicitly use `ON DELETE RESTRICT`. Test it: insert a client with an invoice, try to delete the client via Supabase dashboard, confirm it returns a FK violation error.
**Warning signs:** If deleting a client succeeds without an error when that client has invoices, the constraint is wrong.

### Pitfall 2: Wrong Cascade on `incomes.client_id` / `expenses.client_id`
**What goes wrong:** Using `ON DELETE RESTRICT` here prevents a user from ever deleting a client they once tagged a transaction to — even if the business relationship has ended and they just want to clean up.
**Why it happens:** Treating the transaction-to-client link the same as the invoice-to-client link.
**How to avoid:** Use `ON DELETE SET NULL`. Test it: link an income to a client, delete the client, confirm the income row still exists with `client_id = NULL`.
**Warning signs:** If deleting a client returns a FK violation from the `incomes` or `expenses` table, the constraint is wrong.

### Pitfall 3: Generated Column Fields in Insert/Update Types
**What goes wrong:** Including `tax_amount`, `total`, or `amount` (on `invoice_items`) in the TypeScript `Insert`/`Update` types causes Supabase JS client errors at runtime because PostgreSQL rejects attempts to set a generated column.
**Why it happens:** The code author sees the field in `Row` and mirrors it to `Insert`/`Update` without realizing it is `GENERATED ALWAYS`.
**How to avoid:** Generated columns (`GENERATED ALWAYS AS ... STORED`) must appear in `Row` only. Never in `Insert` or `Update`.
**Warning signs:** Runtime error from Supabase: "cannot insert a non-DEFAULT value into column ... (generated always)".

### Pitfall 4: `DEFAULT_USER_SETTINGS` satisfies constraint breaks typecheck
**What goes wrong:** Adding `app_mode` to `user_settings.Row` in `types.ts` without adding `app_mode: 'simple'` to `DEFAULT_USER_SETTINGS` causes `npm run typecheck` to fail with a "Type '...' does not satisfy the expected type 'Omit<UserSettingsRow, "user_id">'".
**Why it happens:** The `satisfies` keyword enforces complete type conformance — adding a required field to `UserSettingsRow` requires it in the constant too.
**How to avoid:** Update `DEFAULT_USER_SETTINGS` in `src/hooks/useUserSettings.ts` immediately after editing `types.ts`. This is actually the desired behavior — typecheck will catch the omission.
**Warning signs:** `tsc --noEmit` error mentioning `DEFAULT_USER_SETTINGS` after types update.

### Pitfall 5: RLS Missing on a New Table
**What goes wrong:** A new table ships without `ENABLE ROW LEVEL SECURITY`, making all user data in that table visible to all authenticated users via the Supabase JS client.
**Why it happens:** Forgetting the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` line after `CREATE TABLE`.
**How to avoid:** The migration template always pairs `CREATE TABLE` + `CREATE INDEX` + `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY`. Never separate them. Verify in Supabase dashboard under Table Editor → each table's "RLS" column shows "Enabled".
**Warning signs:** A signed-in user can query another user's clients or invoices.

### Pitfall 6: Applying Migrations to Supabase Without CLI
**What goes wrong:** Assuming `supabase db push` or `supabase migration up` is available; the CLI is not installed.
**Why it happens:** Standard Supabase workflow expects the CLI.
**How to avoid:** Apply migrations via the Supabase Dashboard SQL Editor directly. Copy the full migration SQL and run it there. After running, check the Tables list and verify each new table, column, and policy exists.
**Warning signs:** Migration file exists in `supabase/migrations/` but table does not appear in Supabase dashboard.

### Pitfall 7: `UNIQUE(user_id, invoice_number)` vs Global Unique
**What goes wrong:** Making `invoice_number` globally unique (across all users) instead of per-user. User A's "INV-001" conflicts with User B's "INV-001".
**Why it happens:** Forgetting that invoice numbers are per-user, not global.
**How to avoid:** The constraint must be `UNIQUE(user_id, invoice_number)`, not `UNIQUE(invoice_number)`.
**Warning signs:** Second user to create invoice 001 gets a unique constraint violation.

---

## Code Examples

### Existing Hook Pattern to Follow for New Hooks (Phase 3+)

The `useIncomes.ts` hook shows the exact pattern all new hooks must follow:

```typescript
// Source: src/hooks/useIncomes.ts (actual codebase file)
export const useIncomes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['incomes', user?.id],
    queryFn: () => fetchIncomes(user!.id),
    enabled: !!user,
  });
};

// Mutation pattern with cache invalidation + activity log + analytics
export const useAddIncome = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: addIncome,
    onSuccess: (newIncome) => {
      queryClient.invalidateQueries({ queryKey: ['incomes', user?.id] });
      logActivity({ type: 'income', action: 'create', description: `Created income: ${newIncome.title}` });
      trackEvent('income_created', { incomeId: newIncome.id, status: newIncome.status });
    },
  });
};
```

New hooks in Phase 3 (`useClients.ts`, `useInvoices.ts`) must follow this identical pattern.

### ThemeContext localStorage Bootstrap Pattern

The Mode context (Phase 2) must mirror this exact pattern from `ThemeContext.tsx`:

```typescript
// Source: src/contexts/ThemeContext.tsx (actual codebase file)
const [theme, setThemeState] = useState<Theme>(() => {
  const stored = localStorage.getItem('theme') as Theme;
  return stored || 'light';  // Fast initial read from localStorage
});

// Reconcile with DB value when settings load
useEffect(() => {
  const nextTheme = settings?.theme;
  if (!nextTheme) return;
  setThemeState((prev) => (prev === nextTheme ? prev : nextTheme));
}, [settings?.theme]);
```

### ProtectedRoute Pattern for AdvancedRoute (Phase 2)

```typescript
// Source: src/components/ProtectedRoute.tsx (actual codebase file)
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}

// AdvancedRoute in Phase 2 follows the same shape:
// export function AdvancedRoute({ children }: { children: React.ReactNode }) {
//   const { isAdvanced } = useMode();
//   if (!isAdvanced) return <Navigate to="/" replace />;
//   return <>{children}</>;
// }
```

### Test Pattern (Supabase mock chain)

```typescript
// Source: src/hooks/useUserSettings.test.ts (actual codebase file)
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

// Chain mock pattern for builder methods:
const selectChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
};
mockedFrom.mockReturnValue(selectChain as never);
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Manual type files | `supabase gen types typescript` | CLI not available — manual edit required here |
| JSONB for line items | Separate normalized `invoice_items` table | Enables SQL aggregation; confirmed decision |
| Polymorphic junction table | Nullable FK directly on `incomes`/`expenses` | Confirmed decision — no FK integrity possible with polymorphic |
| Global invoice number sequence | `UNIQUE(user_id, invoice_number)` + application-side counter | Per-user uniqueness is correct; RPC for atomicity belongs in Phase 5 |

---

## Open Questions

1. **How to apply migrations without the Supabase CLI**
   - What we know: CLI not installed; project uses a hosted Supabase instance (project ID `zdumkdzverjivwxicclj`)
   - What's unclear: Whether migrations in `supabase/migrations/` are auto-applied on push to Lovable/hosting, or if manual SQL Editor execution is the expected workflow
   - Recommendation: The planner should include a task step to apply migration SQL via the Supabase Dashboard SQL Editor. The migration file should still be written to `supabase/migrations/` for version history, but execution requires manual dashboard action.

2. **`invoice_number` generation for concurrent safety**
   - What we know: `UNIQUE(user_id, invoice_number)` prevents duplicates at the DB level; the application must still generate the number before insert
   - What's unclear: How to safely generate sequential numbers when two tabs submit simultaneously. A `SELECT COUNT(*) + 1` approach races. An RPC with `SELECT FOR UPDATE` is the correct solution.
   - Recommendation: Phase 1 only needs the DB constraint. The atomicity mechanism (RPC function) is a Phase 5 concern per the STATE.md blocker note. The planner should NOT include the RPC in Phase 1 tasks — flag it as a Phase 5 prerequisite.

3. **`updated_at` auto-refresh mechanism**
   - What we know: `clients` and `invoices` have `updated_at` columns. The existing schema has no `updated_at` columns (existing tables only have `created_at`), so there is no established trigger for this.
   - What's unclear: Should `updated_at` be maintained by a DB trigger (most reliable) or by the application layer (consistent with existing pattern)?
   - Recommendation: The simplest approach consistent with the codebase is to pass `updated_at: new Date().toISOString()` in mutation payloads from the application. The DB trigger approach requires an additional migration step. Either is acceptable for Phase 1 schema — the migration should create the column with a default, and the hook implementation choice can be deferred to Phase 3.

---

## Sources

### Primary (HIGH confidence)
- `src/integrations/supabase/types.ts` — exact current schema, table structures, enum values, generic helper types
- `supabase/migrations/20260220111031_*.sql` — canonical migration pattern (CREATE TABLE, INDEX, RLS, POLICY)
- `supabase/migrations/20260220200000_add_net_worth_calc.sql` — ADD COLUMN IF NOT EXISTS pattern
- `src/hooks/useUserSettings.ts` — DEFAULT_USER_SETTINGS, satisfies constraint, update mutation pattern
- `src/hooks/useIncomes.ts` — hook and mutation template for future hooks
- `src/contexts/ThemeContext.tsx` — localStorage bootstrap pattern for Mode context
- `src/components/ProtectedRoute.tsx` — guard component template for AdvancedRoute
- `src/App.tsx` — provider chain insertion point confirmed
- `vite.config.ts` — manualChunks pattern for vendor-pdf chunk (Phase 5)
- `scripts/check-bundle-budget.mjs` — 350KB gzip budget enforced on `index-*.js`
- `.planning/research/STACK.md` — All technical decisions with HIGH confidence
- `.planning/research/ARCHITECTURE.md` — Schema SQL, RLS patterns, FK decisions
- `.planning/research/SUMMARY.md` — Pitfall list, phase ordering rationale

### Secondary (MEDIUM confidence)
- `supabase/config.toml` — project ID `zdumkdzverjivwxicclj` (confirms hosted Supabase)
- `package.json` scripts — `typecheck` = `tsc --noEmit`; `quality:ci` pipeline order

---

## Metadata

**Confidence breakdown:**
- Migration SQL: HIGH — patterns copied verbatim from existing migrations; FK semantics are well-understood PostgreSQL
- TypeScript types structure: HIGH — types.ts format is fully visible; new entries follow existing patterns exactly
- Supabase CLI absence: HIGH — confirmed via `which supabase`; impacts how migrations are applied
- Invoice number uniqueness: HIGH for DB constraint; MEDIUM for atomicity mechanism (deferred to Phase 5)
- `updated_at` trigger vs app-layer: MEDIUM — both approaches work; codebase has no precedent for triggers on this

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable domain — SQL schema patterns do not change)
