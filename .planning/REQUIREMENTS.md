# Requirements: Balance Tracker v2.0 — iOS Native App

**Defined:** 2026-02-26
**Core Value:** Anyone can track their money simply — and freelancers can manage their business without switching apps.

## v2.0 Requirements

Requirements for iOS native app release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: Expo SDK 52 project scaffolded with React Native 0.76, NativeWind v4, and Expo Router v3
- [x] **FOUND-02**: Supabase client configured with expo-secure-store session adapter, URL polyfill, and ws/stream Metro aliases
- [x] **FOUND-03**: Portable layer copied from web (hooks, types, lib functions, query keys) with import paths adjusted
- [ ] **FOUND-04**: Tab bar navigation with 5 sections (Dashboard, Transactions, Debts, Assets, More) using SF Symbols icons

### Authentication

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User can log in and stay logged in across app restarts (session persisted via expo-secure-store)
- [ ] **AUTH-03**: User can log out from Settings
- [x] **AUTH-04**: User can reset password via email link
- [ ] **AUTH-05**: Unauthenticated users are redirected to login screen

### Transactions

- [x] **TXN-01**: User can add income entry with amount, description, category, date, and currency
- [x] **TXN-02**: User can add expense entry with amount, description, category, date, and currency
- [x] **TXN-03**: User can edit income and expense entries
- [x] **TXN-04**: User can delete income and expense entries via swipe-to-delete
- [x] **TXN-05**: User can pull-to-refresh transaction lists
- [x] **TXN-06**: User can change income status inline via dropdown/toggle without opening edit form
- [x] **TXN-07**: User can change expense status inline via dropdown/toggle without opening edit form
- [x] **TXN-08**: Income categories include "debt" as an option

### Debts

- [x] **DEBT-01**: User can add, edit, and delete debts with payment tracking
- [x] **DEBT-02**: User can view debt payment history
- [x] **DEBT-03**: User can swipe-to-delete debts from list
- [x] **DEBT-04**: User can pull-to-refresh debt list

### Assets

- [x] **ASST-01**: User can add, edit, and delete assets
- [x] **ASST-02**: Asset prices auto-update via exchange rates / metal prices
- [x] **ASST-03**: User can swipe-to-delete assets from list
- [x] **ASST-04**: User can pull-to-refresh asset list

### Dashboard

- [x] **DASH-01**: Dashboard shows net worth and financial overview with charts (Victory Native)
- [x] **DASH-02**: Dashboard financial cards are clickable and navigate to their respective sections
- [x] **DASH-03**: Charts respond to taps with callout (replacing web hover tooltips)

### Export

- [x] **EXPRT-01**: User can export financial data as CSV via iOS share sheet
- [x] **EXPRT-02**: User can export invoices as PDF via expo-print + iOS share sheet

### Advanced Mode

- [x] **ADV-01**: User can toggle between Simple and Advanced mode
- [x] **ADV-02**: User can create and manage clients (name, contact info) with native list + detail views
- [x] **ADV-03**: User can create invoices linked to a client with line items
- [x] **ADV-04**: User can manage invoice status (Draft → Sent → Paid) — inline status change without opening edit
- [x] **ADV-05**: User can link transactions to clients (optional, on creation or edit)
- [x] **ADV-06**: Advanced dashboard shows revenue per client and outstanding invoices

### Bug Fixes

- [x] **FIX-01**: Invoice creation no longer errors on generated column tax_amount (exclude from INSERT payload)

### iOS Native UX

- [x] **UX-01**: All screens respect safe areas (notch, Dynamic Island, home indicator)
- [x] **UX-02**: All form screens have proper keyboard avoidance (fields not obscured by keyboard)
- [x] **UX-03**: Haptic feedback on save, delete, and error actions
- [x] **UX-04**: Privacy screen blurs app content in iOS app switcher
- [x] **UX-05**: Native scroll physics on all scrollable views
- [x] **UX-06**: Empty states with call-to-action on all list screens
- [x] **UX-07**: Portrait-only orientation lock

### Localization & Theming

- [x] **I18N-01**: App supports English and Arabic languages
- [x] **I18N-02**: Arabic mode flips layout to RTL (with app restart prompt on switch)
- [x] **I18N-03**: Multi-currency support with live exchange rates
- [x] **I18N-04**: Locale-aware number formatting (decimal separator, grouping per currency/locale)
- [x] **THEME-01**: Dark/light theme synced with iOS system setting
- [x] **THEME-02**: User can manually override theme in Settings

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

### Apple HIG Polish (Phase 13)

- **POLISH-01**: Dashboard uses Apple HIG card design — elevated cards with subtle shadows, rounded corners, clear visual hierarchy, and proper section spacing
- **POLISH-02**: List screens (Transactions, Debts, Assets) use iOS-native grouped section styling with proper row heights, separators, and tappable row feedback
- **POLISH-03**: Form add/edit sheets use consistent iOS input field styling (rounded rect, proper padding, clear labels, prominent primary action button)
- **POLISH-04**: Typography and spacing follow Apple HIG throughout — SF Pro scale (title, headline, body, caption), 16pt base padding, 44pt minimum touch targets
- **POLISH-05**: Empty states and loading indicators are visually polished — SF Symbol icons, descriptive copy, and consistent placement across all screens

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
| FOUND-02 | Phase 7 | Complete |
| FOUND-03 | Phase 7 | Complete |
| FOUND-04 | Phase 8 | Pending |
| AUTH-01 | Phase 8 | Complete |
| AUTH-02 | Phase 8 | Complete |
| AUTH-03 | Phase 8 | Pending |
| AUTH-04 | Phase 8 | Complete |
| AUTH-05 | Phase 8 | Pending |
| TXN-01 | Phase 9 | Complete |
| TXN-02 | Phase 9 | Complete |
| TXN-03 | Phase 9 | Complete |
| TXN-04 | Phase 9 | Complete |
| TXN-05 | Phase 9 | Complete |
| TXN-06 | Phase 9 | Complete |
| TXN-07 | Phase 9 | Complete |
| TXN-08 | Phase 9 | Complete |
| DEBT-01 | Phase 9 | Complete |
| DEBT-02 | Phase 9 | Complete |
| DEBT-03 | Phase 9 | Complete |
| DEBT-04 | Phase 9 | Complete |
| ASST-01 | Phase 9 | Complete |
| ASST-02 | Phase 9 | Complete |
| ASST-03 | Phase 9 | Complete |
| ASST-04 | Phase 9 | Complete |
| DASH-01 | Phase 10 | Complete |
| DASH-02 | Phase 10 | Complete |
| DASH-03 | Phase 10 | Complete |
| EXPRT-01 | Phase 10 | Complete |
| EXPRT-02 | Phase 11 | Complete |
| ADV-01 | Phase 11 | Complete |
| ADV-02 | Phase 11 | Complete |
| ADV-03 | Phase 11 | Complete |
| ADV-04 | Phase 11 | Complete |
| ADV-05 | Phase 11 | Complete |
| ADV-06 | Phase 11 | Complete |
| FIX-01 | Phase 11 | Complete |
| UX-01 | Phase 7 | Complete |
| UX-02 | Phase 7 | Complete |
| UX-03 | Phase 7 | Complete |
| UX-04 | Phase 7 | Complete |
| UX-05 | Phase 7 | Complete |
| UX-06 | Phase 7 | Complete |
| UX-07 | Phase 7 | Complete |
| I18N-01 | Phase 7 | Complete |
| I18N-02 | Phase 7 | Complete |
| I18N-03 | Phase 7 | Complete |
| I18N-04 | Phase 7 | Complete |
| THEME-01 | Phase 7 | Complete |
| THEME-02 | Phase 7 | Complete |
| STORE-01 | Phase 12 | Pending |
| STORE-02 | Phase 12 | Pending |
| STORE-03 | Phase 12 | Pending |
| STORE-04 | Phase 12 | Pending |
| POLISH-01 | Phase 13 | Complete |
| POLISH-02 | Phase 13 | Pending |
| POLISH-03 | Phase 13 | Complete |
| POLISH-04 | Phase 13 | Complete |
| POLISH-05 | Phase 13 | Complete |

**Coverage:**
- v2.0 requirements: 59 total
- Mapped to phases: 59
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation (Phases 7–12)*
