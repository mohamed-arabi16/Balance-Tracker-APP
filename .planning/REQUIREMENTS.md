# Requirements: Balance Tracker v2.0 — iOS Native App

**Defined:** 2026-02-26
**Core Value:** Anyone can track their money simply — and freelancers can manage their business without switching apps.

## v2.0 Requirements

Requirements for iOS native app release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: Expo SDK 52 project scaffolded with React Native 0.76, NativeWind v4, and Expo Router v3
- [ ] **FOUND-02**: Supabase client configured with expo-secure-store session adapter, URL polyfill, and ws/stream Metro aliases
- [x] **FOUND-03**: Portable layer copied from web (hooks, types, lib functions, query keys) with import paths adjusted
- [ ] **FOUND-04**: Tab bar navigation with 5 sections (Dashboard, Transactions, Debts, Assets, More) using SF Symbols icons

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in and stay logged in across app restarts (session persisted via expo-secure-store)
- [ ] **AUTH-03**: User can log out from Settings
- [ ] **AUTH-04**: User can reset password via email link
- [ ] **AUTH-05**: Unauthenticated users are redirected to login screen

### Transactions

- [ ] **TXN-01**: User can add income entry with amount, description, category, date, and currency
- [ ] **TXN-02**: User can add expense entry with amount, description, category, date, and currency
- [ ] **TXN-03**: User can edit income and expense entries
- [ ] **TXN-04**: User can delete income and expense entries via swipe-to-delete
- [ ] **TXN-05**: User can pull-to-refresh transaction lists
- [ ] **TXN-06**: User can change income status inline via dropdown/toggle without opening edit form
- [ ] **TXN-07**: User can change expense status inline via dropdown/toggle without opening edit form
- [ ] **TXN-08**: Income categories include "debt" as an option

### Debts

- [ ] **DEBT-01**: User can add, edit, and delete debts with payment tracking
- [ ] **DEBT-02**: User can view debt payment history
- [ ] **DEBT-03**: User can swipe-to-delete debts from list
- [ ] **DEBT-04**: User can pull-to-refresh debt list

### Assets

- [ ] **ASST-01**: User can add, edit, and delete assets
- [ ] **ASST-02**: Asset prices auto-update via exchange rates / metal prices
- [ ] **ASST-03**: User can swipe-to-delete assets from list
- [ ] **ASST-04**: User can pull-to-refresh asset list

### Dashboard

- [ ] **DASH-01**: Dashboard shows net worth and financial overview with charts (Victory Native)
- [ ] **DASH-02**: Dashboard financial cards are clickable and navigate to their respective sections
- [ ] **DASH-03**: Charts respond to taps with callout (replacing web hover tooltips)

### Export

- [ ] **EXPRT-01**: User can export financial data as CSV via iOS share sheet
- [ ] **EXPRT-02**: User can export invoices as PDF via expo-print + iOS share sheet

### Advanced Mode

- [ ] **ADV-01**: User can toggle between Simple and Advanced mode
- [ ] **ADV-02**: User can create and manage clients (name, contact info) with native list + detail views
- [ ] **ADV-03**: User can create invoices linked to a client with line items
- [ ] **ADV-04**: User can manage invoice status (Draft → Sent → Paid) — inline status change without opening edit
- [ ] **ADV-05**: User can link transactions to clients (optional, on creation or edit)
- [ ] **ADV-06**: Advanced dashboard shows revenue per client and outstanding invoices

### Bug Fixes

- [ ] **FIX-01**: Invoice creation no longer errors on generated column tax_amount (exclude from INSERT payload)

### iOS Native UX

- [ ] **UX-01**: All screens respect safe areas (notch, Dynamic Island, home indicator)
- [ ] **UX-02**: All form screens have proper keyboard avoidance (fields not obscured by keyboard)
- [ ] **UX-03**: Haptic feedback on save, delete, and error actions
- [ ] **UX-04**: Privacy screen blurs app content in iOS app switcher
- [x] **UX-05**: Native scroll physics on all scrollable views
- [ ] **UX-06**: Empty states with call-to-action on all list screens
- [x] **UX-07**: Portrait-only orientation lock

### Localization & Theming

- [ ] **I18N-01**: App supports English and Arabic languages
- [ ] **I18N-02**: Arabic mode flips layout to RTL (with app restart prompt on switch)
- [ ] **I18N-03**: Multi-currency support with live exchange rates
- [ ] **I18N-04**: Locale-aware number formatting (decimal separator, grouping per currency/locale)
- [ ] **THEME-01**: Dark/light theme synced with iOS system setting
- [ ] **THEME-02**: User can manually override theme in Settings

### App Store

- [ ] **STORE-01**: User can delete their account from within the app (Apple requirement)
- [ ] **STORE-02**: Privacy policy accessible from app
- [ ] **STORE-03**: App submitted to App Store via EAS Build + Submit
- [ ] **STORE-04**: App passes TestFlight testing on physical device

## Future Requirements

Deferred to v2.x milestones. Not in current roadmap.

### iOS Native Features

- **BIO-01**: User can unlock app with Face ID / Touch ID
- **PUSH-01**: User receives push notifications for overdue invoices
- **WIDGET-01**: Home screen widget shows balance summary
- **QUICK-01**: Quick-add transaction via bottom sheet FAB

### Platform Expansion

- **DROID-01**: Android version of the app

### UX Polish

- **OPT-01**: Optimistic UI updates on transaction add/edit
- **SKEL-01**: Skeleton loading states with content shape hints

## Out of Scope

| Feature | Reason |
|---------|--------|
| Push notifications | Requires APNs infrastructure — separate milestone |
| Biometric auth (Face ID / Touch ID) | Requires expo-local-authentication + keychain — separate milestone |
| Home screen widgets | Requires native Swift WidgetKit extension — separate milestone |
| Android support | iOS first — Android is a separate milestone |
| Offline write-then-sync | Conflict resolution on financial data is dangerous — block writes when offline |
| In-app PDF viewer | Share sheet handles viewing — no need for custom viewer |
| Real-time collaboration | Single-user app per RLS design |
| AI spending insights | Requires inference backend — future consideration |
| iPad split-view layout | iPhone first — iPad gets iPhone layout for v2.0 |
| Apple Pay / payment processing | App tracks money, doesn't move it |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 7 | Complete |
| FOUND-02 | Phase 7 | Pending |
| FOUND-03 | Phase 7 | Complete |
| FOUND-04 | Phase 8 | Pending |
| AUTH-01 | Phase 8 | Pending |
| AUTH-02 | Phase 8 | Pending |
| AUTH-03 | Phase 8 | Pending |
| AUTH-04 | Phase 8 | Pending |
| AUTH-05 | Phase 8 | Pending |
| TXN-01 | Phase 9 | Pending |
| TXN-02 | Phase 9 | Pending |
| TXN-03 | Phase 9 | Pending |
| TXN-04 | Phase 9 | Pending |
| TXN-05 | Phase 9 | Pending |
| TXN-06 | Phase 9 | Pending |
| TXN-07 | Phase 9 | Pending |
| TXN-08 | Phase 9 | Pending |
| DEBT-01 | Phase 9 | Pending |
| DEBT-02 | Phase 9 | Pending |
| DEBT-03 | Phase 9 | Pending |
| DEBT-04 | Phase 9 | Pending |
| ASST-01 | Phase 9 | Pending |
| ASST-02 | Phase 9 | Pending |
| ASST-03 | Phase 9 | Pending |
| ASST-04 | Phase 9 | Pending |
| DASH-01 | Phase 10 | Pending |
| DASH-02 | Phase 10 | Pending |
| DASH-03 | Phase 10 | Pending |
| EXPRT-01 | Phase 10 | Pending |
| EXPRT-02 | Phase 11 | Pending |
| ADV-01 | Phase 11 | Pending |
| ADV-02 | Phase 11 | Pending |
| ADV-03 | Phase 11 | Pending |
| ADV-04 | Phase 11 | Pending |
| ADV-05 | Phase 11 | Pending |
| ADV-06 | Phase 11 | Pending |
| FIX-01 | Phase 11 | Pending |
| UX-01 | Phase 7 | Pending |
| UX-02 | Phase 7 | Pending |
| UX-03 | Phase 7 | Pending |
| UX-04 | Phase 7 | Pending |
| UX-05 | Phase 7 | Complete |
| UX-06 | Phase 7 | Pending |
| UX-07 | Phase 7 | Complete |
| I18N-01 | Phase 7 | Pending |
| I18N-02 | Phase 7 | Pending |
| I18N-03 | Phase 7 | Pending |
| I18N-04 | Phase 7 | Pending |
| THEME-01 | Phase 7 | Pending |
| THEME-02 | Phase 7 | Pending |
| STORE-01 | Phase 12 | Pending |
| STORE-02 | Phase 12 | Pending |
| STORE-03 | Phase 12 | Pending |
| STORE-04 | Phase 12 | Pending |

**Coverage:**
- v2.0 requirements: 54 total
- Mapped to phases: 54
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation (Phases 7–12)*
