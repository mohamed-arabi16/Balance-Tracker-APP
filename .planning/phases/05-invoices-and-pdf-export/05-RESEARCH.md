# Phase 5: Invoices & PDF Export - Research

**Researched:** 2026-02-25
**Domain:** Invoice lifecycle, client-side PDF generation, atomic sequential numbering, RTL/i18n, Supabase RPC
**Confidence:** HIGH (core stack), MEDIUM (PDF RTL Arabic support)

---

## Summary

Phase 5 is the most complex phase in the roadmap. It spans five distinct technical domains: invoice CRUD with line items (a nested one-to-many form), atomic server-side sequential invoice number generation, status lifecycle management with derived "overdue" state, client-side lazy-loaded PDF export, and a "create income on paid" confirmation flow. The database schema is already fully defined in `src/integrations/supabase/types.ts` — `invoices` and `invoice_items` tables both exist with the correct columns and relationships.

The most technically novel concern is PDF generation. The recommended library is `@react-pdf/renderer` (currently v4.3.2), which fits the project's React-first philosophy. Its bundle size (~450 KB uncompressed) makes lazy loading mandatory: the PDF library MUST NOT be in the main bundle. The correct pattern is a dynamic `import('@react-pdf/renderer')` triggered on the "Export PDF" button click, calling the `pdf().toBlob()` API to generate the file and `URL.createObjectURL()` + `<a>.click()` to trigger a browser download. This keeps the main bundle within the project's 350 KB gzip budget.

The most actively uncertain concern is Arabic/RTL PDF text. As of February 2025, `@react-pdf/renderer` v4 has open issues (#2638, #2900) with Arabic bidi rendering when nesting `<Text>` elements. Arabic characters render and direction is detectable, but mixed-direction text inside nested elements can break. The safe plan is: PDF body is LTR only (invoice numbers, amounts, client names, dates); the PDF library is registered with a Noto Sans Arabic font; and a user notice is shown in the UI when language is Arabic. Full Arabic PDF content is a stretch goal with validation required before committing.

The invoice number generation requires a Supabase RPC function (`generate_invoice_number`) using `SELECT MAX(CAST(...)) ... FOR UPDATE` semantics inside a PL/pgSQL function. This is specified in STATE.md as an open blocker and must be built as the first task of the phase.

**Primary recommendation:** Build in this order: (1) `generate_invoice_number` Supabase RPC, (2) `useInvoices` hook with all CRUD mutations, (3) InvoicesPage + InvoiceNewPage + InvoiceEditPage + InvoiceDetailPage, (4) status lifecycle and overdue derived state, (5) lazy PDF export, (6) "paid → create income" prompt, (7) full i18n audit for AR parity.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INV-01 | User can create an invoice linked to a client, with one or more line items (description, quantity, rate, calculated total) | `invoices` table has `client_id`, `subtotal`, `tax_rate`; `invoice_items` has `description`, `quantity`, `unit_price`, `amount` (generated). Line items require a dynamic array in the form — `useFieldArray` from react-hook-form handles this. |
| INV-02 | Invoice is auto-assigned a unique sequential invoice number on creation | `UNIQUE(user_id, invoice_number)` constraint exists. Requires a `generate_invoice_number(p_user_id uuid)` Supabase RPC function — called from `useAddInvoice` mutation before insert, or atomically inside the function itself. STATE.md flags this as an open blocker. |
| INV-03 | User can transition invoice status: Draft → Sent → Paid; overdue is auto-derived when due_date has passed and status is Sent | `invoice_status` enum: `draft | sent | paid | overdue | cancelled`. Overdue is DERIVED on the client side: `status === 'sent' && due_date < today`. The DB stores only `sent` — the UI computes and displays `overdue`. Status transitions are mutation calls updating the `status` field. |
| INV-04 | Draft invoices can be fully edited; Sent and Paid invoices are read-only | Conditional rendering based on `invoice.status`. `isEditable = invoice.status === 'draft'`. Edit controls (`EditButton`, form fields) render only when `isEditable`. Detail page shows a read-only view for Sent/Paid. |
| INV-05 | User can export any invoice as a PDF file (client-side generation, lazy-loaded PDF library) | Use `@react-pdf/renderer` with dynamic `import()` on button click. Pattern: `const { pdf } = await import('@react-pdf/renderer')`. Then `pdf(<InvoiceDocument {...data} />).toBlob()` → `URL.createObjectURL(blob)` → auto-click hidden `<a>`. Library does not load until user clicks Export. |
| INV-06 | When marking an invoice as Paid, app offers an optional prompt to create a matching income entry | After `updateInvoiceStatus('paid')` succeeds, show shadcn `AlertDialog` asking "Create income entry?". On confirm, call `useAddIncome` mutation with invoice total, client_id, and today's date. On dismiss, no income is created. |
| I18N-01 | All Advanced Mode UI strings have Arabic translations and correct RTL layout | All invoice strings added to BOTH `en` and `ar` in `src/i18n/index.ts`. RTL layout uses Tailwind's `rtl:` variants (or `dir` attribute from i18n language). Arabic PDF content is medium-confidence — PDF RTL is a known limitation. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | ^5.56.2 (installed) | Server state, caching, invoice + line item mutations | Already used for all data hooks in this project |
| `react-hook-form` | ^7.53.0 (installed) | Form state, line items array via `useFieldArray` | Already used in Expenses, ClientNewPage |
| `zod` | ^3.23.8 (installed) | Invoice form schema validation | Already used project-wide with `@hookform/resolvers` |
| `@supabase/supabase-js` | ^2.97.0 (installed) | DB reads/writes, `supabase.rpc()` for invoice number | Single persistence layer |
| `react-router-dom` | ^6.26.2 (installed) | Invoice page routing | Already wired in App.tsx |
| `sonner` | ^1.5.0 (installed) | Toast notifications for mutations | Already used project-wide |
| `@react-pdf/renderer` | ^4.3.2 (NEW — must install) | Client-side PDF generation | Only React-first declarative PDF library; JSX-based layout, familiar CSS-in-JS styling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^0.462.0 (installed) | Icons: `FileText`, `Download`, `Send`, `CheckCircle`, `Clock`, `Plus`, `Trash2` | All invoice UI icons |
| `shadcn/ui` components | (all installed) | `AlertDialog` for paid→income prompt; `Badge` for status chips; `Table` for line items; `Select` for status; `Card`, `Form`, `Input`, `Button`, `Skeleton` | All UI structure |
| `react-i18next` | ^15.6.1 (installed) | `t()` hook for all invoice strings | Every visible string needs a key in both en + ar |
| `date-fns` | ^3.6.0 (installed) | `isPast(new Date(due_date))` for overdue derivation | Already installed; use `isBefore(new Date(due_date), new Date())` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@react-pdf/renderer` | `jsPDF` + `html2canvas` | jsPDF is smaller (~150 KB) but HTML-to-canvas-to-PDF produces blurry, non-searchable text and no true layout control. @react-pdf/renderer produces real PDF text layers. |
| `@react-pdf/renderer` | `pdfmake` | pdfmake is framework-agnostic and slightly lighter, but has known Next.js SSR issues and uses an object API (less ergonomic in React). Neither library natively supports Arabic RTL perfectly. |
| Client-side overdue derivation | DB-stored `overdue` status | Storing overdue in the DB requires a cron job or trigger to flip status daily. Client-side derivation (`status === 'sent' && due_date < today`) is instant, always accurate, and requires no DB changes. The `overdue` value in the DB enum exists but should NOT be written — it's for future compatibility only. |
| `SELECT MAX + 1` atomic RPC | PostgreSQL `SEQUENCE` | PostgreSQL sequences are non-transactional — they never roll back, creating permanent gaps. For a freelancer invoice numbering system where users expect sequential numbers, a per-user `MAX + 1` in a PL/pgSQL function with locking semantics is correct. |

**Installation:**
```bash
npm install @react-pdf/renderer
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   └── useInvoices.ts          # All invoice CRUD: useInvoices, useInvoice, useAddInvoice, useUpdateInvoice, useUpdateInvoiceStatus, useDeleteInvoice
├── pages/
│   └── advanced/
│       ├── InvoicesPage.tsx    # /invoices — list with status filters
│       ├── InvoiceNewPage.tsx  # /invoices/new — create form with line items
│       ├── InvoiceEditPage.tsx # /invoices/:id/edit — edit form (Draft only)
│       └── InvoiceDetailPage.tsx # /invoices/:id — read-only detail + PDF export button
├── components/
│   └── invoice/
│       ├── InvoiceLineItemsField.tsx  # useFieldArray-powered dynamic line items
│       ├── InvoiceStatusBadge.tsx     # Status chip with overdue derivation
│       └── InvoicePdfDocument.tsx     # @react-pdf/renderer Document component
├── i18n/
│   └── index.ts               # Add invoices.* keys in both en and ar sections
└── App.tsx                    # Add /invoices routes under AdvancedRoute
```

### Pattern 1: Invoice Hook Structure
**What:** All invoice mutations and queries in `useInvoices.ts`. Invoice number is generated via `supabase.rpc('generate_invoice_number', { p_user_id: user.id })` inside `useAddInvoice`.
**When to use:** All invoice data operations.
**Example:**
```typescript
// Source: project pattern from src/hooks/useClients.ts + Supabase rpc docs
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import type { Database } from '@/integrations/supabase/types';

export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];

// Derived overdue status — never write 'overdue' to DB
export function getDisplayStatus(invoice: Pick<Invoice, 'status' | 'due_date'>): string {
  if (invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date()) {
    return 'overdue';
  }
  return invoice.status;
}

export const useAddInvoice = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: InvoiceCreatePayload) => {
      // Step 1: Generate invoice number atomically via RPC
      const { data: invoiceNumber, error: rpcError } = await supabase
        .rpc('generate_invoice_number', { p_user_id: user!.id });
      if (rpcError) throw new Error(rpcError.message);

      // Step 2: Insert invoice with generated number
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert([{ ...payload, user_id: user!.id, invoice_number: invoiceNumber }])
        .select()
        .single();
      if (invError) throw new Error(invError.message);

      // Step 3: Insert line items (bulk insert)
      if (payload.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(payload.items.map((item, i) => ({
            ...item,
            invoice_id: invoice.id,
            user_id: user!.id,
            sort_order: i,
          })));
        if (itemsError) throw new Error(itemsError.message);
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices(user!.id) });
    },
  });
};
```

### Pattern 2: Dynamic Line Items with useFieldArray
**What:** Invoice create/edit form uses `useFieldArray` to manage an array of line items (description, quantity, unit_price). Subtotal is computed reactively using `watch`.
**When to use:** `InvoiceNewPage.tsx` and `InvoiceEditPage.tsx`.
**Example:**
```typescript
// Source: react-hook-form useFieldArray docs pattern
import { useFieldArray, useWatch } from 'react-hook-form';

// Inside the form component:
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'items',
});

// Watch for live subtotal calculation
const items = useWatch({ control: form.control, name: 'items' });
const subtotal = items.reduce((sum, item) => {
  return sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
}, 0);

// Render line items
{fields.map((field, index) => (
  <div key={field.id} className="flex gap-2 items-start">
    <FormField name={`items.${index}.description`} ... />
    <FormField name={`items.${index}.quantity`} ... />
    <FormField name={`items.${index}.unit_price`} ... />
    <Button type="button" variant="ghost" onClick={() => remove(index)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
))}
<Button type="button" variant="outline" onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}>
  <Plus className="h-4 w-4 mr-2" /> Add Line Item
</Button>
```

### Pattern 3: Overdue Derivation — Never Write 'overdue' to DB
**What:** The `overdue` status is derived on the client side. The `invoice_status` enum includes `overdue` as a value, but it is NEVER written by the app. The DB stores `sent`. The UI displays `overdue` when `status === 'sent' && due_date < today`.
**When to use:** Everywhere invoice status is displayed — `InvoiceStatusBadge`, `InvoicesPage`, `InvoiceDetailPage`.
**Example:**
```typescript
// Source: Project decision from STATE.md + REQUIREMENTS.md INV-03
import { isBefore } from 'date-fns';

export function getDisplayStatus(status: string, due_date: string | null): 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' {
  if (status === 'sent' && due_date && isBefore(new Date(due_date), new Date())) {
    return 'overdue';
  }
  return status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}
```

### Pattern 4: Lazy PDF Export on Button Click
**What:** `@react-pdf/renderer` is dynamically imported only when the user clicks "Export PDF". The library is NOT in the main bundle. Uses `pdf().toBlob()` + `URL.createObjectURL` + hidden anchor click.
**When to use:** "Export PDF" button in `InvoiceDetailPage.tsx`.
**Example:**
```typescript
// Source: @react-pdf/renderer docs + gist.github.com/JacobFischer + research findings
const handleExportPdf = async () => {
  setExporting(true);
  try {
    // Dynamic import — @react-pdf/renderer only loads on demand
    const { pdf } = await import('@react-pdf/renderer');
    const { InvoicePdfDocument } = await import('@/components/invoice/InvoicePdfDocument');

    const blob = await pdf(
      <InvoicePdfDocument invoice={invoice} client={client} items={items} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.invoice_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setExporting(false);
  }
};
```

**CRITICAL:** The `InvoicePdfDocument` component must also be dynamically imported — if it statically imports from `@react-pdf/renderer` and is imported normally in the page, it defeats the lazy loading. The PDF document component file must only be loaded via `import()`.

**Vite note:** Vite automatically creates a separate chunk for dynamic `import()` calls. No manual `vite.config.ts` change is needed for this to work. The `@react-pdf/renderer` chunk will be split automatically.

### Pattern 5: Status Transition Mutation
**What:** Status updates use a dedicated `useUpdateInvoiceStatus` mutation (not the generic update) to make the intent explicit and to trigger the "paid → create income" flow.
**When to use:** Status action buttons in `InvoiceDetailPage.tsx`.
**Example:**
```typescript
export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'sent' | 'paid' | 'cancelled' }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices(user!.id) });
    },
  });
};
```

### Pattern 6: Paid → Create Income Prompt
**What:** After marking an invoice as Paid, show an `AlertDialog` asking if the user wants to create an income entry. If confirmed, call `useAddIncome` mutation. If dismissed, no income is created.
**When to use:** `InvoiceDetailPage.tsx` — in the `onSuccess` callback of `useUpdateInvoiceStatus`.
**Example:**
```typescript
// Source: shadcn/ui AlertDialog pattern
const [showIncomePrompt, setShowIncomePrompt] = useState(false);
const [paidInvoice, setPaidInvoice] = useState<Invoice | null>(null);

const handleMarkPaid = () => {
  updateStatus.mutate({ id: invoice.id, status: 'paid' }, {
    onSuccess: (updated) => {
      setPaidInvoice(updated);
      setShowIncomePrompt(true);  // show the prompt AFTER status update succeeds
    },
  });
};

// In JSX:
<AlertDialog open={showIncomePrompt} onOpenChange={setShowIncomePrompt}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('invoices.paidPrompt.title')}</AlertDialogTitle>
      <AlertDialogDescription>{t('invoices.paidPrompt.description')}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{t('common.dismiss')}</AlertDialogCancel>
      <AlertDialogAction onClick={handleCreateIncome}>
        {t('invoices.paidPrompt.confirm')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Pattern 7: Supabase RPC — generate_invoice_number
**What:** A PL/pgSQL function that atomically generates the next sequential invoice number for a user. Uses `SELECT MAX(CAST(invoice_number AS integer))` with a row-level lock on the invoices table for that user to prevent race conditions.
**When to use:** Called from `useAddInvoice` mutationFn before inserting the invoice.
**Example:**
```sql
-- Migration: add generate_invoice_number RPC
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_next_number integer;
BEGIN
  -- Lock all invoice rows for this user to prevent concurrent number generation
  PERFORM id FROM public.invoices
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Find the current maximum number (0 if no invoices exist)
  SELECT COALESCE(MAX(CAST(invoice_number AS integer)), 0) + 1
  INTO v_next_number
  FROM public.invoices
  WHERE user_id = p_user_id
    AND invoice_number ~ '^\d+$';  -- Only count numeric invoice numbers

  RETURN v_next_number::text;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(uuid) TO authenticated;
```

**Called via:**
```typescript
const { data: invoiceNumber, error } = await supabase
  .rpc('generate_invoice_number', { p_user_id: user!.id });
```

### Pattern 8: Invoice PDF Document Component
**What:** An `@react-pdf/renderer` document component. Uses `Document`, `Page`, `View`, `Text`, `StyleSheet`. Font is registered with Noto Sans for cross-platform consistency. Does NOT use nested `<Text>` elements with mixed RTL/LTR content (known buggy in v4).
**When to use:** Rendered inside `handleExportPdf` dynamic import call.
**Example:**
```typescript
// Source: @react-pdf/renderer Context7 docs — Font.register + Document pattern
// File: src/components/invoice/InvoicePdfDocument.tsx
// WARNING: This file must ONLY be imported via dynamic import() — never statically
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'NotoSans',
  src: 'https://fonts.gstatic.com/s/notosans/v27/o-0IIpQlx3QUlC5A4PNr4AxMTSo.ttf',
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'NotoSans', fontSize: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold' },
  table: { marginTop: 16 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 6 },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'right' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
  total: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
});

export function InvoicePdfDocument({ invoice, client, items }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>INVOICE</Text>
          <View>
            <Text>#{invoice.invoice_number}</Text>
            <Text>Issued: {invoice.issue_date}</Text>
            {invoice.due_date && <Text>Due: {invoice.due_date}</Text>}
          </View>
        </View>
        <View>
          <Text>Bill To:</Text>
          <Text>{client.name}</Text>
          {client.company && <Text>{client.company}</Text>}
          {client.email && <Text>{client.email}</Text>}
        </View>
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.tableRow}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Qty</Text>
            <Text style={styles.col3}>Rate</Text>
            <Text style={styles.col4}>Amount</Text>
          </View>
          {/* Item rows */}
          {items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.col1}>{item.description}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>{item.unit_price}</Text>
              <Text style={styles.col4}>{item.amount ?? item.quantity * item.unit_price}</Text>
            </View>
          ))}
        </View>
        <View style={styles.total}>
          <Text>Total: {invoice.total ?? invoice.subtotal}</Text>
        </View>
        {invoice.notes && <View><Text>{invoice.notes}</Text></View>}
      </Page>
    </Document>
  );
}
```

### Pattern 9: Route Registration
**What:** New invoice routes wrapped in `<AdvancedRoute>` and lazy-loaded. `/invoices/new` MUST come before `/invoices/:id`.
**When to use:** App.tsx additions.
**Example:**
```typescript
// In App.tsx — lazy imports
const InvoicesPage = lazy(() => import('./pages/advanced/InvoicesPage'));
const InvoiceNewPage = lazy(() => import('./pages/advanced/InvoiceNewPage'));
const InvoiceEditPage = lazy(() => import('./pages/advanced/InvoiceEditPage'));
const InvoiceDetailPage = lazy(() => import('./pages/advanced/InvoiceDetailPage'));

// Routes — ORDER MATTERS: /invoices/new before /invoices/:id
<Route path="/invoices" element={<AdvancedRoute><InvoicesPage /></AdvancedRoute>} />
<Route path="/invoices/new" element={<AdvancedRoute><InvoiceNewPage /></AdvancedRoute>} />
<Route path="/invoices/:id/edit" element={<AdvancedRoute><InvoiceEditPage /></AdvancedRoute>} />
<Route path="/invoices/:id" element={<AdvancedRoute><InvoiceDetailPage /></AdvancedRoute>} />
```

### Pattern 10: i18n Key Structure
**What:** All invoice strings added to BOTH `en.translation` and `ar.translation` blocks in `src/i18n/index.ts`. Section comment `// Invoices` before the new keys.
**When to use:** Before building any component.

Key namespace to add (representative, not exhaustive):
```typescript
// English keys
"invoices.title": "Invoices",
"invoices.subtitle": "Manage your client invoices",
"invoices.addInvoice": "New Invoice",
"invoices.empty.title": "No invoices yet",
"invoices.empty.description": "Create your first invoice to get started.",
"invoices.status.draft": "Draft",
"invoices.status.sent": "Sent",
"invoices.status.paid": "Paid",
"invoices.status.overdue": "Overdue",
"invoices.status.cancelled": "Cancelled",
"invoices.form.client": "Client",
"invoices.form.issueDate": "Issue Date",
"invoices.form.dueDate": "Due Date",
"invoices.form.currency": "Currency",
"invoices.form.taxRate": "Tax Rate (%)",
"invoices.form.notes": "Notes",
"invoices.form.items.description": "Description",
"invoices.form.items.quantity": "Qty",
"invoices.form.items.unitPrice": "Rate",
"invoices.form.items.amount": "Amount",
"invoices.form.items.add": "Add Line Item",
"invoices.form.items.remove": "Remove",
"invoices.form.subtotal": "Subtotal",
"invoices.form.tax": "Tax",
"invoices.form.total": "Total",
"invoices.actions.markSent": "Mark as Sent",
"invoices.actions.markPaid": "Mark as Paid",
"invoices.actions.exportPdf": "Export PDF",
"invoices.actions.edit": "Edit Invoice",
"invoices.paidPrompt.title": "Create Income Entry?",
"invoices.paidPrompt.description": "Would you like to create a matching income entry for this payment?",
"invoices.paidPrompt.confirm": "Yes, Create Income",
"invoices.readOnly.notice": "This invoice is locked and cannot be edited.",
"invoices.pdf.exporting": "Generating PDF...",
"invoices.pdf.arabicNotice": "PDF is generated in English regardless of app language.",
"invoices.toast.addSuccess": "Invoice created successfully!",
"invoices.toast.addError": "Error creating invoice: {{error}}",
"invoices.toast.updateSuccess": "Invoice updated successfully!",
"invoices.toast.updateError": "Error updating invoice: {{error}}",
"invoices.toast.deleteSuccess": "Invoice deleted successfully!",
"invoices.toast.deleteError": "Error deleting invoice: {{error}}",
"invoices.toast.statusSuccess": "Invoice status updated.",
"invoices.toast.statusError": "Error updating status: {{error}}",
"invoices.number": "Invoice #{{number}}",
"invoices.filter.all": "All",
"invoices.filter.draft": "Draft",
"invoices.filter.sent": "Sent & Overdue",
"invoices.filter.paid": "Paid",
```

### Anti-Patterns to Avoid
- **Do not write 'overdue' to the DB:** The `overdue` status in the DB enum exists but should never be persisted by the app. Derive it on the client. Writing it would create a stale value that needs a cron to keep accurate.
- **Do not import `@react-pdf/renderer` statically:** Any static import of this library adds ~450 KB to the bundle and defeats INV-05 requirement. Every reference to the library must go through `import('@react-pdf/renderer')` dynamic calls.
- **Do not put `InvoicePdfDocument` in a file that is statically imported:** Even if you use `import('@react-pdf/renderer')` in the handler, if `InvoicePdfDocument.tsx` is statically imported elsewhere, Vite will bundle it with the main chunk. It must live in a file imported only dynamically.
- **Do not use `useFieldArray` without stable `key={field.id}`:** Each line item must use the `id` from `useFieldArray`'s `fields` array as the React key, not the array index. Using index causes focus-loss and state corruption on item removal.
- **Do not nest `<Text>` inside `<Text>` for Arabic content in the PDF:** Known bug in @react-pdf/renderer v4 (#2900). Use flat `<View>` + `<Text>` structure only.
- **Do not call `generate_invoice_number` from the client without the RPC:** Race conditions between two concurrent invoice creations would produce duplicate numbers. The RPC with `FOR UPDATE` is the only safe approach.
- **Do not skip `updated_at` in invoice updates:** Same as the client hook — include `updated_at: new Date().toISOString()` defensively in all update payloads.
- **Do not register `/invoices/new` after `/invoices/:id`:** Same React Router v6 ordering issue as Phase 3.
- **Do not create income in `onSuccess` of status update without the prompt:** The requirement (INV-06) is an *optional* prompt — the user must confirm. Never create the income automatically.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dynamic line item form | Custom array state with manual index management | `useFieldArray` from react-hook-form | Handles add/remove/reorder with stable IDs, integrates with validation, manages form dirty state |
| PDF generation | Canvas-to-image or manual PDF byte construction | `@react-pdf/renderer` | Text layers, real layout engine, proper font subsetting, A4 page management |
| Atomic invoice number | Client-side `MAX()+1` with JS race risk | `generate_invoice_number` Supabase RPC with `FOR UPDATE` | Without DB-level locking, two concurrent invoice creations produce the same number |
| Confirm dialog for income prompt | Custom modal state machine | `AlertDialog` from shadcn/ui | Focus trap, keyboard dismiss, ARIA, already installed |
| Status badge styling | Inline style conditions | `InvoiceStatusBadge` component with `Badge` variant mapping | Centralizes overdue derivation and badge color logic; reusable across InvoicesPage and InvoiceDetailPage |
| Date comparison for overdue | Manual string comparison | `date-fns` `isBefore()` | Handles timezone edge cases correctly; already installed |

**Key insight:** The hardest part of this phase is not the CRUD — it's three specific non-obvious problems: (1) atomic invoice numbering at the DB level, (2) lazy loading a heavy PDF library without it touching the main bundle, and (3) managing `useFieldArray` correctly for nested line items. All three have established solutions that should NOT be hand-rolled.

---

## Common Pitfalls

### Pitfall 1: @react-pdf/renderer in the Main Bundle
**What goes wrong:** The app's 350 KB gzip budget is exceeded, the `check:bundle` script fails CI, and the whole quality:ci pipeline breaks.
**Why it happens:** `@react-pdf/renderer` is ~450 KB uncompressed. Any static import (`import { pdf } from '@react-pdf/renderer'`) — even in a component that's lazy-loaded itself — may cause Vite to include it in a shared chunk if referenced across files.
**How to avoid:** The PDF handler function and the `InvoicePdfDocument` component must BOTH be dynamically imported via `import()`. The `InvoicePdfDocument.tsx` file must not be imported anywhere statically.
**Warning signs:** `npm run check:bundle` fails after installing `@react-pdf/renderer`. The `vite.config.ts` `manualChunks` function does not contain a rule for `@react-pdf` — it must not be added there; Vite's natural code-splitting via dynamic import handles it.

### Pitfall 2: Invoice Number Race Condition
**What goes wrong:** Two invoices created within milliseconds of each other get the same number, violating the `UNIQUE(user_id, invoice_number)` constraint. The second insert fails with a Postgres unique violation.
**Why it happens:** Reading `MAX()` in JavaScript and inserting in two separate network calls is not atomic.
**How to avoid:** Use the `generate_invoice_number` RPC which runs inside a single PL/pgSQL transaction with `SELECT ... FOR UPDATE` to serialize concurrent calls.
**Warning signs:** Supabase error code `23505` (unique_violation) on invoice insert.

### Pitfall 3: useFieldArray Key Instability
**What goes wrong:** When a user removes a middle line item, the remaining items lose their form values or focus jumps to the wrong input.
**Why it happens:** Using array index as React key causes React to reuse DOM nodes incorrectly on removal.
**How to avoid:** Always use `{fields.map((field, index) => <div key={field.id} ...>)}` — where `field.id` is the stable ID generated by `useFieldArray`, not `index`.
**Warning signs:** After removing item #2 of [1,2,3], item #3's data appears in item #2's position.

### Pitfall 4: Editing a Sent/Paid Invoice
**What goes wrong:** Users modify and save a Sent or Paid invoice, bypassing the read-only requirement (INV-04).
**Why it happens:** Edit form is conditionally shown but the route `/invoices/:id/edit` can still be navigated to directly via URL.
**How to avoid:** In `InvoiceEditPage.tsx`, after loading the invoice, if `invoice.status !== 'draft'`, redirect to `/invoices/${id}` with a toast notification. The read-only check must happen in the page logic, not just in the UI.
**Warning signs:** Accessing `/invoices/:id/edit` for a Sent invoice renders the edit form.

### Pitfall 5: income_amount_history Required on useAddIncome
**What goes wrong:** The `addIncome` function in `useIncomes.ts` inserts both an income record AND an `income_amount_history` record. Calling it for the INV-06 prompt must follow the same pattern.
**Why it happens:** The project's income hook architecture inserts a history record on creation for audit trail purposes.
**How to avoid:** Review `src/hooks/useIncomes.ts` lines 54-80 before implementing INV-06. The mutation for creating the income from an invoice must use `useAddIncome` (not a raw Supabase insert) to maintain the history record invariant.
**Warning signs:** Income created from invoice prompt has no `income_amount_history` rows.

### Pitfall 6: Overdue Status Written to DB
**What goes wrong:** A developer adds `status: 'overdue'` to the status transition handler. The DB accepts it (the enum allows it), but now the invoice is stuck as `overdue` in the DB — it cannot be un-overdue'd by updating the due date, and the app logic breaks.
**Why it happens:** The `overdue` value exists in the `invoice_status` enum for future compatibility, not for active use.
**How to avoid:** Only three status transitions are valid writes: `draft → sent`, `sent → paid`, `any → cancelled`. `overdue` is NEVER written to the DB — it is always derived.
**Warning signs:** An update mutation sets `status: getDisplayStatus(invoice)` instead of `status: 'sent'`/`'paid'`.

### Pitfall 7: PDF Arabic RTL Content
**What goes wrong:** The PDF shows Arabic invoice text but direction is wrong, characters appear disconnected (not shaped correctly), or nested `<Text>` elements display incorrectly.
**Why it happens:** `@react-pdf/renderer` v4 has open bugs #2638 and #2900 affecting Arabic text in nested `<Text>` elements as of February 2025.
**How to avoid:** The safe default is to generate PDFs in English regardless of UI language. If the user's app language is Arabic (`i18n.language === 'ar'`), show a notice: "PDF is generated in English regardless of app language." If Arabic PDF content is required in a future iteration, test extensively with flat (non-nested) `<Text>` structure and Noto Sans Arabic font.
**Warning signs:** Arabic text appears as disconnected individual characters or boxes in the generated PDF.

### Pitfall 8: Zod Schema for Nested Line Items
**What goes wrong:** The invoice form Zod schema doesn't validate line items array, allowing empty arrays or items with zero quantity through.
**Why it happens:** Nested array schemas in Zod require `z.array(z.object({...})).min(1)`.
**How to avoid:**
```typescript
const invoiceSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  issue_date: z.string().min(1, 'Issue date is required'),
  due_date: z.string().optional(),
  currency: z.enum(['USD', 'TRY']),
  tax_rate: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.coerce.number().min(0.01, 'Quantity must be > 0'),
    unit_price: z.coerce.number().min(0, 'Rate must be >= 0'),
  })).min(1, 'At least one line item is required'),
});
```

---

## Code Examples

Verified patterns from official sources and codebase:

### Supabase RPC call pattern (from official Supabase docs)
```typescript
// Source: supabase.com/docs/reference/javascript/rpc
const { data, error } = await supabase.rpc('generate_invoice_number', {
  p_user_id: user.id,
});
// data is the returned text value (invoice number string)
```

### Dynamic import for PDF generation (pattern verified from research)
```typescript
// Source: @react-pdf/renderer docs + github.com/diegomura/react-pdf discussions
const { pdf } = await import('@react-pdf/renderer');
const { InvoicePdfDocument } = await import('@/components/invoice/InvoicePdfDocument');
const blob = await pdf(<InvoicePdfDocument {...props} />).toBlob();
const url = URL.createObjectURL(blob);
// Trigger download
const a = document.createElement('a');
a.href = url;
a.download = `invoice-${number}.pdf`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

### useFieldArray minimal setup (project pattern: react-hook-form ^7.53.0)
```typescript
// Source: react-hook-form docs — useFieldArray
import { useForm, useFieldArray } from 'react-hook-form';

const form = useForm({ defaultValues: { items: [{ description: '', quantity: 1, unit_price: 0 }] } });
const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
// Always use field.id as React key, not index
```

### Overdue derivation with date-fns (isBefore already in project)
```typescript
// Source: date-fns docs — isBefore + project date-fns ^3.6.0
import { isBefore, parseISO } from 'date-fns';

function isOverdue(status: string, due_date: string | null): boolean {
  return status === 'sent' && !!due_date && isBefore(parseISO(due_date), new Date());
}
```

### Font registration for PDF (from @react-pdf/renderer Context7 docs)
```typescript
// Source: Context7 /diegomura/react-pdf — Font.register
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'NotoSans',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/notosans/v27/o-0IIpQlx3QUlC5A4PNr4AxMTSo.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/notosans/v27/o-0JIpQlx3QUlC5A4PNjDhFSZwp1W0.ttf', fontWeight: 700 },
  ],
});
// Register once at module level, not inside render
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@react-pdf/renderer` PDFViewer embedded in browser | `pdf().toBlob()` + `URL.createObjectURL` download | Always optional, now preferred for lazy use | No iframe in the page, no bundle cost until user clicks button |
| PostgreSQL SEQUENCE for invoice numbers | `SELECT MAX() FOR UPDATE` in PL/pgSQL function | Standard for gapless per-user sequences | Sequences are global and non-transactional; per-user MAX is correct for this use case |
| TanStack Query v4 `onSuccess` in `useQuery` | v5: `onSuccess` ONLY in `useMutation` | TQ v5 (project uses v5.56.2) | Do NOT add `onSuccess` to `useQuery` — it doesn't exist in v5 |
| Hardcoded `manualChunks` in vite.config for PDF | Dynamic `import()` → Vite auto-splits | Vite 4+ | The vite.config already has `manualChunks` for known vendors; PDF library gets its own auto-chunk via dynamic import |

**Deprecated/outdated:**
- `<PDFViewer>` component embedded in the browser page: Creates an iframe, heavy render cost, adds to bundle. Use `pdf().toBlob()` instead for a clean download experience.
- `@react-pdf/renderer` `onRender` callback: Deprecated in v3+. Use the Promise-based `pdf().toBlob()` API.
- Writing `overdue` to the `invoice_status` column: Never appropriate in this application's design.

---

## Open Questions

1. **Does `generate_invoice_number` need to handle non-numeric invoice_numbers?**
   - What we know: The function needs to cast `invoice_number` to integer. If users ever had a prefix-format number (e.g., "INV-001"), the `CAST` would fail. The `WHERE invoice_number ~ '^\d+$'` guard handles this safely.
   - What's unclear: Whether any existing invoice rows (there are none — this is a new feature) could have non-numeric numbers.
   - Recommendation: Include the regex guard `AND invoice_number ~ '^\d+$'` in the MAX query to be defensive.

2. **Will `@react-pdf/renderer` fonts load correctly in production (CORS, CDN)?**
   - What we know: Google Fonts serves TTF files. `@react-pdf/renderer` fetches them at PDF generation time (not bundle time). CORS headers on Google Fonts CDN allow cross-origin font fetching.
   - What's unclear: Whether the production deployment environment has any CSP headers blocking external font fetches.
   - Recommendation: Test font loading in a production build before finalizing. Fallback: bundle the font file in `public/fonts/` and reference it with a relative path.

3. **Does the existing `invoices` table have a `moddatetime` trigger for `updated_at`?**
   - What we know: The `invoices` Row type shows `updated_at: string`. The `Update` type allows setting it manually.
   - What's unclear: Whether a DB trigger auto-updates it.
   - Recommendation: Defensively set `updated_at: new Date().toISOString()` in all update payloads, consistent with the `useUpdateClient` precedent established in Phase 3.

4. **Should invoice list support inline status filter tabs or a dropdown?**
   - What we know: The requirements say "Users can view" invoices — no UI spec for filtering. The income page uses filter tabs (`All / Received / Expected`).
   - What's unclear: Whether the user wants tabs or a dropdown for filtering.
   - Recommendation: Use tabs matching the income page pattern: `All | Draft | Sent & Overdue | Paid`. This is at Claude's discretion per the phase's open UI decisions.

5. **Does the `invoice_items.amount` generated column need special handling on insert?**
   - What we know: `invoice_items.amount` is a generated column (`amount | null` in Row, excluded from Insert/Update types per STATE.md [01-03] decision). The DB computes it as `quantity * unit_price`.
   - What's unclear: Nothing — the Insert type confirms it's excluded. Just insert `description`, `quantity`, `unit_price`, `sort_order`.
   - Recommendation: Do not include `amount` in the `invoice_items` insert payload. Use `item.amount ?? item.quantity * item.unit_price` for display purposes (handles the nullable generated column).

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/integrations/supabase/types.ts` — `invoices` and `invoice_items` table Row/Insert/Update fully confirmed; `invoice_status` enum confirmed as `draft | sent | paid | overdue | cancelled`
- Codebase: `src/lib/queryKeys.ts` — `queryKeys.invoices` already defined
- Codebase: `src/hooks/useClients.ts` — direct hook structure precedent for `useInvoices`
- Codebase: `src/hooks/useIncomes.ts` — mutation pattern precedent; `useAddIncome` architecture to follow for INV-06
- Codebase: `src/App.tsx` — lazy route registration pattern
- Codebase: `src/i18n/index.ts` — i18n key naming conventions (both `en` and `ar` confirmed)
- Codebase: `vite.config.ts` — bundle budget 350 KB gzip; `manualChunks` pattern; dynamic import auto-splits confirmed via Vite docs
- Codebase: `scripts/check-bundle-budget.mjs` — budget enforced at 350 KB gzip on `index-*.js`
- Context7 `/diegomura/react-pdf` — `Font.register`, `Document`/`Page`/`View`/`Text` structure, `pdf().toBlob()` API
- Official Supabase docs (supabase.com/docs/guides/database/functions) — `CREATE OR REPLACE FUNCTION`, `SECURITY DEFINER`, `supabase.rpc()` call pattern
- Official Supabase docs (supabase.com/docs/reference/javascript/rpc) — RPC JavaScript client pattern

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — `[Phase 5]` blockers: PDF RTL medium-confidence, RPC for invoice number unspecified; `[01-01]` UNIQUE constraint; `[01-03]` generated columns excluded from Insert/Update
- github.com/diegomura/react-pdf/discussions/2306 — RTL workarounds confirmed as workarounds, not native support
- github.com/diegomura/react-pdf/issues/2900 — Nested `<Text>` RTL bug confirmed open as of Feb 22 2025
- dmitriiboikov.com PDF library comparison 2025 — `@react-pdf/renderer` recommended for React projects
- github.com/kimmobrunfeldt/howto-everything gapless counter — PostgreSQL `FOR UPDATE` locking pattern confirmed
- gist.github.com/JacobFischer — `pdf({}).updateContainer().toBlob()` pattern confirmed

### Tertiary (LOW confidence)
- Bundle size of `@react-pdf/renderer` v4.3.2: ~450 KB uncompressed (referenced in WebSearch, not independently verified via Bundlephobia). Treat as "large enough to require lazy loading" regardless of exact number.
- Arabic PDF RTL with `U+202B` control characters: reported as a workaround in the Discussion, not validated in this project.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing packages confirmed installed; `@react-pdf/renderer` identified as the only viable React-first PDF library
- Architecture: HIGH — direct precedents in Phase 3/4 hooks; RPC pattern verified via Supabase docs; line item array via `useFieldArray` is the standard react-hook-form pattern
- PDF lazy loading: HIGH — dynamic `import()` pattern confirmed; Vite auto-splitting behavior confirmed
- PDF RTL Arabic support: LOW — known open bugs in v4 as of Feb 2025; safe default is English-only PDF
- Invoice number atomicity: MEDIUM-HIGH — PostgreSQL `FOR UPDATE` pattern confirmed by authoritative sources; exact function syntax should be reviewed by a Supabase migration expert before shipping
- Pitfalls: HIGH — most are codebase-verified (bundle budget, enum usage, route ordering) or documented in STATE.md

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days — `@react-pdf/renderer` RTL bugs may be fixed; check issues #2638 and #2900 before implementation)
