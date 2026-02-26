# Phase 3: Client Management - Research

**Researched:** 2026-02-24
**Domain:** React CRUD pages, React Hook Form + Zod, TanStack Query v5 mutations, Supabase, shadcn/ui
**Confidence:** HIGH

## Summary

Phase 3 is a straightforward CRUD implementation on top of a fully-defined `clients` table that already exists in the database schema (confirmed in `src/integrations/supabase/types.ts`). The stack is locked: TanStack Query v5 for server state, React Hook Form + Zod for form validation, Supabase JS for persistence, shadcn/ui for all UI primitives, and react-router-dom v6 for navigation. All patterns are established in the codebase — this phase follows the `useAssets`/`useExpenses`/`EditAssetPage` precedent almost exactly.

The key structural decision from the user is that create and edit live on dedicated pages (`/clients/new` and `/clients/:id/edit`), not in modals. This is the same pattern already used for assets (`EditAssetPage.tsx`). The client list is a card grid, delete is triggered from a `⋯` dropdown on the card (using `DropdownMenu` + `AlertDialog`), and after save the app navigates to the client detail page (`/clients/:id`).

The client detail page (CLNT-04) requires two related data fetches joined to a client ID: `invoices` filtered by `client_id` and `incomes`/`expenses` filtered by `client_id`. Both relationships are wired in the DB schema. No new infrastructure is needed — this is a page that reads from existing hooks or minimal new query variants.

**Primary recommendation:** Build `useClients` hook first (all CRUD mutations + query key from `queryKeys.clients`), then the three pages (list, create, edit), then the detail page. Add all i18n keys in both `en` and `ar` for every new string before building components.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Client list presentation**
- Card grid layout (not table or list rows)
- Card content: Claude's discretion — pick what fits the card design naturally (no strict field requirement specified)
- No avatar or initials badge — text only
- Empty state: illustration + friendly message + Add Client button

**Create & Edit UX**
- Dedicated page for both create (/clients/new) and edit (/clients/:id/edit) — not a drawer or modal
- After saving (create or edit), navigate to the client detail page
- Delete available from the card via a ⋯ context menu — no navigation to edit page required
- Required fields: name only — email, phone, company, and notes are all optional

### Claude's Discretion

- Exact card fields displayed (name + company confirmed; additional info like email or invoice count at Claude's discretion)
- Form layout and field order on the create/edit page
- Delete confirmation pattern (dialog wording, etc.)
- Search bar placement and live-vs-submit behavior (user did not discuss search)
- Client detail page layout (user did not discuss this area)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLNT-01 | User can create a client with name, email, phone, company, and notes fields | `clients` table Insert type already has all 5 fields. Only `name` is required (others nullable). Zod schema + react-hook-form handles validation. Route `/clients/new` with dedicated page. |
| CLNT-02 | User can edit an existing client's details | `clients` table Update type is fully defined. `useAsset`/`EditAssetPage` is the direct pattern precedent — `useParams` to get id, fetch single client, populate form via `reset()`, `useNavigate` after save. Route `/clients/:id/edit`. |
| CLNT-03 | User can view a list of all clients with text search | Query all clients for current user via `useClients()`. Live-filter in-memory by `name` or `company` using controlled `<Input>` state. Card grid layout. `DropdownMenu` + `AlertDialog` delete flow on card. |
| CLNT-04 | User can view a client detail page showing all invoices and linked transactions for that client | Route `/clients/:id`. Fetch single client for header. Filtered invoice query by `client_id`. Filtered incomes and expenses queries by `client_id`. Three sections: client info, invoices list, linked transactions. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | ^5.56.2 (installed) | Server state, caching, mutations | Already used for all data hooks |
| `react-hook-form` | ^7.53.0 (installed) | Form state + submission | Already used in Expenses, EditAssetPage |
| `zod` | ^3.23.8 (installed) | Schema validation for forms | Already used with `@hookform/resolvers` |
| `@supabase/supabase-js` | ^2.97.0 (installed) | DB reads/writes | Single source of truth for persistence |
| `react-router-dom` | ^6.26.2 (installed) | Page routing, `useNavigate`, `useParams` | Already wired in App.tsx |
| `sonner` | ^1.5.0 (installed) | Toast notifications | Already used by all mutation success/error handlers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^0.462.0 (installed) | Icons: `Users`, `MoreVertical`, `Plus`, `Search`, `Pencil`, `Trash2` | All icon needs — already imported in Sidebar |
| `shadcn/ui` components | (all installed) | `Card`, `DropdownMenu`, `AlertDialog`, `Input`, `Textarea`, `Form`, `Button`, `Skeleton` | All UI structure — zero new installs needed |
| `react-i18next` | ^15.6.1 (installed) | i18n `t()` hook | All visible strings — existing pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory search filter | Supabase `.ilike()` server-side search | In-memory is simpler for small client lists, no DB round-trips, matches UX expectation of live filtering |
| `DropdownMenu` for card actions | `ContextMenu` | DropdownMenu triggered by explicit `⋯` button is more discoverable on mobile; the CONTEXT.md spec says ⋯ |

**Installation:** No new packages needed. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   └── useClients.ts          # All client CRUD: useClients, useClient, useAddClient, useUpdateClient, useDeleteClient
├── pages/
│   ├── advanced/
│   │   ├── ClientsPage.tsx    # /clients — list + search + card grid
│   │   ├── ClientNewPage.tsx  # /clients/new — create form
│   │   ├── ClientEditPage.tsx # /clients/:id/edit — edit form
│   │   └── ClientDetailPage.tsx # /clients/:id — detail view
│   └── ...existing pages
├── i18n/
│   └── index.ts               # Add clients.* keys in both en and ar sections
└── App.tsx                    # Add 4 new <Route> entries under AdvancedRoute
```

### Pattern 1: Hook Structure — follow `useAssets.ts`
**What:** All mutations and queries for a resource live in one file. Each hook is exported individually. The list query uses `queryKeys.clients(userId)`.
**When to use:** Every new resource hook in Phase 3+. The `queryKeys` factory is already set up for `clients`.
**Example:**
```typescript
// src/hooks/useClients.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import type { Database } from '@/integrations/supabase/types';

export type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

// List all clients for current user
export const useClients = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.clients(user!.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user!.id)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data as Client[];
    },
    enabled: !!user,
  });
};

// Fetch single client by ID
export const useClient = (clientId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.clients(user!.id), clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('user_id', user!.id)
        .single();
      if (error) throw new Error(error.message);
      return data as Client;
    },
    enabled: !!user && !!clientId,
  });
};

// Add client
export const useAddClient = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Omit<ClientInsert, 'user_id'>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...payload, user_id: user!.id }])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user!.id) });
    },
  });
};

// Update client
export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Client;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user!.id) });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.clients(user!.id), updated.id] });
    },
  });
};

// Delete client
export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user!.id);
      if (error) throw new Error(error.message);
      return clientId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user!.id) });
    },
  });
};
```

### Pattern 2: Edit Form Page — follow `EditAssetPage.tsx`
**What:** `useParams` gets the ID, `useClient(id)` fetches the record, `form.reset(client)` populates the form once data arrives, `useNavigate` redirects after save.
**When to use:** `ClientEditPage.tsx`
**Example:**
```typescript
// src/pages/advanced/ClientEditPage.tsx (sketch)
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClient, useUpdateClient } from '@/hooks/useClients';

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});
type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id!);
  const updateClient = useUpdateClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '', email: '', phone: '', company: '', notes: '' },
  });

  // Populate form when data loads — key pattern from EditAssetPage
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        email: client.email ?? '',
        phone: client.phone ?? '',
        company: client.company ?? '',
        notes: client.notes ?? '',
      });
    }
  }, [client, form]);

  const onSubmit = (values: ClientFormValues) => {
    updateClient.mutate(
      { id: id!, ...values },
      {
        onSuccess: (updated) => {
          toast.success(t('clients.toast.updateSuccess'));
          navigate(`/clients/${updated.id}`);
        },
        onError: (err) => toast.error(t('clients.toast.updateError', { error: err.message })),
      }
    );
  };
  // ... render form
}
```

### Pattern 3: Card with DropdownMenu Delete
**What:** Each client card has a `DropdownMenu` triggered by a `MoreVertical` icon button. "Delete" opens an `AlertDialog` for confirmation. Edit navigates to the edit page.
**When to use:** Client card in `ClientsPage.tsx`
**Example:**
```typescript
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

// Inside ClientCard component:
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}/edit`)}>
      <Pencil className="h-4 w-4 mr-2" /> {t('common.edit')}
    </DropdownMenuItem>
    <DropdownMenuItem
      className="text-destructive"
      onClick={() => setDeletingClient(client)}
    >
      <Trash2 className="h-4 w-4 mr-2" /> {t('common.delete')}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
// AlertDialog is controlled separately, keyed off `deletingClient` state
```

### Pattern 4: Client Detail — Filtered Queries
**What:** The detail page fetches invoices and transactions for a specific `client_id`. Use derived queries from existing hooks or inline Supabase queries with a `client_id` filter.
**When to use:** `ClientDetailPage.tsx`
**Example:**
```typescript
// Inline filtered query for client invoices
const { data: invoices } = useQuery({
  queryKey: [...queryKeys.invoices(user!.id), 'by-client', clientId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user!.id)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
  enabled: !!user && !!clientId,
});

// Inline filtered query for linked income entries
const { data: linkedIncomes } = useQuery({
  queryKey: [...queryKeys.incomes(user!.id), 'by-client', clientId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('incomes')
      .select('*')
      .eq('user_id', user!.id)
      .eq('client_id', clientId)
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
  enabled: !!user && !!clientId,
});

// Same pattern for expenses
```

### Pattern 5: Route Registration — follow App.tsx pattern
**What:** New advanced routes wrapped in `<AdvancedRoute>` and lazy-loaded with `React.lazy`.
**When to use:** App.tsx additions for all 4 new pages.
**Example:**
```typescript
// Lazy imports in App.tsx
const ClientsPage = lazy(() => import('./pages/advanced/ClientsPage'));
const ClientNewPage = lazy(() => import('./pages/advanced/ClientNewPage'));
const ClientEditPage = lazy(() => import('./pages/advanced/ClientEditPage'));
const ClientDetailPage = lazy(() => import('./pages/advanced/ClientDetailPage'));

// Routes inside <AppLayout>
<Route path="/clients" element={<AdvancedRoute><ClientsPage /></AdvancedRoute>} />
<Route path="/clients/new" element={<AdvancedRoute><ClientNewPage /></AdvancedRoute>} />
<Route path="/clients/:id/edit" element={<AdvancedRoute><ClientEditPage /></AdvancedRoute>} />
<Route path="/clients/:id" element={<AdvancedRoute><ClientDetailPage /></AdvancedRoute>} />
```
**IMPORTANT:** The `/clients/new` route MUST be declared before `/clients/:id` in the route list, otherwise react-router-dom v6 will match "new" as a param value for `:id`.

### Pattern 6: i18n — follow existing section structure
**What:** All new strings added to BOTH `en.translation` and `ar.translation` blocks in `src/i18n/index.ts`. Section header comment `// Clients` added before the new keys.
**When to use:** Before building any component that uses `t()`.

i18n key namespace to add:
```typescript
// English keys (clients section):
"clients.title": "Clients",
"clients.subtitle": "Manage your client relationships",
"clients.addClient": "Add Client",
"clients.searchPlaceholder": "Search by name or company...",
"clients.empty.title": "No clients yet",
"clients.empty.description": "Add your first client to get started.",
"clients.card.company": "Company",
"clients.card.email": "Email",
"clients.card.phone": "Phone",
"clients.form.name": "Name",
"clients.form.email": "Email",
"clients.form.phone": "Phone",
"clients.form.company": "Company",
"clients.form.notes": "Notes",
"clients.form.placeholder.name": "e.g., John Smith",
"clients.form.placeholder.email": "e.g., john@example.com",
"clients.form.placeholder.phone": "e.g., +1 555 000 0000",
"clients.form.placeholder.company": "e.g., Acme Corp",
"clients.form.placeholder.notes": "Any additional notes...",
"clients.new.title": "Add Client",
"clients.new.subtitle": "Fill in the details for your new client.",
"clients.edit.title": "Edit Client",
"clients.edit.subtitle": "Update the details for {{name}}.",
"clients.detail.title": "Client Detail",
"clients.detail.invoices": "Invoices",
"clients.detail.transactions": "Linked Transactions",
"clients.detail.noInvoices": "No invoices linked to this client.",
"clients.detail.noTransactions": "No transactions linked to this client.",
"clients.delete.title": "Delete Client",
"clients.delete.description": "Are you sure you want to delete {{name}}? This action cannot be undone. Linked invoices will be blocked from deletion until reassigned.",
"clients.toast.addSuccess": "Client added successfully!",
"clients.toast.addError": "Error adding client: {{error}}",
"clients.toast.updateSuccess": "Client updated successfully!",
"clients.toast.updateError": "Error updating client: {{error}}",
"clients.toast.deleteSuccess": "Client deleted successfully!",
"clients.toast.deleteError": "Error deleting client: {{error}}",
```

### Anti-Patterns to Avoid
- **Do not inline Supabase calls inside page components:** All DB access must go through dedicated hook functions in `useClients.ts`, mirroring `useAssets.ts`/`useExpenses.ts`.
- **Do not skip `enabled: !!user` on queries:** Every query that depends on `user.id` must guard with `enabled`. Without it, the query fires with `undefined` user on initial render.
- **Do not use `user!.id` outside a `queryFn`:** Inside the `useClients` hook the user is checked by `enabled`. Inside the mutation function, user is captured in closure — still safe. Do not use non-null assertion in event handlers directly.
- **Do not register `/clients/new` after `/clients/:id`:** React Router v6 matches top-to-bottom within a `<Routes>` block. "new" will be treated as a client ID if order is wrong.
- **Do not use `queryKeys.clients(userId)` from outside the hook:** Callers should invalidate via the hook's `onSuccess`, not by importing `queryKeys` in page components.
- **Do not hardcode `ON DELETE RESTRICT` violation:** The schema enforces `invoices.client_id ON DELETE RESTRICT` — deleting a client that has invoices will fail at the DB level. The delete error handler must surface a user-friendly message (e.g., "Client has linked invoices and cannot be deleted").

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | Zod schema + `zodResolver` | Edge cases, async validators, type inference — already wired in the project |
| Accessible confirm dialog | Custom confirm modal | `AlertDialog` from shadcn/ui | Focus trap, keyboard dismiss, ARIA roles — already installed |
| Dropdown card menu | Custom positioned menu | `DropdownMenu` from shadcn/ui | RTL-aware positioning, keyboard nav — already installed |
| Toast notifications | Custom toast state | `sonner` via `toast.success()`/`toast.error()` | Already used project-wide |
| Server state cache | Local useState for lists | TanStack Query `useQuery` | Deduplication, background refetch, stale-while-revalidate |
| Live search | Debounce + API call | `useMemo` filter on in-memory data | Client list is small; no network round-trip needed |

**Key insight:** Every primitive this phase needs already exists in the installed packages. The work is wiring, not discovery.

---

## Common Pitfalls

### Pitfall 1: ON DELETE RESTRICT Surprises
**What goes wrong:** `useDeleteClient` mutation throws a Postgres error "violates foreign key constraint" when the client has linked invoices. Supabase returns HTTP 409 / error code 23503.
**Why it happens:** `invoices.client_id` uses `ON DELETE RESTRICT` (confirmed in STATE.md decision [01-01]).
**How to avoid:** In the `onError` callback of `useDeleteClient`, detect FK violation and show a specific message: "This client has linked invoices. Remove or reassign the invoices before deleting the client."
**Warning signs:** Generic "Error deleting client" toast with no actionable guidance.

### Pitfall 2: Form Not Resetting on Edit Page
**What goes wrong:** `defaultValues` in `useForm` is set once at initialization. If the client data loads after the form renders, the fields remain blank.
**Why it happens:** `useForm` does not react to `defaultValues` changes after mount.
**How to avoid:** Use `form.reset(client)` inside a `useEffect` that fires when `client` data is defined, exactly as done in `EditAssetPage.tsx`:
```typescript
useEffect(() => {
  if (client) form.reset({ name: client.name, email: client.email ?? '', ... });
}, [client, form]);
```
**Warning signs:** Edit page loads with empty fields even when client exists.

### Pitfall 3: Route Ordering — /clients/new vs /clients/:id
**What goes wrong:** Navigating to `/clients/new` opens the detail page with `id = "new"`, triggering a Supabase query that fails with "invalid UUID".
**Why it happens:** React Router v6 matches routes in declaration order within `<Routes>`.
**How to avoid:** Declare `/clients/new` BEFORE `/clients/:id` in `App.tsx`. Verified: the same issue does not currently exist for assets because there is no `/assets/new` route — but it will for clients.
**Warning signs:** `useClient("new")` throws a Supabase error about UUID format.

### Pitfall 4: Missing `updated_at` on Client Updates
**What goes wrong:** The `clients` table has an `updated_at` column. If not updated on edits, it stays stale.
**Why it happens:** Supabase does not auto-update `updated_at` unless a DB trigger is in place.
**How to avoid:** In `useUpdateClient`, include `updated_at: new Date().toISOString()` in the update payload. Alternatively, confirm whether the DB has a `moddatetime` trigger on the `clients` table (likely does not, since no migration shows it). Include it defensively.
**Warning signs:** `updated_at` never changes after edits.

### Pitfall 5: Search Accessibility — Input Without Label
**What goes wrong:** A `<Input placeholder="Search...">` without a `<Label>` or `aria-label` fails accessibility audits.
**Why it happens:** Placeholder text is not a substitute for a label.
**How to avoid:** Add `aria-label={t('clients.searchPlaceholder')}` to the search input, or use a visually-hidden `<Label>`.

### Pitfall 6: Textarea for Notes Field
**What goes wrong:** Using `<Input>` for the notes field limits multi-line notes.
**Why it happens:** Notes is a free-text field — standard `<Input>` is single-line.
**How to avoid:** Use `<Textarea>` from `@/components/ui/textarea` (confirmed installed). Wire it with `FormField`/`FormControl` the same way as other fields.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Zod schema for client form (verified against project's existing schemas)
```typescript
// Source: project pattern from src/pages/Expenses.tsx + Context7 react-hook-form docs
const clientSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});
type ClientFormValues = z.infer<typeof clientSchema>;
```

### invalidateQueries with queryKey factory (verified via Context7 TanStack Query docs)
```typescript
// Source: Context7 /tanstack/query — invalidations-from-mutations guide
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.clients(user!.id) });
},
```

### Prefix-based invalidation for detail queries (verified via Context7 TanStack Query docs)
```typescript
// Source: Context7 /tanstack/query — query-invalidation guide
// Invalidating queryKeys.clients(userId) will also invalidate
// [...queryKeys.clients(userId), clientId] because of prefix matching
queryClient.invalidateQueries({ queryKey: queryKeys.clients(user!.id) });
```

### reset() for edit form population (verified via Context7 react-hook-form docs)
```typescript
// Source: Context7 /react-hook-form/react-hook-form — reset method
useEffect(() => {
  if (client) {
    reset({
      name: client.name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      company: client.company ?? '',
      notes: client.notes ?? '',
    });
  }
}, [client, reset]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TanStack Query v4 `onSuccess` in `useQuery` | v5 removed `onSuccess` from `useQuery` (only in `useMutation`) | TQ v5 (project uses v5.56.2) | Do NOT put `onSuccess` in `useQuery` options — it no longer exists. Side effects go in `useMutation.onSuccess` only |
| Manual query key arrays | `queryKeys` factory object | This project: established in Phase 3 setup (queryKeys.ts) | Always use `queryKeys.clients(userId)` — never inline `['clients', userId]` |

**Deprecated/outdated:**
- `useQuery({ onSuccess })`: Removed in TanStack Query v5. The project is on v5.56.2. Any attempt to pass `onSuccess` to `useQuery` will be silently ignored or cause a TypeScript error.

---

## Open Questions

1. **Does the `clients` table have a `moddatetime` trigger for `updated_at`?**
   - What we know: The schema type shows `updated_at: string` with an Insert default. Some Supabase projects add a DB trigger.
   - What's unclear: Whether the DB migration created this trigger. The migration files are not in the repo.
   - Recommendation: Defensively include `updated_at: new Date().toISOString()` in all update payloads to be safe. No harm if a trigger also exists.

2. **What i18n keys exist under `common.*` (e.g., `common.edit`, `common.delete`, `common.cancel`)?**
   - What we know: `expenses.delete.button`, `income.delete.button` are defined per-feature. The `AlertDialog` in Expenses uses `t('common.cancel')`.
   - What's unclear: Whether `common.edit`, `common.delete`, `common.cancel`, `common.save` are defined.
   - Recommendation: The planner should verify the `common.*` key inventory in `src/i18n/index.ts` before writing tasks, and add any missing keys as part of the i18n task.

3. **Does the sidebar already link to `/clients`?**
   - What we know: `Sidebar.tsx` has `advancedItems` array with `{ titleKey: 'nav.clients', href: '/clients', icon: Users }`. These are rendered conditionally when `isAdvanced`.
   - What's unclear: Nothing — this is already wired. The link is present. Phase 3 just needs the route and page to exist.
   - Recommendation: No sidebar work needed. Confirm during plan verification.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/integrations/supabase/types.ts` — `clients` table Row/Insert/Update confirmed, FK relationships confirmed
- Codebase: `src/lib/queryKeys.ts` — `queryKeys.clients` already defined
- Codebase: `src/hooks/useAssets.ts` — direct hook structure precedent
- Codebase: `src/hooks/useIncomes.ts` — mutation pattern precedent
- Codebase: `src/pages/EditAssetPage.tsx` — dedicated edit page with `useParams`/`useNavigate`/`form.reset()` precedent
- Codebase: `src/components/AdvancedRoute.tsx` — route guard already in use
- Codebase: `src/App.tsx` — lazy route registration pattern
- Codebase: `src/i18n/index.ts` — i18n key naming conventions confirmed (both `en` and `ar`)
- Codebase: `src/components/ui/` — `DropdownMenu`, `AlertDialog`, `Card`, `Textarea`, `Form` all installed
- Context7 `/tanstack/query` — `invalidateQueries` prefix matching, `useMutation.onSuccess` pattern
- Context7 `/react-hook-form/react-hook-form` — `reset()` for edit population, `zodResolver` pattern

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Decision [01-01]: `invoices.client_id ON DELETE RESTRICT`, `incomes/expenses.client_id ON DELETE SET NULL`

### Tertiary (LOW confidence)
- `updated_at` trigger existence: not verified (DB migrations not in repo). Treated defensively.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed installed and in use
- Architecture: HIGH — direct precedent in `useAssets.ts` and `EditAssetPage.tsx`
- Pitfalls: HIGH — DB constraint documented in STATE.md; form-reset and route-order issues are codebase-verified patterns
- i18n keys: MEDIUM — key naming is HIGH confidence (pattern confirmed), Arabic translations are MEDIUM (generated, need human review for quality)

**Research date:** 2026-02-24
**Valid until:** 2026-04-01 (stable stack, 30-day window)
