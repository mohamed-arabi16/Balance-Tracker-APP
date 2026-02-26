# Phase 6: Advanced Dashboard - Research

**Researched:** 2026-02-25
**Domain:** React dashboard widgets, client-side aggregation, Shadcn/ui cards, react-i18next
**Confidence:** HIGH

---

## Summary

Phase 6 fills the AdvancedDashboard stub (`src/pages/advanced/AdvancedDashboard.tsx`) with two data-heavy widgets. All the data required already exists in Supabase and is already fetched by hooks that ship from Phase 5. No new DB tables, migrations, or hooks are needed — this phase is entirely a UI build on top of existing infrastructure.

Widget 1 (DASH-01): Revenue per client — filter `invoices` where `status === 'paid'`, group by `client_id`, sum `invoice.total` for each group, then display sorted descending. The `clients` hook provides name lookup. Currency formatting uses `useCurrency()` which already handles multi-currency display via `formatCurrency()`.

Widget 2 (DASH-02): Outstanding invoices — filter `invoices` where DB `status === 'sent'` (both sent and overdue display states come from this), then apply `getDisplayStatus()` client-side to tag each as `sent` or `overdue`. Display them sorted by due date ascending (most urgent first), with a running total at the bottom. Both widgets share the same `useInvoices()` and `useClients()` calls — TanStack Query deduplicates the network requests automatically.

**Primary recommendation:** Implement both widgets in a single plan by directly editing `AdvancedDashboard.tsx` — no new files, no new hooks, no new routes required.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Advanced Dashboard shows each client with total amount received from paid invoices, reflecting user's selected currency | `useInvoices()` + `useClients()` provide all data; filter `status === 'paid'`, group by `client_id`, sum `total`; `formatCurrency()` handles currency display |
| DASH-02 | Advanced Dashboard shows outstanding invoices panel listing every Sent and Overdue invoice with amount owed and a total outstanding amount | Filter `status === 'sent'` from DB, apply `getDisplayStatus()` for sent/overdue split; `formatCurrency()` for totals; sort by `due_date` ascending |
</phase_requirements>

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `useInvoices` hook | — | Fetch all user invoices | Already exists in `src/hooks/useInvoices.ts`; exports `getDisplayStatus()` |
| `useClients` hook | — | Fetch all user clients for name lookup | Already exists in `src/hooks/useClients.ts` |
| `useCurrency` context | — | `formatCurrency(amount)` for display-currency formatting | Already used in `InvoicesPage.tsx`; handles USD/TRY conversion |
| `@shadcn/ui Card` | — | `Card`, `CardContent`, `CardHeader`, `CardTitle` | Consistent with all other pages in this project |
| `Skeleton` | — | Loading state | Used in `Dashboard.tsx` and `InvoicesPage.tsx` |
| `InvoiceStatusBadge` | — | Reuse existing overdue/sent badge | Already implements all status variants with i18n |
| `react-i18next` | — | `useTranslation()` for new i18n keys | Mandatory for all UI strings in this project |
| `lucide-react` | — | Icons (e.g., `Users`, `FileText`, `AlertCircle`) | Standard icon library already used everywhere |

**Installation:** None required. All dependencies already installed.

### Data Flow (no new queries needed)

```
useInvoices() → all invoices (cached by queryKeys.invoices(userId))
useClients()  → all clients  (cached by queryKeys.clients(userId))
```

Both are already available in memory from InvoicesPage / ClientsPage visits. TanStack Query serves them from cache. No extra Supabase calls needed.

---

## Architecture Patterns

### Recommended File Changes

```
src/pages/advanced/
└── AdvancedDashboard.tsx   ← ONLY FILE TO CHANGE (replace stub)

src/i18n/
└── index.ts                ← ADD new i18n keys (advancedDashboard.* namespace)
```

No new files, no new hooks, no new routes, no new components. One page edit, one i18n edit.

### Pattern 1: Client Revenue Aggregation (DASH-01)

**What:** Group paid invoices by `client_id`, sum `total` per group, resolve client names from the client map, sort descending by revenue.

**When to use:** Anywhere a derived summary is computed client-side from a flat list.

**Implementation:**

```typescript
// Source: verified from useInvoices.ts + useClients.ts in this codebase
const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
const { data: clients = [], isLoading: clientsLoading } = useClients();
const { formatCurrency } = useCurrency();

// Build O(1) client lookup
const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

// Aggregate paid invoices by client
const revenueByClient = invoices
  .filter((inv) => inv.status === 'paid')
  .reduce<Record<string, number>>((acc, inv) => {
    const key = inv.client_id ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + Number(inv.total ?? 0);
    return acc;
  }, {});

// Sort descending by revenue
const sortedRevenue = Object.entries(revenueByClient)
  .map(([clientId, total]) => ({
    clientId,
    clientName: clientMap[clientId]?.name ?? clientId,
    total,
  }))
  .sort((a, b) => b.total - a.total);
```

**CRITICAL:** `invoice.total` is a GENERATED column — it may be `null` in the type (`total: number | null`) but Supabase always computes it. Use `Number(inv.total ?? 0)` as a safe guard. Do NOT use `subtotal` as a substitute; `total` includes tax.

**CRITICAL:** `invoice.currency` is the currency the invoice was created in (USD or TRY). The `formatCurrency(amount)` function in `useCurrency` expects the amount in the user's display currency — BUT in this project, invoices store amounts in their own `currency` field. To correctly display revenue totals across mixed currencies you must use `convertCurrency(amount, inv.currency as Currency)` before summing, NOT raw `Number(inv.total)`.

```typescript
// Correct multi-currency aggregation (matches pattern in Dashboard.tsx / lib/finance.ts)
const { formatCurrency, convertCurrency } = useCurrency();

const revenueByClient = invoices
  .filter((inv) => inv.status === 'paid')
  .reduce<Record<string, number>>((acc, inv) => {
    const key = inv.client_id ?? 'unknown';
    const converted = convertCurrency(Number(inv.total ?? 0), inv.currency as Currency);
    acc[key] = (acc[key] ?? 0) + converted;
    return acc;
  }, {});
```

Then `formatCurrency(total)` renders the pre-converted value in display currency correctly.

### Pattern 2: Outstanding Invoices Panel (DASH-02)

**What:** Filter invoices where DB `status === 'sent'` (this includes both display-sent and display-overdue), derive display status via `getDisplayStatus()`, sort by `due_date` ascending (nulls last), show total.

**When to use:** Any list that needs to surface urgency ordering.

```typescript
// Source: verified from useInvoices.ts getDisplayStatus() and InvoicesPage.tsx filter pattern
import { getDisplayStatus } from '@/hooks/useInvoices';

const outstandingInvoices = invoices
  .filter((inv) => inv.status === 'sent')  // DB filter: only 'sent' rows
  .map((inv) => ({
    ...inv,
    displayStatus: getDisplayStatus(inv.status, inv.due_date),  // 'sent' | 'overdue'
    clientName: inv.client_id ? clientMap[inv.client_id]?.name : null,
  }))
  .sort((a, b) => {
    // Overdue first (they have a due_date in the past), then nulls last
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

const totalOutstanding = outstandingInvoices.reduce(
  (sum, inv) => sum + convertCurrency(Number(inv.total ?? 0), inv.currency as Currency),
  0,
);
```

### Pattern 3: Loading State

**What:** Single `isLoading` gate for both queries.

```typescript
const isLoading = invoicesLoading || clientsLoading;

if (isLoading) {
  return <AdvancedDashboardSkeleton />;
}
```

Follow the exact `DashboardSkeleton` pattern in `Dashboard.tsx` — dedicated skeleton component, `Skeleton` from shadcn/ui.

### Pattern 4: Empty States

Both widgets need empty states:

- Revenue: "No paid invoices yet" — shown when `sortedRevenue.length === 0`
- Outstanding: "All invoices paid or no sent invoices" — shown when `outstandingInvoices.length === 0`

Use `<p className="text-sm text-muted-foreground">` inside the `CardContent`, consistent with existing pages.

### Pattern 5: i18n Keys

New namespace: `advancedDashboard.*`

Required EN and AR keys (both languages required per project standard):

```
advancedDashboard.title
advancedDashboard.subtitle
advancedDashboard.revenue.title
advancedDashboard.revenue.subtitle
advancedDashboard.revenue.empty
advancedDashboard.revenue.total
advancedDashboard.outstanding.title
advancedDashboard.outstanding.subtitle
advancedDashboard.outstanding.empty
advancedDashboard.outstanding.total
advancedDashboard.outstanding.dueDate
advancedDashboard.outstanding.noDueDate
```

**Note from STATE.md:** `invoices.form.clientPlaceholder` key is used in InvoiceNewPage/InvoiceEditPage but missing from i18n/index.ts. Phase 6 should add it as part of i18n housekeeping — this is flagged as a cosmetic fix. Add to both EN and AR sections.

### Anti-Patterns to Avoid

- **Writing 'overdue' to DB:** `getDisplayStatus()` derives overdue client-side. Never pass 'overdue' to any mutation or DB filter.
- **Filtering with displayStatus for DB queries:** Always filter on DB `status` field (`'sent'`, `'paid'`), then apply `getDisplayStatus()` for display labeling.
- **Using `subtotal` instead of `total`:** `total` includes tax and is the authoritative invoice amount. `subtotal` is pre-tax only.
- **Raw number formatting without currency conversion:** Invoices have their own `currency` field. Always use `convertCurrency(amount, inv.currency)` before summing.
- **Separate hooks for dashboard data:** `useInvoices()` and `useClients()` already provide everything. Do not create new hooks or new Supabase queries.
- **Modifying Dashboard.tsx:** Success criterion 3 explicitly states the Simple mode Dashboard.tsx MUST NOT be modified.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency-aware summation | Custom reduce with raw totals | `convertCurrency()` from `useCurrency()` + `sumInDisplayCurrency()` pattern from `lib/finance.ts` | Handles USD/TRY conversion, respects user settings, fallback rates |
| Overdue detection | Date comparison logic | `getDisplayStatus()` from `useInvoices.ts` | Already handles timezone-safe `isBefore(parseISO(due_date), new Date())` via date-fns |
| Invoice status badge | Custom badge component | `InvoiceStatusBadge` from `src/components/invoice/InvoiceStatusBadge.tsx` | Already color-coded, i18n-aware, handles all 5 statuses |
| Client name lookup | Extra Supabase query per invoice | In-memory `clientMap` from `useClients()` result | O(1) lookup; data already cached by React Query |
| Loading skeletons | Spinners or null | `Skeleton` from `@/components/ui/skeleton` | Consistent with all other pages |
| Summary cards layout | Custom CSS | `Card`, `CardContent`, `CardHeader`, `CardTitle` from Shadcn | Consistent border, shadow, dark mode behavior |

**Key insight:** This phase is 100% a UI composition task. Every hard problem (currency, overdue logic, loading, status display) is already solved in prior phases.

---

## Common Pitfalls

### Pitfall 1: Treating `invoice.currency` as the display currency

**What goes wrong:** Summing `invoice.total` values directly without conversion produces incorrect totals when invoices are in mixed currencies (e.g., some USD, some TRY).

**Why it happens:** `invoice.currency` is the currency the invoice was created in, which may differ from the user's selected display currency.

**How to avoid:** Always call `convertCurrency(Number(inv.total ?? 0), inv.currency as Currency)` before accumulating totals. This is the pattern used in `Dashboard.tsx` and `lib/finance.ts`.

**Warning signs:** Revenue totals that don't match manually summed invoice values; totals that ignore user currency preference.

### Pitfall 2: Filtering outstanding invoices by displayStatus instead of DB status

**What goes wrong:** Filtering with `getDisplayStatus() === 'overdue'` misses invoices that are `sent` but not yet past due date — these should ALSO appear in outstanding.

**Why it happens:** Confusion between DB status ('sent') and display status ('sent' or 'overdue').

**How to avoid:** Filter on `inv.status === 'sent'` (DB value), then use `getDisplayStatus()` only for visual rendering (badge color, label).

**Warning signs:** Outstanding panel only shows overdue items, missing sent invoices that haven't passed due date yet.

### Pitfall 3: `invoice.total` being null

**What goes wrong:** TypeScript types show `total: number | null`. A null total in arithmetic silently becomes NaN.

**Why it happens:** The Supabase generated column is typed as nullable in the TypeScript types, though in practice it should always be computed.

**How to avoid:** Always use `Number(inv.total ?? 0)` — this matches the pattern already established in `InvoicesPage.tsx` line 104: `Number(invoice.total ?? invoice.subtotal ?? 0)`.

### Pitfall 4: Clients without names in the revenue widget

**What goes wrong:** Invoice has `client_id` but that client was deleted (though unlikely due to ON DELETE RESTRICT on invoices, not theoretically impossible via direct DB).

**Why it happens:** Race condition or direct DB manipulation.

**How to avoid:** Defensive fallback: `clientMap[clientId]?.name ?? t('common.notAvailable')` or `clientMap[clientId]?.name ?? clientId`.

### Pitfall 5: Missing AR translations

**What goes wrong:** App shows English keys as fallback strings in Arabic mode.

**Why it happens:** Adding EN keys but forgetting the AR block in `i18n/index.ts`.

**How to avoid:** When adding keys to the `en.translation` block, immediately add matching keys to the `ar.translation` block in the same edit. The i18n file has both in one file — EN block ends around line 513, AR block starts at line 515.

### Pitfall 6: Touching Dashboard.tsx

**What goes wrong:** Success criterion 3 is violated — Simple mode regression.

**Why it happens:** Developer instinct to extract shared logic.

**How to avoid:** `AdvancedDashboard.tsx` is a completely separate page. Any shared logic that DOES emerge (unlikely) should go in a utility function, never by modifying `Dashboard.tsx`.

---

## Code Examples

### Revenue Widget Skeleton Structure

```tsx
// Source: verified pattern from src/pages/Dashboard.tsx and src/pages/advanced/InvoicesPage.tsx

import { useInvoices, getDisplayStatus } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Currency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { InvoiceStatusBadge } from '@/components/invoice/InvoiceStatusBadge';

export default function AdvancedDashboard() {
  const { t } = useTranslation();
  const { formatCurrency, convertCurrency } = useCurrency();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const isLoading = invoicesLoading || clientsLoading;
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  // DASH-01: Revenue per client
  const revenueByClient = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce<Record<string, number>>((acc, inv) => {
      const key = inv.client_id;
      const converted = convertCurrency(Number(inv.total ?? 0), inv.currency as Currency);
      acc[key] = (acc[key] ?? 0) + converted;
      return acc;
    }, {});

  const sortedRevenue = Object.entries(revenueByClient)
    .map(([clientId, total]) => ({
      clientId,
      clientName: clientMap[clientId]?.name ?? t('common.notAvailable'),
      total,
    }))
    .sort((a, b) => b.total - a.total);

  // DASH-02: Outstanding invoices
  const outstandingInvoices = invoices
    .filter((inv) => inv.status === 'sent')
    .map((inv) => ({
      ...inv,
      displayStatus: getDisplayStatus(inv.status, inv.due_date),
      clientName: inv.client_id ? clientMap[inv.client_id]?.name : null,
    }))
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + convertCurrency(Number(inv.total ?? 0), inv.currency as Currency),
    0,
  );

  if (isLoading) return <AdvancedDashboardSkeleton />;

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {t('advancedDashboard.title')}
        </h1>
        <p className="text-muted-foreground">{t('advancedDashboard.subtitle')}</p>
      </div>

      {/* DASH-01: Revenue per client */}
      <Card>
        <CardHeader>
          <CardTitle>{t('advancedDashboard.revenue.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedRevenue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('advancedDashboard.revenue.empty')}
            </p>
          ) : (
            <div className="space-y-2">
              {sortedRevenue.map(({ clientId, clientName, total }) => (
                <div key={clientId} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium">{clientName}</span>
                  <span className="font-bold">{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DASH-02: Outstanding invoices */}
      <Card>
        <CardHeader>
          <CardTitle>{t('advancedDashboard.outstanding.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {outstandingInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('advancedDashboard.outstanding.empty')}
            </p>
          ) : (
            <div className="space-y-2">
              {outstandingInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {t('invoices.number', { number: inv.invoice_number })}
                      </span>
                      <InvoiceStatusBadge status={inv.displayStatus} />
                    </div>
                    {inv.clientName && (
                      <p className="text-xs text-muted-foreground">{inv.clientName}</p>
                    )}
                  </div>
                  <span className="font-bold flex-shrink-0 ml-4">
                    {formatCurrency(convertCurrency(Number(inv.total ?? 0), inv.currency as Currency))}
                  </span>
                </div>
              ))}
              {/* Total outstanding */}
              <div className="flex items-center justify-between pt-3 border-t font-semibold">
                <span>{t('advancedDashboard.outstanding.total')}</span>
                <span>{formatCurrency(totalOutstanding)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdvancedDashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
```

### i18n Keys to Add

```typescript
// Source: verified against existing i18n/index.ts structure

// EN block (add after invoices section, before "sidebar.footer"):
"advancedDashboard.title": "Advanced Dashboard",
"advancedDashboard.subtitle": "Your freelance business at a glance",
"advancedDashboard.revenue.title": "Revenue per Client",
"advancedDashboard.revenue.subtitle": "Total earned from paid invoices",
"advancedDashboard.revenue.empty": "No paid invoices yet.",
"advancedDashboard.outstanding.title": "Outstanding Invoices",
"advancedDashboard.outstanding.subtitle": "Sent and overdue invoices",
"advancedDashboard.outstanding.empty": "No outstanding invoices.",
"advancedDashboard.outstanding.total": "Total Outstanding",

// AR block (add in matching position in ar.translation):
"advancedDashboard.title": "لوحة التحكم المتقدمة",
"advancedDashboard.subtitle": "نظرة شاملة على أعمالك المستقلة",
"advancedDashboard.revenue.title": "الإيرادات لكل عميل",
"advancedDashboard.revenue.subtitle": "الإجمالي المحصل من الفواتير المدفوعة",
"advancedDashboard.revenue.empty": "لا توجد فواتير مدفوعة بعد.",
"advancedDashboard.outstanding.title": "الفواتير المستحقة",
"advancedDashboard.outstanding.subtitle": "الفواتير المرسلة والمتأخرة",
"advancedDashboard.outstanding.empty": "لا توجد فواتير مستحقة.",
"advancedDashboard.outstanding.total": "إجمالي المستحق",
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Separate Supabase view for aggregations | Client-side reduce + React Query cache | Sufficient at this data scale; no new migrations needed |
| Per-request DB aggregation (SUM in SQL) | In-memory aggregation after `useInvoices()` fetch | Hooks already used throughout; React Query cache means zero extra network cost |
| Dedicated dashboard data hook | Reuse existing `useInvoices()` + `useClients()` | Phase 3-4 decision: hooks are composable, not monolithic |

**No deprecated patterns** need updating for this phase.

---

## Open Questions

1. **Currency mismatch in revenue totals**
   - What we know: Invoices have their own `currency` field (USD or TRY), which may differ from the user's display currency.
   - What's unclear: Whether the project intends revenue totals to show in display currency (converted) or in invoice-native currency (raw). Dashboard.tsx uses `convertCurrency()` for all financial summaries — this is the established pattern.
   - Recommendation: Use `convertCurrency()` consistent with Dashboard.tsx. Display a currency indicator (e.g., "All amounts in USD") so users understand the basis.

2. **invoices.form.clientPlaceholder missing from i18n**
   - What we know: STATE.md flags `invoices.form.clientPlaceholder` as used in InvoiceNewPage and InvoiceEditPage but missing from i18n/index.ts. Cosmetic only.
   - Recommendation: Add it to both EN and AR blocks during Phase 6 i18n work as a low-cost fix.

---

## Sources

### Primary (HIGH confidence)

- `src/hooks/useInvoices.ts` — confirmed: `getDisplayStatus()`, `useInvoices()`, `Invoice` type, `total: number | null`
- `src/hooks/useClients.ts` — confirmed: `useClients()`, `Client` type
- `src/contexts/CurrencyContext.tsx` — confirmed: `formatCurrency(amount, fromCurrency?)`, `convertCurrency(amount, fromCurrency)`
- `src/lib/finance.ts` — confirmed: `sumInDisplayCurrency()` pattern for multi-currency aggregation
- `src/pages/advanced/AdvancedDashboard.tsx` — confirmed: current stub, nothing to preserve
- `src/pages/Dashboard.tsx` — confirmed: skeleton pattern, `bg-gradient-dashboard` class, card layout
- `src/pages/advanced/InvoicesPage.tsx` — confirmed: `clientMap` pattern, `getDisplayStatus()` usage, `formatCurrency()` call
- `src/i18n/index.ts` — confirmed: EN + AR structure, existing `invoices.*` and `nav.advanced.dashboard` keys, no `advancedDashboard.*` keys yet
- `src/components/invoice/InvoiceStatusBadge.tsx` — confirmed: reusable, handles all 5 statuses with i18n
- `src/components/ui/financial-card.tsx` — confirmed: `FinancialCard` component available (optional use for revenue summary)
- `src/integrations/supabase/types.ts` — confirmed: `invoices.Row.total: number | null`, `invoices.Row.currency: currency_code`, `invoices.Row.status: invoice_status`
- `src/lib/queryKeys.ts` — confirmed: `queryKeys.invoices()`, `queryKeys.clients()` already defined
- `.planning/STATE.md` — confirmed: decisions log, known blockers (missing i18n key), phase constraints
- `.planning/ROADMAP.md` — confirmed: DASH-01, DASH-02 requirements, success criteria

### Secondary (MEDIUM confidence)

- TanStack Query v5 deduplication behavior (multiple `useInvoices()` calls in one render tree share one network request) — consistent with project's Phase 3 decisions documented in STATE.md

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified by direct file reads
- Architecture: HIGH — patterns verified from 5 completed phases of this same codebase
- Data model: HIGH — types.ts and hooks read directly
- i18n: HIGH — index.ts read in full, structure confirmed
- Pitfalls: HIGH — derived from existing decisions in STATE.md and direct type inspection

**Research date:** 2026-02-25
**Valid until:** Stable — no external dependencies being introduced; all sources are project-internal files
