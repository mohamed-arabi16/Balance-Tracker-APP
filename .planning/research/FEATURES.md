# Advanced Mode — Feature Research

**Research Date:** 2026-02-23
**Purpose:** Define the full feature surface of the freelancer Advanced Mode. This document is the authoritative reference for downstream planning agents scoping requirements, phases, and implementation tasks.

---

## Context Summary

The existing app (React 18 + TypeScript + Supabase + TanStack React Query + Shadcn/ui) is a personal finance tracker with income, expense, debt, and asset management. The current database has tables: `incomes`, `expenses`, `debts`, `assets`, `user_settings`, `recent_activity`, `debt_amount_history`, `income_amount_history`. All data is user-isolated via Supabase RLS policies.

Advanced Mode is **additive** — it layers a freelancer toolkit on top of the existing Simple mode without replacing any current functionality. The mode toggle is persisted in `user_settings`, consistent with how theme and currency preferences are stored.

---

## Table Stakes (Must Have — Freelancers Leave Without These)

These features are non-negotiable. A freelancer who opens the app and cannot perform any one of these will not use the product. They define the minimum viable freelancer experience.

---

### 1. Client Management

**Description:** Create, view, edit, and archive clients. Each client is a named entity representing a company or individual the freelancer works with. Clients serve as the central organizing unit — invoices and transactions attach to them.

**Core fields required:**
- Display name (required)
- Company name (optional)
- Email address (for display and copy; not used to send)
- Phone number (optional)
- Notes / billing address (free-text)
- Status: active / archived
- Created date (auto)

**Views required:**
- Client list with search and filter by status (active / archived)
- Client detail view showing: contact info, associated invoices, total paid, outstanding balance
- Create and edit modals (consistent with existing Shadcn Dialog pattern used in Income, Expenses, Debts)
- Archive (soft delete) — clients with invoices must never be hard-deleted; archiving hides them from active lists

**Complexity:** Medium

**Why medium, not low:** Client detail view aggregates data across invoices and transactions. The `client_id` foreign key must be nullable in the `incomes` table (and a new `invoices` table) to preserve backward compatibility with existing transaction records. Archiving logic requires soft-delete pattern not currently in the codebase.

**Dependencies:**
- New `clients` table in Supabase with RLS policies mirroring the existing pattern (`user_id = auth.uid()`)
- `user_settings` table needs `advanced_mode_enabled` boolean column
- No dependency on invoices to create clients; clients come first

---

### 2. Invoice Creation

**Description:** Create a structured invoice tied to a client, composed of one or more line items. Each line item has a description, quantity, unit rate, and computed subtotal. The invoice has a number, issue date, due date, currency, and optional notes.

**Core fields required:**
- Invoice number (auto-generated with user-editable prefix, e.g., INV-001)
- Client (required — selected from existing clients list)
- Issue date (defaults to today)
- Due date (required)
- Currency (defaults to user's default currency from `user_settings`)
- Line items (minimum 1):
  - Description (text)
  - Quantity (numeric, positive)
  - Rate (numeric, per unit)
  - Subtotal (quantity × rate, computed client-side and stored)
- Subtotal (sum of line items)
- Tax rate (optional percentage field — stored but not calculated into a jurisdiction-specific tax engine; simply computes amount = subtotal × rate)
- Discount (optional flat or percentage)
- Total (computed from subtotal, tax, discount)
- Notes / payment terms (free text)
- Internal memo (not shown on PDF)

**Invoice number generation strategy:** Sequence stored per-user (e.g., a `last_invoice_number` counter in `user_settings` or a dedicated sequence). Must be collision-safe — use a database-side counter or a Supabase RPC function to atomically increment and return the next number.

**Complexity:** High

**Why high:** Line items require a child table (`invoice_line_items`) with a parent FK to `invoices`. The form must dynamically add and remove rows, compute running totals in real time, and validate that at least one line item exists with valid amounts. Invoice number auto-generation must be atomic to avoid duplicates. The existing `react-hook-form` + Zod pattern extends naturally but the nested array field (line items) is substantially more complex than the flat forms currently in the codebase.

**Dependencies:**
- Clients must exist (invoice creation requires a selected client)
- New `invoices` table and `invoice_line_items` table
- `user_settings` extended with `invoice_number_prefix` and `last_invoice_sequence`

---

### 3. Invoice Status Tracking

**Description:** An invoice moves through a defined lifecycle. The status is always visible and actionable from the invoice list and detail view.

**Status lifecycle:**
```
draft → sent → paid
              ↓
           overdue  (auto-set when due date passes and status is still 'sent')
```

**Status rules:**
- `draft`: Created but not yet sent to client. Editable.
- `sent`: Marked as sent by user (app does not send email; user exports PDF). Editing locked except for notes.
- `paid`: User manually marks as paid. Records `paid_date` timestamp.
- `overdue`: Derived state. An invoice is overdue when `status = 'sent'` AND `due_date < today`. This can be computed on read rather than stored, but a stored flag updated by a Supabase scheduled function or on-read trigger avoids per-query computation at scale.

**Actions per status:**
- `draft`: Edit, Delete, Mark as Sent
- `sent`: Mark as Paid, Duplicate, View PDF
- `paid`: View PDF, Duplicate
- `overdue`: Mark as Paid, View PDF, Duplicate

**Recommended implementation:** Store `status` as an enum (`draft`, `sent`, `paid`) in the database. Derive `overdue` in the query layer (SELECT where status = 'sent' AND due_date < CURRENT_DATE). Expose a computed `effective_status` field in the hook layer. This avoids a Supabase cron job dependency and keeps logic in the client where it already runs.

**Complexity:** Medium

**Why medium, not low:** Overdue detection requires date comparison logic that must be consistent across timezone boundaries. The existing `useFilteredData` hook already does date comparisons (`date-fns` is available). Status transitions must be validated — you cannot move from `paid` back to `draft`. Locking edit fields by status adds conditional rendering complexity to the invoice form.

**Dependencies:**
- Invoice creation must exist
- `invoices` table with `status` enum, `due_date`, and `paid_date` columns

---

### 4. Invoice PDF Export

**Description:** Generate a professionally formatted PDF of an invoice, downloadable client-side. The PDF must be printable and presentable enough to send to a client as a business document.

**Required PDF content:**
- Freelancer name (from user profile) and optional business name (from settings)
- Optional logo (user-uploaded image, stored as base64 or Supabase Storage URL)
- Invoice number, issue date, due date, status
- Client name, company, email
- Itemized line items table: description, quantity, rate, subtotal
- Subtotal, tax (if set), discount (if set), total
- Notes / payment terms
- Footer with "Generated by Balance Tracker" branding (optional, toggleable)

**Recommended library:** `jsPDF` + `jspdf-autotable` for the line items grid, or `@react-pdf/renderer` for a React-component-driven approach. The constraint is client-side only (no server rendering). `@react-pdf/renderer` produces cleaner output with React primitives but adds ~130KB to bundle. `jsPDF` is lighter (~100KB) and already well-tested for invoice use cases. Either is viable; choice should be made during implementation planning with bundle budget in mind (current warning limit: 650KB chunks).

**Logo handling:** Optional. If the user has not set a logo, the PDF omits it gracefully. Logo upload stored in Supabase Storage bucket under `user_id/logo.png` with appropriate access policy (private, signed URL for reads). Logo is embedded into the PDF as a base64 data URI at generation time.

**Complexity:** High

**Why high:** Client-side PDF generation with precise layout control is notoriously difficult. Line item tables must handle text wrapping, multi-page invoices (many line items), font embedding for RTL/Arabic support (existing i18n requirement), and pixel-accurate rendering. The app supports Arabic (RTL) — RTL PDF rendering is a known hard problem with both `jsPDF` and `@react-pdf/renderer`. A pragmatic v1 decision: generate PDFs in LTR only regardless of app language setting, with RTL PDF as a future enhancement. This tradeoff must be documented for users.

**Dependencies:**
- Invoice must exist with all required fields populated
- User profile (name) from existing `profiles` table
- Optional: Supabase Storage for logo (new dependency — Storage not currently used)
- A PDF generation library added to `package.json`

---

### 5. Revenue Per Client View

**Description:** A summary view showing how much each client has paid, how much is outstanding, and the total invoiced. This is the core business intelligence view for a freelancer.

**Required data per client row:**
- Client name
- Total invoiced (sum of all invoice totals, any status)
- Total paid (sum of invoice totals where `status = 'paid'`)
- Total outstanding (sum of invoice totals where `status = 'sent'` or `overdue`)
- Invoice count
- Last invoice date

**Views:**
- Summary table on the Advanced Mode dashboard (top 5 clients by revenue)
- Full client revenue breakdown accessible from client detail view
- Date range filter (consistent with existing `DateContext` / `DateFilterSelector` pattern)

**Currency handling:** Invoices may be in different currencies. Revenue aggregations must convert to the user's display currency using the existing `CurrencyContext` exchange rates. This is the same pattern already used in the dashboard for incomes and expenses.

**Complexity:** Medium

**Why medium:** The aggregation logic runs client-side using React Query data (same pattern as current dashboard calculations in `finance.ts`). No new database functions are required if invoice counts are small. At scale (hundreds of invoices), server-side aggregation via a Supabase RPC function would be preferable — design the hook to accept either approach without UI changes.

**Dependencies:**
- Invoices with `status` and `paid_date`
- Clients table
- Currency conversion from existing `CurrencyContext`

---

### 6. Outstanding Amounts

**Description:** A dedicated view and dashboard widget showing what money is owed to the freelancer — unpaid invoices, organized by urgency.

**Required data:**
- List of `sent` and `overdue` invoices with: client name, invoice number, amount, due date, days overdue (if applicable)
- Total outstanding amount (display currency converted)
- Separate count and total for overdue invoices
- Visual indication of overdue severity (e.g., color coding: due today = yellow, 1-7 days overdue = orange, 8+ days = red)

**Dashboard widget:** A summary card on the Advanced Mode dashboard showing: total outstanding, number of overdue invoices, "View All" link.

**Complexity:** Low

**Why low:** This is a filtered view of invoice data already fetched for invoice status tracking. The overdue computation (`due_date < today` and `status = 'sent'`) is simple date arithmetic using `date-fns` which is already in the stack. The UI is a filtered and sorted list — no new data fetching patterns required.

**Dependencies:**
- Invoice status tracking
- Invoice creation

---

### 7. Profit & Loss Summary

**Description:** A period-based P&L report showing gross income, total expenses, and net profit for the freelancer's business. This bridges the existing Simple mode data (expenses already tracked) with the new freelancer income data (invoices paid).

**P&L income sources:**
- Paid invoices (from the new `invoices` table, `status = 'paid'`, `paid_date` within period)
- Existing income entries optionally linked to a client (from `incomes` table with nullable `client_id`)
- User choice: include or exclude non-client income entries (a toggle)

**P&L expense sources:**
- Existing expense entries from `expenses` table
- Future: expenses tagged to a client/project (differentiator, not table stakes)

**Report outputs:**
- Gross income for period
- Total expenses for period
- Net profit (income minus expenses)
- Profit margin percentage
- Period selector (month, quarter, year, custom range — using existing `DateContext`)
- Breakdown by category for both income and expenses

**Complexity:** Medium

**Why medium:** The data aggregation logic parallels what the existing dashboard already does for incomes and expenses (see `finance.ts`, `insights.ts`). The new complexity is joining two income sources (paid invoices + income entries) with proper currency conversion and date filtering. The `DateContext` and `CurrencyContext` already handle the filtering and conversion concerns. The main implementation risk is that currency conversion of historical invoice amounts must use the rate at the time of payment, not the current rate — this requires storing the exchange rate on the invoice at the time it is marked paid, which is an easy-to-miss schema requirement.

**Dependencies:**
- Invoices with `paid_date` and stored currency
- Existing `expenses` table (already available)
- Existing `incomes` table (available; `client_id` FK addition needed)
- Currency exchange rate stored on invoice at payment time

---

## Differentiators (Competitive Advantage If Included in v1)

These features are not required for the product to be usable, but they meaningfully raise the ceiling above commodity invoice tools. Each is achievable within the existing tech stack without new backend services.

---

### Monthly Profit Trend Chart

**Description:** A line or bar chart showing net profit per month for the trailing 12 months. Immediately shows a freelancer whether their business is growing.

**Implementation:** Recharts is already in the stack (`recharts 2.12.7`). The existing dashboard uses it for data visualization. The data is a group-by-month aggregation over paid invoices and expenses. No new dependencies required.

**Complexity:** Low (given Recharts already present)

**Value:** High — freelancers make pricing and workload decisions based on income trend. This is the single most impactful visualization for a freelance business.

**Dependency:** Requires several months of paid invoice data to be meaningful. The chart should gracefully handle sparse data (show zeros for months with no activity).

---

### Client Portal / Sharing Link

**Description:** A public, read-only URL that a client can open to view their invoice without needing an account. The link would show the invoice in a formatted HTML view (not requiring PDF download).

**Implementation approach:** Generate a signed token stored on the invoice row (`share_token uuid`). A public route (`/invoice/:token`) renders the invoice without auth. Supabase RLS would need a policy exception for rows with a valid share token, or a Supabase Edge Function serves the data using a service role key.

**Complexity:** High

**Why high:** Public routes bypass the existing `ProtectedRoute` pattern. The Supabase RLS policy model does not easily accommodate "public access to specific rows by token" without a service role key (which should not be in client-side code). This requires a Supabase Edge Function — a new infrastructure dependency. The security model must be carefully designed to prevent token enumeration. **Recommendation: defer to post-v1 unless the Edge Function infrastructure is already being used for another feature.**

---

### Recurring Invoice Templates

**Description:** Save an invoice as a template that can be instantiated on a schedule (monthly, quarterly) or manually duplicated. Each instantiation creates a new draft invoice with the same line items and client.

**Implementation:** A separate `invoice_templates` table mirroring the `invoices` / `invoice_line_items` structure. A "Create from Template" action creates a new draft invoice pre-populated from the template. Automatic scheduling would require a Supabase scheduled job (pg_cron) — avoid in v1.

**Complexity:** Medium (manual duplication) / High (scheduled auto-creation)

**Recommendation for v1:** Implement manual "Duplicate Invoice" action (creates a new draft from any existing invoice — resets invoice number, status, dates). This delivers 80% of the value at 20% of the complexity. True recurring templates with scheduling are post-v1.

---

### Expense Tagging Per Project / Client

**Description:** Allow existing expense entries to be linked to a client, enabling per-client profitability. For example, a freelancer can tag their software subscription to a client project and see true per-client profit.

**Implementation:** Add a nullable `client_id` FK to the existing `expenses` table. The expense creation and edit forms gain an optional "Link to Client" field (a combobox showing active clients). The P&L summary then shows client-attributed expenses separately.

**Complexity:** Low (schema change + form addition)

**Why low:** The schema change is minimal (one nullable column + FK). The form UI reuses the client selector component built for invoice creation. The P&L query already reads from `expenses`; filtering by `client_id` is a WHERE clause addition.

**Value:** Medium — most freelancers do not carefully attribute expenses per client in early usage. Useful when they do, but not a reason to choose or leave the product.

---

### Time Tracking Integration

**Description:** Log hours against a client, which auto-populates invoice line items (hours × hourly rate).

**Implementation:** Would require a new `time_entries` table with `client_id`, `date`, `hours`, `description`, and `hourly_rate`. A "Generate Invoice from Time Entries" action aggregates entries into line items.

**Complexity:** High

**Why high:** Time tracking is effectively a full sub-feature with its own CRUD interface, data model, and UX considerations (timer vs manual entry). It also requires a strong opinion on how time entries map to invoice line items (group by project? by date? by description?). This is a product design problem, not just an engineering one.

**Recommendation:** Do not build in v1. The target user can manually enter "10 hours consulting @ $150/hr" as a line item. Evaluate after v1 launch based on user requests.

---

## Anti-Features (Deliberately NOT Building in v1)

These are features that might seem expected but are explicitly excluded from scope. Document the rationale so future agents do not re-introduce them during planning.

---

### Email Sending

**Not building because:** Requires an email service provider (SendGrid, Resend, Postmark, etc.) — a new third-party dependency with its own auth, pricing, compliance (CAN-SPAM, GDPR), and deliverability concerns. The constraint is React + Supabase only, no new backend services.

**What we do instead:** The user exports a PDF and sends it manually from their own email client. This is standard practice for freelancers at this stage. The PDF export must produce a file clean enough that manual sending is painless.

**Future path:** If email sending is added post-v1, it should use a Supabase Edge Function calling a transactional email API, keeping the frontend unchanged.

---

### Tax Calculation Engine

**Not building because:** Tax rules are jurisdiction-specific, change frequently, and have legal implications. Computing incorrect tax for a user could create real financial or legal harm. There is no single tax model that works across the US (varies by state), EU (VAT), UK, Canada, and MENA markets — all regions represented in the app's existing user base.

**What we do instead:** The invoice has an optional "Tax Rate %" field that computes a tax line (subtotal × rate). The user is responsible for entering the correct rate. The app makes no judgment about what rate is correct.

**Future path:** Integrate a tax API (TaxJar, Vatstack) as an opt-in enhancement for users in supported jurisdictions.

---

### Payroll

**Not building because:** Payroll involves employee records, withholding calculations, government remittance schedules, and legal compliance obligations. This is categorically a different product from a freelancer invoicing tool.

---

### Multi-User / Team Accounts

**Not building because:** All existing Supabase RLS policies are written around `user_id = auth.uid()`. Supporting team accounts requires a role-based access control layer, organization tables, and policy rewrites across all existing tables. This is an architectural migration, not a feature addition.

**What we do instead:** Single-user only. All data belongs to one account. Clients are the freelancer's clients, not collaborators.

**Future path:** Introduce an `organizations` table and a `user_organization_memberships` join with roles. This is a major architectural investment requiring its own planning cycle.

---

### Subscription Billing

**Not building because:** Recurring billing requires integration with a payment processor (Stripe, etc.), webhook handling, and complex state management for payment failures, retries, and proration. This is infrastructure, not a feature.

**What we do instead:** Recurring invoice templates (manual duplication) delivers the scheduling convenience. The payment itself is handled offline by the freelancer.

---

## Feature Dependencies

This section maps which features must exist before others can be built. Agents planning phases and sprints must respect this ordering.

```
user_settings (advanced_mode_enabled column)
└── Mode Toggle UI
    └── Advanced Mode Dashboard Shell

clients table
└── Client Management (create, edit, archive, list, detail)
    └── Invoice Creation  ──────────────────────────────────────────┐
        └── Invoice Status Tracking                                  │
            ├── Outstanding Amounts View                             │
            ├── Revenue Per Client View                              │
            └── Invoice PDF Export                                   │
                                                                     │
    └── Expense Tagging Per Client (optional client_id on expenses) │
        └── P&L Summary (per-client breakdown)                      │
                                                                     │
incomes table (client_id nullable FK addition)                       │
└── P&L Summary (income sources)  ◄──────────────────────────────────┘
    └── Monthly Profit Trend Chart
```

**Explicit ordering constraints:**

1. `clients` table and Client Management must be complete before any invoice work begins.
2. Invoice Creation must be complete before Invoice Status Tracking, PDF Export, Revenue Per Client, or Outstanding Amounts.
3. P&L Summary can be built partially (expenses only) before invoices exist, but the full version requires paid invoice data.
4. Monthly Profit Trend Chart requires P&L Summary logic to exist (it is a time-series visualization of the same data).
5. The Mode Toggle and Advanced Mode Dashboard shell can be scaffolded in parallel with client management — the dashboard will be empty until other features populate it.
6. PDF Export has no blocker beyond invoice data existing, but it requires a new npm dependency decision made early (bundle budget impact).

---

## Complexity Notes

This section flags features that are deceptively simple or genuinely hard, to calibrate estimation accuracy.

---

### Deceptively Simple (Looks Easy, Has Hidden Complexity)

**Invoice Number Generation**
Looks like a counter. Is actually a concurrency problem. Two invoices saved in quick succession (double-click, slow network, etc.) can collide if the counter is read and incremented client-side. Must use a Supabase RPC function with `FOR UPDATE` row lock or a PostgreSQL sequence to guarantee uniqueness.

**Invoice Status "Overdue"**
Looks like a field. Is actually a derived state that depends on the current date. If stored as a status enum value, it goes stale immediately (an invoice marked 'sent' on February 1 is not overdue on February 1, but is overdue on March 1 without any user action). The correct model is to compute overdue on read. Every query that aggregates invoice data must include this computation consistently.

**Revenue Per Client Currency Conversion**
Looks like a sum. Each invoice may be in a different currency. The conversion rate at payment time may differ from the current rate. Summing historical paid amounts in display currency using the current exchange rate produces a number that changes daily even for settled invoices. The correct model stores the exchange rate at the time of payment on the invoice row (`paid_exchange_rate numeric`). This field is easy to forget in schema design.

**Expense Tagging (Nullable FK on existing table)**
Looks like adding a column. Requires a migration that runs on a live production table with existing rows. Must be nullable (no default) so existing rows are unaffected. Must also update the TypeScript types generated from Supabase schema. Any existing query that reads expenses must be checked to ensure the new nullable column does not break deserialization.

---

### Genuinely Hard (Known Difficult Problems)

**Invoice PDF Export with RTL Support**
The app supports Arabic (RTL). PDF generation libraries have limited and inconsistent RTL support. Arabic text may render incorrectly (reversed, missing ligatures) in `jsPDF` without a custom Arabic font embedded as base64. `@react-pdf/renderer` has better RTL support but is not complete. This is a known unsolved problem in client-side PDF generation. **v1 recommendation: generate all PDFs in LTR layout and document this limitation explicitly. Revisit with a dedicated RTL PDF solution post-v1.**

**Client Portal / Public Invoice Links**
Requires bypassing the current auth model without creating security holes. Token-based public access to Supabase data requires either a service role key (must not be in client code) or a Supabase Edge Function acting as a proxy. The existing infrastructure has one Edge Function (metal prices) — extending to invoice access is feasible but adds operational surface area. The security model must prevent: token enumeration, unauthorized invoice traversal, and information leakage about the freelancer's client list.

**Invoice Creation Form (Dynamic Line Items)**
React Hook Form's `useFieldArray` manages dynamic rows. The complexity comes from: real-time total computation as quantities and rates change, validation that fires correctly on nested fields (each line item independently validated), and the UX of adding/removing rows on mobile. The existing forms in the codebase are all flat (single-level fields). This is the first form requiring nested arrays, which requires a different mental model for form state and validation wiring.

**PDF Bundle Size**
Both `jsPDF` (~100KB gzip) and `@react-pdf/renderer` (~130KB gzip) add meaningfully to bundle size. The current chunk warning limit is 650KB. The PDF library will likely land in the main vendor chunk unless code-split explicitly. The PDF generation code should be lazy-loaded (dynamic import triggered only when the user clicks "Export PDF") so it does not impact initial load time. This requires a dynamic import pattern that is currently not used in the codebase.

**P&L Exchange Rate Accuracy**
Historical P&L accuracy requires historical exchange rates, not the current rate. A paid invoice from six months ago in EUR should be reported in USD at the rate that was current when it was paid, not today's rate. The existing `useExchangeRate` hook fetches only current rates. The solution is to store `amount_in_display_currency` and `exchange_rate_at_payment` on the invoice at the moment the user marks it paid. This is easy to implement correctly the first time and nearly impossible to correct retroactively for existing records.

---

## Summary Table

| Feature | Category | Complexity | Depends On |
|---|---|---|---|
| Mode Toggle UI | Infrastructure | Low | user_settings column |
| Advanced Dashboard Shell | Infrastructure | Low | Mode Toggle |
| Client Management | Table Stakes | Medium | clients table, RLS |
| Invoice Creation | Table Stakes | High | Clients |
| Invoice Status Tracking | Table Stakes | Medium | Invoice Creation |
| Invoice PDF Export | Table Stakes | High | Invoice Creation, PDF library |
| Revenue Per Client | Table Stakes | Medium | Status Tracking |
| Outstanding Amounts | Table Stakes | Low | Status Tracking |
| P&L Summary | Table Stakes | Medium | Invoices, Expenses, Incomes |
| Monthly Profit Trend Chart | Differentiator | Low | P&L Summary, Recharts (existing) |
| Client Portal / Sharing Link | Differentiator | High | Invoices, Edge Function |
| Recurring Invoice Templates | Differentiator | Medium | Invoice Creation |
| Expense Tagging Per Client | Differentiator | Low | Clients, expenses migration |
| Time Tracking Integration | Differentiator | High | Clients, Invoice Creation |

---

*Research authored: 2026-02-23. Referenced by: REQUIREMENTS.md, PHASES.md (not yet written).*
