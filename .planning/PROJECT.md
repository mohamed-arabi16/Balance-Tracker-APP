# Balance Tracker

## What This Is

A personal finance app for everyday users to track income, expenses, debts, and assets — with an Advanced Mode that unlocks a full freelancer toolkit (client management, invoicing with PDF export, and transaction-client linking). v1.0–v1.1 shipped the complete web app as a PWA. v2.0 brings the full experience to iOS as a native app built with React Native, reusing the same Supabase backend so users keep their existing data.

## Core Value

Anyone can track their money simply — and freelancers can manage their business without switching apps.

## Requirements

### Validated

- ✓ User can sign up, log in, and log out — existing
- ✓ User can track income entries (add, edit, delete) — existing
- ✓ User can track expense entries (add, edit, delete) — existing
- ✓ User can track debts with payment tracking — existing
- ✓ User can track assets with auto-price updates — existing
- ✓ Dashboard shows net worth and financial overview — existing
- ✓ User can export all financial data as CSV — existing
- ✓ Multi-currency support with live exchange rates — existing
- ✓ Multilingual support including RTL (Arabic) — existing
- ✓ PWA with offline support — existing
- ✓ Dark/light theme toggle — existing
- ✓ User settings with persistent preferences — existing
- ✓ User can toggle between Simple and Advanced mode with one click — v1.0
- ✓ User can set their default mode in Settings — v1.0
- ✓ User can create and manage clients (name, contact info) — v1.0
- ✓ New transactions can be linked to a client (on creation or by editing) — v1.0
- ✓ User can create invoices linked to a client with line items — v1.0
- ✓ User can manage invoice status (Draft → Sent → Paid) — v1.0
- ✓ User can export invoices as PDF — v1.0
- ✓ All Simple mode features remain accessible in Advanced mode (additive) — v1.0
- ✓ Advanced mode dashboard: revenue per client widget — v1.1
- ✓ Advanced mode dashboard: outstanding invoices panel — v1.1

### Active

- [ ] Full feature port to iOS via React Native (all Simple + Advanced mode features)
- [ ] iOS-native UI following Apple Human Interface Guidelines
- [ ] Same Supabase backend — users access existing data on mobile
- [ ] App Store distribution

### Out of Scope

- Email sending of invoices — user exports PDF and sends manually
- Tax estimation / withholding calculator — too jurisdiction-specific
- Push notifications — deferred to future iOS milestone
- Biometric auth (Face ID / Touch ID) — deferred to future iOS milestone
- Home screen widgets — deferred to future iOS milestone
- Android version — iOS first, Android later
- Real-time collaboration / shared client portals — future milestone
- Subscription billing / recurring invoices — future milestone
- Advanced mode profit & loss breakdown per client — deferred from v1.1

## Current Milestone: v2.0 iOS Native App

**Goal:** Port the full Balance Tracker experience to iOS as a native React Native app with Apple HIG design, reusing the existing Supabase backend.

**Target features:**
- All Simple mode features (income, expenses, debts, assets, dashboard, CSV export)
- All Advanced mode features (clients, invoicing, PDF export, transaction linking, advanced dashboard)
- Multi-currency, multilingual (EN/AR with RTL), dark/light theme
- App Store distribution via Expo EAS

## Context

**Shipped state (v1.1):** ~16,650 LOC TypeScript. React 18 + Supabase + TanStack React Query + Shadcn/ui. 86 files changed across 6 phases (v1.0 + v1.1).

**Database:** clients, invoices, invoice_items tables with RLS. incomes.client_id, expenses.client_id (nullable FKs). user_settings.app_mode. invoice_status enum (draft/sent/paid/cancelled). Computed columns (invoice total, tax_amount) via GENERATED ALWAYS AS. Atomic invoice numbering via PL/pgSQL RPC with SELECT FOR UPDATE.

**Web architecture:** Pages → custom hooks → Supabase client. React Query handles all server state. Mode-aware routing via `AdvancedRoute` wrapper. PDF export via lazy `dynamic import('@react-pdf/renderer')`.

**v2.0 approach:** New React Native (Expo) codebase. Backend unchanged — same Supabase project, same DB schema, same RLS policies. Business logic (hooks, queries, types) can be ported; UI must be rebuilt for native iOS patterns. PWA will be retired once iOS app ships.

## Constraints

- **Tech Stack**: React Native (Expo) + existing Supabase backend — no new backend services
- **Backend Reuse**: Same Supabase project, same DB schema, same RLS policies — no migrations
- **Feature Parity**: iOS app must deliver all features from the web app (Simple + Advanced modes)
- **Platform**: iOS only for v2.0 — Android deferred
- **Design**: Apple Human Interface Guidelines — native navigation, gestures, typography
- **Distribution**: App Store via Expo EAS Build + Submit
- **PDF Generation**: Must work on iOS — may need different library than web's @react-pdf/renderer

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Advanced mode is additive (not a replacement UI) | Reduces complexity, users never lose access to simple features | ✓ Good — simple mode untouched through all 5 phases |
| Mode preference stored in user_settings table | Consistent with existing theme/currency persistence pattern | ✓ Good — single source of truth, works across sessions |
| Client-side PDF generation | No server needed, keeps infra simple | ✓ Good — @react-pdf/renderer with dynamic import, zero bundle cost until clicked |
| Transactions optionally link to clients (nullable FK) | Existing transactions remain valid without client context | ✓ Good — ON DELETE SET NULL preserves history on client delete |
| Overdue status derived client-side, never stored | Prevents stale DB state, no background job needed | ✓ Good — getDisplayStatus() consistent across all views |
| invoice_number atomic via PL/pgSQL RPC (SELECT FOR UPDATE) | Prevents duplicate numbers under concurrent creation | ✓ Good — no race conditions possible |
| InvoiceLineItemsField extracted as shared component | Reused identically by InvoiceNewPage and InvoiceEditPage | ✓ Good — DRY, consistent behavior |
| React Native with Expo for iOS port | Managed workflow simplifies builds, EAS handles App Store, OTA updates available | — Pending |
| Same Supabase backend for mobile | Users keep their data, no migration needed, backend already battle-tested | — Pending |
| PWA to be retired after iOS app ships | Single platform to maintain, native app replaces web | — Pending |

---
*Last updated: 2026-02-26 after v2.0 milestone start*
