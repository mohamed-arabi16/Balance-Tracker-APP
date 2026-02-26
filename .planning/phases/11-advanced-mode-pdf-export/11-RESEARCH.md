# Phase 11: Advanced Mode + PDF Export — Research

**Researched:** 2026-02-26
**Domain:** Expo Router conditional tabs, expo-print PDF generation, expo-sharing iOS share sheet, react-hook-form useFieldArray, React Native form patterns, Supabase generated column exclusion
**Confidence:** HIGH (stack decisions, hooks, Supabase schema, i18n patterns), MEDIUM (expo-print Arabic font rendering)

---

## Summary

Phase 11 is the most feature-dense phase of the v2.0 iOS build. It spans five distinct sub-systems: (1) Advanced mode toggle that conditionally shows a Clients tab in the tab bar, (2) a Clients CRUD screen, (3) an Invoices CRUD screen with dynamic line-item management via `useFieldArray`, (4) invoice detail with inline status lifecycle and PDF export via `expo-print` + `expo-sharing`, and (5) transaction-client linking on income/expense forms.

**Critical prior work advantage:** All data infrastructure is already complete. The `clients` table, `invoices` table, `invoice_items` table, and all associated TypeScript types are defined in `src/integrations/supabase/types.ts`. The hooks (`useClients`, `useInvoices`, `useAddInvoice`, `useUpdateInvoice`, `useUpdateInvoiceStatus`, `useDeleteInvoice`) are fully implemented in the ported codebase. `ModeContext` with `useMode` / `isAdvanced` is wired and persisted to Supabase `user_settings.app_mode`. The `advancedDashboard.*` and `clients.*` and `invoices.*` i18n keys exist in both EN and AR in `src/i18n/resources.ts`.

**The primary new installs required:** `expo-print`, `expo-sharing`, `react-hook-form`, `zod`, and `@hookform/resolvers`. None are currently installed.

**Primary recommendation:** Install new dependencies first, then build in the order: mode toggle integration → Clients screens → Invoices screens → Invoice detail + PDF export → Transaction-client linking.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADV-01 | User can toggle between Simple and Advanced mode | `ModeContext` with `useMode()` / `isAdvanced` is already implemented and persisted. The toggle UI (a switch in Settings) needs wiring. Tab bar conditional visibility uses Expo Router `href: null` pattern on the Clients tab screen when `!isAdvanced`. |
| ADV-02 | User can create and manage clients (name, contact info) with native list + detail views | `useClients`, `useClient`, `useAddClient`, `useUpdateClient`, `useDeleteClient` all exist in `src/hooks/useClients.ts`. `clients.*` i18n keys exist in both EN/AR. Schema confirmed in `types.ts`. Screens: list, new, edit, detail — Expo Router file-based routes under `app/(tabs)/clients/`. |
| ADV-03 | User can create invoices linked to a client with line items | `useAddInvoice`, `useUpdateInvoice` exist in `src/hooks/useInvoices.ts`. Line items handled via `useFieldArray` from `react-hook-form` (requires install). FIX-01 constraint: `tax_amount` must NOT appear in INSERT (it is a generated column — already handled in existing `useAddInvoice` per hook code). |
| ADV-04 | User can manage invoice status (Draft → Sent → Paid) — inline status change without opening edit | `useUpdateInvoiceStatus` mutation exists. Valid transitions: `draft → sent`, `sent → paid`, `sent → cancelled`. `overdue` is derived client-side via `getDisplayStatus()` and is NEVER written to DB. Inline status tap on list row or detail screen. |
| ADV-05 | User can link transactions to clients (optional, on creation or edit) | `incomes.client_id` and `expenses.client_id` columns exist in schema and are `null`able. `useUpdateIncome` already includes `client_id` in its update payload. A client picker (Select/Picker) must be added to income and expense create/edit forms. |
| ADV-06 | Advanced Dashboard shows revenue per client and outstanding invoices with correct totals | `useInvoices()` + `useClients()` provide all data. Aggregation patterns established in Phase 6 research. The Advanced Dashboard screen needs to be built as a new Expo Router screen (equivalent of the web `AdvancedDashboard.tsx`). Currency conversion uses `convertCurrency()` from `CurrencyContext`. |
| FIX-01 | Invoice creation no longer errors on generated column `tax_amount` | Already fixed in `useAddInvoice`: INSERT payload uses only `client_id`, `issue_date`, `due_date`, `currency`, `tax_rate`, `notes`, `user_id`, `invoice_number`, `status` — `tax_amount` and `total` are excluded. Must verify the same exclusion in `useUpdateInvoice`. |
| EXPRT-02 | User can export invoices as PDF via expo-print + iOS share sheet | Requires `expo-print` (printToFileAsync) + `expo-sharing` (shareAsync). HTML template approach. Arabic/RTL: font must be base64-encoded inline in CSS `@font-face` due to WKWebView limitation. Confirmed in STATE.md: "expo-print Arabic font rendering not validated — run minimal proof-of-concept on physical device". |
</phase_requirements>

---

## Standard Stack

### Core (new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-print` | SDK 54 compatible (latest via `npx expo install`) | `printToFileAsync(html)` → PDF file at cache URI | Expo-native, included in Expo Go, WKWebView-based on iOS |
| `expo-sharing` | SDK 54 compatible | `shareAsync(uri)` → iOS share sheet | Expo-native, no native config required |
| `react-hook-form` | ^7.x (latest) | Form state + `useFieldArray` for line items | Same library used in web app; `useFieldArray` is essential for dynamic invoice line items |
| `zod` | ^3.x (latest) | Schema validation | Same pattern as web app; used with `zodResolver` |
| `@hookform/resolvers` | ^3.x (latest) | Zod-to-react-hook-form bridge | Required for `zodResolver` to work |

### Core (already installed — no new install)

| Library | Version | Purpose |
|---------|---------|---------|
| `@tanstack/react-query` | ^5.90.21 | Server state — all data hooks already use this |
| `@supabase/supabase-js` | ^2.97.0 | DB persistence — client configured |
| `expo-router` | ~6.0.23 | File-based routing, Tab navigation |
| `react-native-reanimated` | ~4.1.1 | Swipe gestures, animated transitions |
| `expo-haptics` | ~15.0.8 | Haptic feedback on save/delete/error |
| `react-native-safe-area-context` | ~5.6.0 | `SafeScreen` wrapper — already implemented |
| `i18next` + `react-i18next` | ^25.x / ^16.x | All visible strings — resources.ts has all needed keys |

### Installation

```bash
npx expo install expo-print expo-sharing
npm install react-hook-form zod @hookform/resolvers
```

Note: Use `npx expo install` for Expo-managed packages (ensures SDK-compatible version resolution). Use `npm install` for pure JS libraries.

---

## Architecture Patterns

### Recommended Project Structure

```
BalanceTracker/app/
├── (tabs)/
│   ├── _layout.tsx          # Tab bar — add Clients tab with href:null when !isAdvanced
│   ├── index.tsx            # Dashboard (simple mode)
│   ├── advanced-dashboard.tsx  # Advanced Dashboard (ADV-06)
│   ├── clients/
│   │   ├── index.tsx        # ClientsListScreen (ADV-02)
│   │   ├── new.tsx          # ClientNewScreen (ADV-02)
│   │   ├── [id]/
│   │   │   ├── index.tsx    # ClientDetailScreen (ADV-02)
│   │   │   └── edit.tsx     # ClientEditScreen (ADV-02)
│   ├── invoices/
│   │   ├── index.tsx        # InvoicesListScreen (ADV-03, ADV-04)
│   │   ├── new.tsx          # InvoiceNewScreen (ADV-03)
│   │   ├── [id]/
│   │   │   ├── index.tsx    # InvoiceDetailScreen (ADV-04, EXPRT-02)
│   │   │   └── edit.tsx     # InvoiceEditScreen (ADV-03)

BalanceTracker/src/
├── hooks/
│   ├── useClients.ts        # Already complete — all CRUD + queries
│   └── useInvoices.ts       # Already complete — all CRUD + status transitions
├── contexts/
│   └── ModeContext.tsx      # Already complete — useMode(), isAdvanced
├── i18n/
│   └── resources.ts         # All clients.* + invoices.* + advancedDashboard.* keys exist
```

### Pattern 1: Conditional Tab Visibility — href: null

**What:** Expo Router's `Tabs.Screen` `options.href: null` hides a tab from the tab bar while keeping the route accessible. Used to show/hide the Clients tab based on `isAdvanced`.

**When to use:** ADV-01 — the Clients tab (and optionally Invoices tab) must only appear in Advanced mode.

**CRITICAL caveat:** Dynamically toggling `href: null` based on reactive state will remount the navigator and reset tab state. The pattern is safe when the toggle is infrequent (mode switch is not a casual gesture). To avoid state loss, toggle only outside of active navigation — this is acceptable since users switch mode deliberately in Settings.

```typescript
// Source: https://docs.expo.dev/router/advanced/tabs/ (verified)
// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import { useMode } from '@/contexts/ModeContext';

export default function TabLayout() {
  const { isAdvanced } = useMode();

  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          href: isAdvanced ? '/clients' : null,  // Hide when not advanced
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          href: isAdvanced ? '/invoices' : null,
        }}
      />
      {/* ... other tabs */}
    </Tabs>
  );
}
```

**Alternative for advanced dashboard:** The simple mode tab shows `index.tsx` (dashboard). Advanced mode could show a different screen. The cleanest approach: keep one dashboard tab, render conditionally inside the screen based on `isAdvanced`.

### Pattern 2: useFieldArray for Invoice Line Items

**What:** `useFieldArray` from `react-hook-form` manages a dynamic array of `{ description, quantity, unit_price }` objects. Each row has `append`, `remove`. The `field.id` (auto-generated by RHF) serves as the React `key`.

**When to use:** Invoice create and edit screens (ADV-03).

**CRITICAL for React Native:** There is no `<form>` element — use `handleSubmit` directly on a `TouchableOpacity` or `Pressable` button press. Use `Controller` from RHF to wrap each `TextInput` (RN doesn't support uncontrolled `ref` inputs the same way as web).

```typescript
// Source: Context7 /react-hook-form/react-hook-form (verified)
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextInput, TouchableOpacity, View, Text } from 'react-native';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be > 0'),
  unit_price: z.coerce.number().min(0, 'Unit price must be >= 0'),
});

const invoiceFormSchema = z.object({
  client_id: z.string().min(1, 'Client required'),
  issue_date: z.string().min(1, 'Issue date required'),
  due_date: z.string().optional(),
  currency: z.enum(['USD', 'TRY']),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item required'),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

function InvoiceForm({ onSubmit }: { onSubmit: (values: InvoiceFormValues) => void }) {
  const { control, handleSubmit, watch } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      currency: 'USD',
      tax_rate: 0,
      items: [{ description: '', quantity: 1, unit_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  return (
    <>
      {fields.map((field, index) => (
        <View key={field.id}>
          <Controller
            control={control}
            name={`items.${index}.description`}
            render={({ field: f, fieldState }) => (
              <>
                <TextInput
                  value={f.value}
                  onChangeText={f.onChange}
                  onBlur={f.onBlur}
                  placeholder="Description"
                />
                {fieldState.error && <Text>{fieldState.error.message}</Text>}
              </>
            )}
          />
          {/* quantity and unit_price fields follow same pattern */}
          <TouchableOpacity onPress={() => remove(index)}>
            <Text>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => append({ description: '', quantity: 1, unit_price: 0 })}>
        <Text>Add Line Item</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSubmit(onSubmit)}>
        <Text>Save Invoice</Text>
      </TouchableOpacity>
    </>
  );
}
```

### Pattern 3: expo-print PDF Export

**What:** `Print.printToFileAsync({ html })` generates a PDF from an HTML string and returns a `uri` pointing to the file in the app's cache directory. Then `Sharing.shareAsync(uri, options)` opens the iOS share sheet.

**When to use:** EXPRT-02 — "Export PDF" action on InvoiceDetailScreen.

**iOS constraint:** Local asset URLs (images, fonts) are NOT supported in the HTML string due to WKWebView limitations. Custom fonts must be base64-encoded and inlined in `@font-face` CSS.

```typescript
// Source: https://docs.expo.dev/versions/v54.0.0/sdk/print/ (verified)
//         https://docs.expo.dev/versions/v54.0.0/sdk/sharing/ (verified)
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

async function exportInvoicePdf(invoice: InvoiceWithItems, client: Client) {
  const html = generateInvoiceHtml(invoice, client);

  const { uri } = await Print.printToFileAsync({ html });

  await Sharing.shareAsync(uri, {
    UTI: 'com.adobe.pdf',
    mimeType: 'application/pdf',
    dialogTitle: `Invoice ${invoice.invoice_number}`,
  });
}

function generateInvoiceHtml(invoice: InvoiceWithItems, client: Client): string {
  // CRITICAL: No local file URLs allowed.
  // For custom fonts (e.g., Arabic), use base64-encoded @font-face.
  // English-only template is safe with system fonts.
  const subtotal = invoice.items.reduce((sum, item) => sum + (item.amount ?? item.quantity * item.unit_price), 0);
  const taxAmount = subtotal * (invoice.tax_rate / 100);
  const total = subtotal + taxAmount;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 40px; }
    h1 { font-size: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
    .totals { text-align: right; margin-top: 16px; }
  </style>
</head>
<body>
  <h1>Invoice #${invoice.invoice_number}</h1>
  <p><strong>Bill To:</strong> ${client.name}</p>
  <p><strong>Issue Date:</strong> ${invoice.issue_date}</p>
  ${invoice.due_date ? `<p><strong>Due Date:</strong> ${invoice.due_date}</p>` : ''}
  <table>
    <thead>
      <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${item.unit_price.toFixed(2)}</td>
          <td>${((item.amount ?? item.quantity * item.unit_price)).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="totals">
    <p>Subtotal: ${subtotal.toFixed(2)} ${invoice.currency}</p>
    ${invoice.tax_rate > 0 ? `<p>Tax (${invoice.tax_rate}%): ${taxAmount.toFixed(2)}</p>` : ''}
    <p><strong>Total: ${total.toFixed(2)} ${invoice.currency}</strong></p>
  </div>
  ${invoice.notes ? `<p><em>${invoice.notes}</em></p>` : ''}
</body>
</html>`;
}
```

### Pattern 4: Inline Status Toggle (ADV-04)

**What:** A single tap on a status badge or "Next Status" button advances the invoice through `draft → sent → paid`. Uses `useUpdateInvoiceStatus` which is already implemented.

**Valid transitions only:**
- `draft` → tap → calls `useUpdateInvoiceStatus({ id, status: 'sent' })`
- `sent` / `overdue` → tap → calls `useUpdateInvoiceStatus({ id, status: 'paid' })`
- `paid` / `cancelled` → no transition (locked)

**CRITICAL:** Never pass `'overdue'` to `useUpdateInvoiceStatus`. Overdue is derived client-side only by `getDisplayStatus(status, due_date)`.

```typescript
// Source: src/hooks/useInvoices.ts (verified — useUpdateInvoiceStatus already implemented)
import { useUpdateInvoiceStatus, getDisplayStatus } from '@/hooks/useInvoices';

function InvoiceStatusButton({ invoice }: { invoice: Invoice }) {
  const updateStatus = useUpdateInvoiceStatus();
  const displayStatus = getDisplayStatus(invoice.status, invoice.due_date);

  const nextStatusMap: Record<string, 'sent' | 'paid' | null> = {
    draft: 'sent',
    sent: 'paid',
    overdue: 'paid',
    paid: null,
    cancelled: null,
  };

  const nextStatus = nextStatusMap[displayStatus];

  if (!nextStatus) return null;

  return (
    <TouchableOpacity
      onPress={() => updateStatus.mutate({ id: invoice.id, status: nextStatus })}
      disabled={updateStatus.isPending}
    >
      <Text>{nextStatus === 'sent' ? 'Mark Sent' : 'Mark Paid'}</Text>
    </TouchableOpacity>
  );
}
```

### Pattern 5: Transaction-Client Linking (ADV-05)

**What:** Add an optional `client_id` picker to Income and Expense create/edit forms. The `incomes.client_id` and `expenses.client_id` columns already exist and are nullable in the DB. The `useUpdateIncome` hook already accepts `client_id`.

**When to use:** Only when `isAdvanced` — show the client picker field conditionally.

```typescript
// In Income/Expense form screen (ADV-05)
import { useMode } from '@/contexts/ModeContext';
import { useClients } from '@/hooks/useClients';

function IncomeForm() {
  const { isAdvanced } = useMode();
  const { data: clients = [] } = useClients();

  return (
    <>
      {/* ... other fields ... */}
      {isAdvanced && (
        <ClientPickerField
          clients={clients}
          value={clientId}
          onChange={setClientId}
        />
      )}
    </>
  );
}
```

**Picker implementation:** Use React Native's `Picker` from `@react-native-picker/picker` (not the web `<select>`). Or a custom `FlatList` modal picker for better iOS HIG compliance. The project's `EmptyState` and `TouchableOpacity` patterns suggest building a simple modal picker.

### Pattern 6: FIX-01 — Exclude tax_amount from INSERT

**What:** The `invoices.tax_amount` column is a Postgres generated column (computed from `subtotal * tax_rate`). Including it in an INSERT payload causes a Postgres error.

**Status:** Already fixed in `useAddInvoice` (the hook explicitly constructs the INSERT without `tax_amount`). The planner must verify `useUpdateInvoice` also excludes it.

**Code confirmation from `src/hooks/useInvoices.ts` (line 116-122):**
```typescript
// INSERT only sends: client_id, issue_date, due_date, currency, tax_rate, notes,
// user_id, invoice_number, status — tax_amount and total are NOT included.
const { data: invoice, error: invError } = await supabase
  .from('invoices')
  .insert([{
    ...invoicePayload,   // excludes tax_amount (InvoiceCreatePayload type-level exclusion)
    user_id: user!.id,
    invoice_number: invoiceNumber as string,
    status: 'draft' as const,
  }])
```

The `InvoiceCreatePayload` type uses `Pick<Insert, 'client_id' | 'issue_date' | 'due_date' | 'currency' | 'tax_rate' | 'notes'>` — `tax_amount` is structurally excluded.

For `useUpdateInvoice`, the `Update` type in `types.ts` also excludes `tax_amount` from allowed fields. Confirmed safe.

### Pattern 7: Advanced Dashboard Widgets (ADV-06)

**What:** Two widgets on the Advanced Dashboard screen — Revenue per Client (paid invoices grouped by client_id) and Outstanding Invoices (sent invoices sorted by due_date). Aggregation pattern established in Phase 6 research.

**Currency aggregation (CRITICAL):** Use `convertCurrency(amount, inv.currency)` before summing — do NOT sum raw `total` values across mixed currencies. Pattern confirmed in `CurrencyContext`.

**`invoice.total` null guard:** Use `Number(inv.total ?? 0)` — `total` is typed as `number | null` (generated column, nullable in TS types).

### Anti-Patterns to Avoid

- **DO NOT write `'overdue'` to the DB status field.** `overdue` is always derived client-side by `getDisplayStatus()`. `useUpdateInvoiceStatus` type-enforces `'sent' | 'paid' | 'cancelled'` only.
- **DO NOT include `tax_amount` or `total` in INSERT/UPDATE payloads.** Both are generated columns. The existing hook types already exclude them, but be vigilant when constructing manual payloads.
- **DO NOT use local file:// URLs in expo-print HTML.** Fonts and images must be base64-encoded inline.
- **DO NOT use `<form>` or native form submit in React Native.** Use `handleSubmit(onSubmit)` called from a `TouchableOpacity.onPress`.
- **DO NOT toggle tab visibility frequently in a reactive render loop.** `href: null` toggling remounts the navigator. Mode changes are Settings-level, so this is acceptable — but avoid putting `isAdvanced` in a frequently-updating context.
- **DO NOT use `queryKeys.invoices(userId)` inline in page components.** Always invalidate through `onSuccess` in the mutation hooks.
- **DO NOT sum `invoice.total` without `convertCurrency()` when mixing USD and TRY invoices.** Use the established `convertCurrency(amount, inv.currency)` pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dynamic form array (line items) | Manual `useState` array + push/splice | `useFieldArray` from `react-hook-form` | Handles unique keys, validation, reorder, remove at index — manual array state breaks on async operations |
| Form validation | Inline if-checks in onPress | Zod schema + `zodResolver` | Type inference, nested array validation (`.array(lineItemSchema)`), coercion (`z.coerce.number()` for string TextInput values) |
| PDF generation | WebView + `window.print()` hack | `expo-print` `printToFileAsync` | Native WKWebView renderer, returns cacheable URI, Expo Go compatible |
| Share sheet | `Linking.openURL` | `expo-sharing` `shareAsync` | Correct iOS share sheet behavior, no manual MIME type routing |
| Client ID lookup | Extra Supabase round-trip per invoice | In-memory `clientMap` from `useClients()` + TanStack Query cache | O(1) lookup, zero extra network cost when data already fetched |
| Overdue detection | Custom `Date.now()` comparison | `getDisplayStatus()` from `useInvoices.ts` | Already uses `isBefore(parseISO(due_date), new Date())` via date-fns — timezone-safe |
| Status transition logic | Hardcoded if-chains | `nextStatusMap` object + `useUpdateInvoiceStatus` | Declarative, testable, type-checked |

---

## Common Pitfalls

### Pitfall 1: expo-print HTML with Arabic text

**What goes wrong:** Arabic characters render as boxes or garbled text in the PDF. Right-to-left flow is ignored.

**Why it happens:** `expo-print` uses WKWebView internally on iOS. WKWebView cannot load local font files via `file://` paths. System fonts like `-apple-system` may not include Arabic glyphs on all devices.

**How to avoid:**
1. For Phase 11, accept English-only PDF output (the i18n resources.ts already has `"invoices.pdf.arabicNotice"` key: "PDF is generated in English regardless of app language").
2. If Arabic PDF is required later: base64-encode a Google Font (e.g., Noto Naskh Arabic) and inject it into the HTML via `@font-face { src: url('data:font/ttf;base64,...') }`.
3. Add `dir="rtl"` and `lang="ar"` to the `<html>` element when generating Arabic PDFs.

**Warning signs:** STATE.md explicitly calls this out as a blocker: "expo-print Arabic font rendering not validated — run minimal proof-of-concept on physical device before full PDF template build."

**Recommendation:** Build the English-only PDF first (LOW risk). Validate on device. If Arabic is needed, add a Phase 11.x proof-of-concept plan.

### Pitfall 2: invoice_items.amount is a generated column

**What goes wrong:** Inserting an `invoice_items` row with an `amount` field causes a Postgres error similar to the `tax_amount` issue.

**Why it happens:** `invoice_items.amount` is also a generated column (`quantity * unit_price`). The `Insert` type in `types.ts` deliberately excludes it.

**How to avoid:** The `InvoiceItemCreatePayload` type uses `Pick<Insert, 'description' | 'quantity' | 'unit_price'>` — `amount` is excluded. Verify that `useFieldArray` form values only include `description`, `quantity`, `unit_price`.

**Warning signs:** Supabase returns HTTP 400 error: "column 'amount' is a generated column".

### Pitfall 3: Zod coercion for TextInput number fields

**What goes wrong:** A `TextInput` returns strings. Passing a string to a Zod `z.number()` schema fails with "Expected number, received string."

**Why it happens:** React Native `TextInput` always produces string values (unlike `<input type="number">` in browsers which can coerce).

**How to avoid:** Use `z.coerce.number()` for all numeric fields in the invoice form (quantity, unit_price, tax_rate). `z.coerce.number()` converts the string "1.5" → 1.5 before validation.

**Warning signs:** Form never submits even when fields appear filled in; Zod errors about "Expected number, received string".

### Pitfall 4: generate_invoice_number RPC must exist in Supabase

**What goes wrong:** `useAddInvoice` calls `supabase.rpc('generate_invoice_number', { p_user_id: user!.id })`. If this RPC doesn't exist in the DB, invoice creation fails with an RPC-not-found error.

**Why it happens:** The RPC was created in Phase 5 (v1.0 web app) DB migration. The v2.0 app reuses the same Supabase project, so the function should exist. But it's worth verifying.

**How to avoid:** In the Phase 11 execution, verify the function exists before building the invoice create screen. SQL to check: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'generate_invoice_number';`

**Warning signs:** `useAddInvoice` mutation fails immediately with error about unknown function.

### Pitfall 5: Tab remounting on mode toggle

**What goes wrong:** When `isAdvanced` changes, the `href: null` toggle causes Expo Router to remount the tab navigator, resetting navigation state (e.g., any invoice list scroll position is lost).

**Why it happens:** Expo Router docs explicitly warn: "Dynamically hiding tabs will remount the navigator and the state will be reset."

**How to avoid:** This is acceptable since mode switching is infrequent (Settings-level action). However, do NOT put the mode toggle in a frequently-called code path. The `ModeContext` is already stable (only updates on explicit `setMode()` call).

**Warning signs:** After toggling Advanced mode, all tab stacks reset to their root screens. This is expected behavior, not a bug.

### Pitfall 6: Client picker in income/expense forms requires useClients to be enabled

**What goes wrong:** `useClients` queries Supabase for the current user's clients. If `user` is null (stub AuthContext in Phase 7-8), the query is disabled by `enabled: !!user`. Phase 11 runs after Phase 8 (auth is implemented), so this should be fine.

**Why it happens:** `useClients` uses `user!.id` inside the query function. The `enabled: !!user` guard prevents the query from running when unauthenticated.

**How to avoid:** Ensure Phase 11 execution depends on Phase 8's auth implementation. The client picker should also only render when `isAdvanced && !!user`.

### Pitfall 7: useFieldArray minimum item validation with Zod

**What goes wrong:** `z.array(lineItemSchema).min(1)` does not always trigger when using `useFieldArray`'s `append`/`remove` methods. Zod array `.min()` validation may not fire when the array is mutated through RHF methods.

**Why it happens:** Known issue in react-hook-form/resolvers: Zod array length validation doesn't always trigger on `append`/`remove` (GitHub issue #566). The schema validates the final form state on submit.

**How to avoid:** Enforce the minimum item rule client-side in the `onSubmit` handler as a redundant check: `if (items.length === 0) { setError(...); return; }`. The Zod `min(1)` still validates on submit — just don't rely on it for real-time validation feedback.

---

## Code Examples

### expo-print + expo-sharing (verified from official Expo SDK 54 docs)

```typescript
// Source: https://docs.expo.dev/versions/v54.0.0/sdk/print/
//         https://docs.expo.dev/versions/v54.0.0/sdk/sharing/
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

async function handleExportPdf(invoice: InvoiceWithItems, client: Client) {
  try {
    const html = generateInvoiceHtml(invoice, client);
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, {
      UTI: 'com.adobe.pdf',       // iOS Uniform Type Identifier for PDF
      mimeType: 'application/pdf',  // Android / cross-platform
      dialogTitle: `Invoice ${invoice.invoice_number}`,
    });
  } catch (error) {
    console.error('PDF export failed:', error);
    // Show error toast
  }
}
```

### useFieldArray with Controller (React Native pattern, verified via Context7)

```typescript
// Source: Context7 /react-hook-form/react-hook-form
// NOTE: React Native uses Controller — NO <form> or ref-based registration
import { useForm, useFieldArray, Controller } from 'react-hook-form';

const { fields, append, remove } = useFieldArray({ control, name: 'items' });

{fields.map((field, index) => (
  <View key={field.id}>
    <Controller
      control={control}
      name={`items.${index}.description`}
      render={({ field: f }) => (
        <TextInput value={f.value} onChangeText={f.onChange} onBlur={f.onBlur} />
      )}
    />
    <Controller
      control={control}
      name={`items.${index}.quantity`}
      render={({ field: f }) => (
        <TextInput
          value={String(f.value)}
          onChangeText={f.onChange}
          keyboardType="numeric"
        />
      )}
    />
    <Controller
      control={control}
      name={`items.${index}.unit_price`}
      render={({ field: f }) => (
        <TextInput
          value={String(f.value)}
          onChangeText={f.onChange}
          keyboardType="decimal-pad"
        />
      )}
    />
    <TouchableOpacity onPress={() => remove(index)}>
      <Text>Remove</Text>
    </TouchableOpacity>
  </View>
))}
```

### Tabs href: null conditional (verified from Expo Router docs)

```typescript
// Source: https://docs.expo.dev/router/advanced/tabs/ (verified)
// Inside app/(tabs)/_layout.tsx
const { isAdvanced } = useMode();

<Tabs.Screen
  name="clients"
  options={{
    title: t('nav.clients'),
    href: isAdvanced ? undefined : null,  // null = hidden, undefined = visible
    tabBarIcon: /* SF Symbol or icon */,
  }}
/>
```

### FIX-01 verification pattern

```typescript
// The existing InvoiceCreatePayload in useInvoices.ts:
type InvoiceCreatePayload = Pick<
  Database['public']['Tables']['invoices']['Insert'],
  'client_id' | 'issue_date' | 'due_date' | 'currency' | 'tax_rate' | 'notes'
> & { items: InvoiceItemCreatePayload[] };

// The Insert type in types.ts omits 'tax_amount' entirely:
// Insert: { id?, user_id, client_id, invoice_number, status?, currency?,
//           issue_date, due_date?, subtotal?, tax_rate?, notes?,
//           created_at?, updated_at? }
// ✅ tax_amount NOT in Insert type — generated column correctly excluded
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@react-pdf/renderer` | `expo-print` + `expo-sharing` | v2.0 decision [STATE.md] | `@react-pdf/renderer` is browser-only and crashes React Native. `expo-print` uses native WKWebView on iOS |
| Web-only `<form>` submit | `handleSubmit(onSubmit)` on button press | React Native standard | RN has no HTML form elements — all form submission is JS-driven |
| `<select>` for client picker | `@react-native-picker/picker` or custom modal | React Native standard | Native picker or custom FlatList modal for iOS HIG compliance |
| `react-router-dom` `useNavigate` | `expo-router` `router.push()` / `useRouter()` | v2.0 iOS native app | File-based routing, tab-aware navigation |
| `sonner` toasts | React Native `Alert` or custom Toast component | React Native port | `sonner` is browser-only — RN needs native alternatives |

**Deprecated/outdated:**
- `@react-pdf/renderer`: Cannot be used in React Native. The roadmap decision is final.
- `react-router-dom`: Not used in the RN app. Expo Router handles all navigation.
- `shadcn/ui` components: Web-only. Phase 11 uses React Native primitives (`View`, `Text`, `TextInput`, `FlatList`, `TouchableOpacity`, `Pressable`) + NativeWind for styling.

---

## Open Questions

1. **Does `generate_invoice_number` RPC exist in the Supabase project?**
   - What we know: `useAddInvoice` calls it. It was created in the v1.0 web app Phase 5 DB migration.
   - What's unclear: The RN app targets the same Supabase project (same `EXPO_PUBLIC_SUPABASE_URL`), so it should exist.
   - Recommendation: During 11-03 execution, verify with a Supabase SQL check before building the invoice create screen. If missing, the planner must add a DB migration task.

2. **Arabic PDF rendering — is it in scope for Phase 11?**
   - What we know: STATE.md flags this as a known blocker: "expo-print Arabic font rendering not validated". The i18n resources.ts has a `"invoices.pdf.arabicNotice"` key suggesting English-only PDF is acceptable.
   - What's unclear: The product decision on whether Arabic PDFs are required for v2.0.
   - Recommendation: Build English-only PDF for Phase 11 (the i18n key already signals this expectation). Arabic PDF is a Phase 11.x enhancement if needed.

3. **Client picker implementation — Picker vs. modal?**
   - What we know: The project uses NativeWind + React Native primitives. `@react-native-picker/picker` provides a native iOS picker wheel. A custom `FlatList` modal with search provides better UX for large client lists.
   - What's unclear: Which approach the planner prefers.
   - Recommendation: Use `@react-native-picker/picker` for simplicity (no new modal component required). For Phase 11, client lists are expected to be small (freelancer context). A custom searchable modal is a future enhancement.

4. **Advanced Dashboard — separate tab or same tab as Simple Dashboard?**
   - What we know: The tab bar has 5 sections (FOUND-04). An Advanced Dashboard tab is separate from the simple Dashboard. The route would be `advanced-dashboard.tsx` under `(tabs)/`.
   - What's unclear: Whether the Clients and Invoices tabs replace two existing tabs or add additional tabs.
   - Recommendation: Add Clients as a 6th tab (hidden when not advanced), keep Invoices accessible from Clients flow (no separate tab) or add as another conditional tab. The FOUND-04 spec says "5 sections" for simple mode — advanced mode can have more. Planner decides the tab count.

---

## Sources

### Primary (HIGH confidence)

- `BalanceTracker/src/integrations/supabase/types.ts` — all table schemas confirmed (`invoices`, `invoice_items`, `clients`, `incomes`, `expenses`), generated columns identified (`tax_amount`, `total`, `amount` in invoice_items)
- `BalanceTracker/src/hooks/useInvoices.ts` — all mutations confirmed: `useAddInvoice`, `useUpdateInvoice`, `useUpdateInvoiceStatus`, `useDeleteInvoice`, `getDisplayStatus`; FIX-01 already implemented in INSERT payload
- `BalanceTracker/src/hooks/useClients.ts` — all CRUD hooks confirmed: `useClients`, `useClient`, `useAddClient`, `useUpdateClient`, `useDeleteClient`
- `BalanceTracker/src/hooks/useIncomes.ts` — `client_id` field in update payload confirmed (line 139)
- `BalanceTracker/src/contexts/ModeContext.tsx` — `useMode()`, `isAdvanced`, `setMode()` all confirmed; syncs to `user_settings.app_mode`
- `BalanceTracker/src/i18n/resources.ts` — all `clients.*`, `invoices.*`, `advancedDashboard.*` i18n keys confirmed in both EN and AR
- `BalanceTracker/package.json` — confirmed: `expo-print` and `expo-sharing` NOT installed; `react-hook-form` and `zod` NOT installed
- `.planning/STATE.md` — key decisions confirmed: expo-print replaces @react-pdf/renderer; FIX-01 in Phase 11; Arabic PDF not validated
- Official Expo SDK 54 docs (expo-print): https://docs.expo.dev/versions/v54.0.0/sdk/print/ — `printToFileAsync` API, HTML→PDF, iOS WKWebView font limitation
- Official Expo SDK 54 docs (expo-sharing): https://docs.expo.dev/versions/v54.0.0/sdk/sharing/ — `shareAsync(uri, { UTI, mimeType })` confirmed
- Official Expo Router docs (tabs): https://docs.expo.dev/router/advanced/tabs/ — `href: null` conditional tab hiding confirmed
- Context7 `/react-hook-form/react-hook-form` — `useFieldArray` API confirmed: `fields`, `append`, `remove`, `field.id` as React key

### Secondary (MEDIUM confidence)

- `.planning/phases/06-advanced-dashboard/06-RESEARCH.md` — Advanced Dashboard aggregation patterns, currency conversion, `getDisplayStatus()` usage confirmed
- `.planning/phases/03-client-management/03-RESEARCH.md` — Clients CRUD patterns (web app precedent — RN patterns differ in routing/UI but hook/type patterns carry over)
- `.planning/phases/05-invoices-and-pdf-export/05-RESEARCH.md` — Invoice lifecycle, `generate_invoice_number` RPC, line item INSERT pattern confirmed from web app phase
- GitHub discussion on expo/expo #28878 — `href: null` + `redirect` prop for conditional tab hiding (MEDIUM: community discussion, not official docs)

### Tertiary (LOW confidence)

- Arabic font rendering for expo-print: search results confirm base64 `@font-face` approach is needed; actual Arabic PDF rendering quality on iOS devices not directly validated in this research session. STATE.md flags this as an open validation item.

---

## Metadata

**Confidence breakdown:**
- Standard stack (hooks, types, ModeContext, i18n): HIGH — all files read directly from codebase
- New installs (expo-print, expo-sharing): HIGH — official SDK 54 docs confirmed API
- New installs (react-hook-form, zod): HIGH — Context7 verified; same libraries used in web app
- expo-print HTML/PDF rendering: HIGH for English; MEDIUM for Arabic (WKWebView limitation documented, base64 font workaround known but not tested on device)
- Conditional tab visibility (href: null): HIGH — confirmed in official Expo Router docs
- generate_invoice_number RPC existence: MEDIUM — assumed from Phase 5 web app migration; not directly verified against live Supabase project
- Architecture patterns: HIGH — direct precedent in Phase 3/5/6 of this codebase, adapted for React Native

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — expo-print and RHF are stable; Expo Router tabs API is stable in SDK 54)
