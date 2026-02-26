# Roadmap: Balance Tracker

## Milestones

- ✅ **v1.0 Advanced Mode MVP** — Phases 1–5 (shipped 2026-02-25)
- ✅ **v1.1 Advanced Dashboard** — Phase 6 (shipped 2026-02-25)
- 📋 **v2.0 iOS Native App** — Phases 7–12 (planned)

## Phases

<details>
<summary>✅ v1.0 Advanced Mode MVP (Phases 1–5) — SHIPPED 2026-02-25</summary>

- [x] **Phase 1: Database & Type Foundation** — 3/3 plans — completed 2026-02-23
- [x] **Phase 2: Mode Infrastructure** — 4/4 plans — completed 2026-02-24
- [x] **Phase 3: Client Management** — 3/3 plans — completed 2026-02-24
- [x] **Phase 4: Transaction-Client Linking** — 4/4 plans — completed 2026-02-25
- [x] **Phase 5: Invoices & PDF Export** — 7/7 plans — completed 2026-02-25

Full phase details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Advanced Dashboard (Phase 6) — SHIPPED 2026-02-25</summary>

- [x] **Phase 6: Advanced Dashboard** — Revenue per client widget, outstanding invoices panel — completed 2026-02-25

### Phase 6: Advanced Dashboard
**Goal**: Users in Advanced mode have a dedicated dashboard at /advanced showing revenue per client and outstanding invoices — giving a complete financial picture of their freelance business at a glance
**Depends on**: Phase 5
**Requirements**: DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. The Advanced Dashboard at /advanced shows each client with the total amount received from paid invoices — the totals reflect the user's selected currency
  2. The Advanced Dashboard shows an outstanding invoices panel listing every Sent and Overdue invoice with the amount owed, and a total outstanding amount
  3. The existing Dashboard.tsx at /dashboard is not modified — Simple mode users see the identical dashboard they always had
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Add i18n keys + implement AdvancedDashboard with Revenue per Client and Outstanding Invoices widgets
- [x] 06-02-PLAN.md — Human verification of Advanced Dashboard end-to-end in browser

</details>

---

### 📋 v2.0 iOS Native App (Phases 7–12)

**Milestone Goal:** Port the full Balance Tracker experience to iOS as a native React Native app with Apple HIG design, reusing the existing Supabase backend. App Store distribution via Expo EAS.

- [ ] **Phase 7: Project Scaffold + Foundation** - Expo SDK 52 project with Supabase client, polyfills, ported logic layer, i18n, theming, and all native UX patterns established
- [ ] **Phase 8: Auth Shell + Navigation** - Sign-in/sign-up screens, session persistence, auth guard, bottom tab navigation, and context providers
- [ ] **Phase 9: Simple Mode Screens** - Full CRUD for income, expense, debts, and assets with native iOS interactions (swipe-to-delete, pull-to-refresh, inline status toggles)
- [ ] **Phase 10: Dashboard + CSV Export** - Net worth dashboard with Victory Native charts, tap-to-callout interaction, and CSV export via iOS share sheet
- [ ] **Phase 11: Advanced Mode + PDF Export** - Clients, invoicing, invoice lifecycle, expo-print PDF generation, and transaction-client linking
- [ ] **Phase 12: App Store Compliance + Submission** - Account deletion, privacy policy, TestFlight, EAS Submit, and App Store approval

## Phase Details

### Phase 7: Project Scaffold + Foundation
**Goal**: A working Expo SDK 52 project that compiles, connects to Supabase, persists sessions across restarts, and has all native UX patterns (safe areas, keyboard avoidance, haptics, RTL, theming) established as architectural decisions before any feature screen is built
**Depends on**: Nothing (first phase of v2.0)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, I18N-01, I18N-02, I18N-03, I18N-04, THEME-01, THEME-02
**Success Criteria** (what must be TRUE):
  1. The app launches on a physical iOS device via Expo Go / dev build, connects to Supabase, and a test sign-in persists across app restarts (session survives force-quit)
  2. The app renders correctly in both light and dark mode — switching iOS system appearance changes the app theme without a restart
  3. The app renders correctly in both English and Arabic — Arabic mode activates RTL layout and a "restart required" prompt appears when the language is changed
  4. All screens respect the safe area (notch, Dynamic Island, home indicator) — no content is clipped on iPhone 14 Pro or newer
  5. When the app is backgrounded, the iOS app switcher shows a blurred privacy overlay instead of the last screen content
**Plans**: TBD

Plans:
- [ ] 07-01: Expo project init, Metro config, polyfills, Supabase RN client, React Query AppState/NetInfo wiring
- [ ] 07-02: Portable layer copy (hooks, types, lib, i18n strings) with import path adjustments
- [ ] 07-03: ThemeContext (NativeWind + Appearance API), i18n init with RTL startup, locale-aware formatting, privacy screen

### Phase 8: Auth Shell + Navigation
**Goal**: Users can sign up, log in, and stay logged in — and all five tab sections are navigable with an authenticated shell in place, unblocking every feature screen in Phases 9–11
**Depends on**: Phase 7
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, FOUND-04
**Success Criteria** (what must be TRUE):
  1. A new user can create an account with email and password and land on the main tab bar
  2. A returning user who force-quits and reopens the app is taken directly to the home tab — no re-login required
  3. An unauthenticated user who opens the app is taken to the login screen — no tab bar content is accessible
  4. A user can log out from the Settings tab and is returned to the login screen
  5. A user can initiate a password reset from the login screen and receive an email link
**Plans**: TBD

Plans:
- [ ] 08-01: Auth screens (sign-in, sign-up, forgot password), AuthContext with AppState token refresh
- [ ] 08-02: Root layout with Stack.Protected auth guard, bottom tab bar (5 tabs, SF Symbols), stub screens per tab

### Phase 9: Simple Mode Screens
**Goal**: Users can add, edit, delete, and browse all income, expense, debt, and asset entries on iOS with native interactions — the core financial tracking value proposition is fully functional
**Depends on**: Phase 8
**Requirements**: TXN-01, TXN-02, TXN-03, TXN-04, TXN-05, TXN-06, TXN-07, TXN-08, DEBT-01, DEBT-02, DEBT-03, DEBT-04, ASST-01, ASST-02, ASST-03, ASST-04
**Success Criteria** (what must be TRUE):
  1. User can add an income entry with amount, description, category (including "debt"), date, and currency — it appears immediately in the list
  2. User can add an expense entry with the same fields — it appears immediately in the list
  3. User can swipe left on any income, expense, debt, or asset row to reveal and confirm a delete action
  4. User can pull down on any list to refresh it and see updated data
  5. User can change the status of an income or expense entry inline via a tap-toggle without opening the full edit form
**Plans**: TBD

Plans:
- [ ] 09-01: Transactions screen — Income list with FlatList, add/edit form (bottom sheet), swipe-to-delete, pull-to-refresh, inline status toggle
- [ ] 09-02: Transactions screen — Expense list with same native patterns, inline status toggle
- [ ] 09-03: Debts screen — Debt list with payment tracking, debt history view, swipe-to-delete, pull-to-refresh
- [ ] 09-04: Assets screen — Asset list with price auto-update, swipe-to-delete, pull-to-refresh

### Phase 10: Dashboard + CSV Export
**Goal**: Users can see their financial overview at a glance with native charts and navigate directly to any tracked category — and can export their data to CSV and share it via the iOS share sheet
**Depends on**: Phase 9
**Requirements**: DASH-01, DASH-02, DASH-03, EXPRT-01
**Success Criteria** (what must be TRUE):
  1. The Dashboard tab shows a net worth card and at least one chart (income vs. expenses over time) rendered with Victory Native — data is correct against the Supabase backend
  2. Tapping a chart data point shows a callout with the exact value — no hover interaction is required
  3. Tapping a financial summary card (e.g., total income) navigates to the corresponding list screen
  4. User can tap "Export CSV" in Settings and receive an iOS share sheet to save or send the CSV file
**Plans**: TBD

Plans:
- [ ] 10-01: Dashboard screen — Victory Native charts, net worth card, navigable financial cards, tap callouts
- [ ] 10-02: CSV export via expo-sharing share sheet

### Phase 11: Advanced Mode + PDF Export
**Goal**: Users in Advanced mode can manage clients and invoices on iOS, export professional PDF invoices, link transactions to clients, and see advanced dashboard widgets — with the tax_amount bug fixed
**Depends on**: Phase 10
**Requirements**: ADV-01, ADV-02, ADV-03, ADV-04, ADV-05, ADV-06, FIX-01, EXPRT-02
**Success Criteria** (what must be TRUE):
  1. User can toggle Advanced mode on and see a Clients tab and enhanced invoice sections appear — toggling off hides them
  2. User can create a client, create an invoice linked to that client with multiple line items, and advance the invoice through Draft → Sent → Paid status with a single inline tap (no edit form required for status change)
  3. User can export an invoice as a PDF and share it via the iOS share sheet — the PDF is readable and contains correct line item totals (no tax_amount column error)
  4. User can link an income or expense transaction to a client when creating or editing it
  5. The Advanced Dashboard shows revenue per client and outstanding invoices with correct totals
**Plans**: TBD

Plans:
- [ ] 11-01: Advanced mode toggle, ModeContext, conditional tab/navigation visibility
- [ ] 11-02: Clients screen — list, create, edit, client detail with linked transactions
- [ ] 11-03: Invoices screen — list, create with line items (useFieldArray), edit; FIX-01 (exclude tax_amount from INSERT)
- [ ] 11-04: Invoice detail — status lifecycle, inline status toggle, expo-print PDF generation + expo-sharing; Advanced Dashboard widgets
- [ ] 11-05: Transaction-client linking on income and expense forms (ADV-05)

### Phase 12: App Store Compliance + Submission
**Goal**: The app passes App Store review and is publicly available — all Apple-required flows are in place, the release build is verified on a physical device, and EAS Submit completes successfully
**Depends on**: Phase 11
**Requirements**: STORE-01, STORE-02, STORE-03, STORE-04
**Success Criteria** (what must be TRUE):
  1. User can delete their account from the Settings screen — the action removes all user data from Supabase and signs the user out
  2. A privacy policy is accessible from within the app and linked in App Store Connect
  3. The release build (not Expo Go, not dev build) launches without crashing on a physical iPhone running iOS 15.1 or later
  4. The app is live on the App Store and can be found and downloaded by any iOS user
**Plans**: TBD

Plans:
- [ ] 12-01: Account deletion flow (Supabase RPC for atomic data + auth delete), privacy policy screen, app icon + splash screen
- [ ] 12-02: EAS Build production profile, TestFlight upload, physical device verification
- [ ] 12-03: App Store metadata (screenshots, description, privacy policy URL), EAS Submit

## Progress

**Execution Order:**
Phases execute in numeric order: 7 → 8 → 9 → 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database & Type Foundation | v1.0 | 3/3 | Complete | 2026-02-23 |
| 2. Mode Infrastructure | v1.0 | 4/4 | Complete | 2026-02-24 |
| 3. Client Management | v1.0 | 3/3 | Complete | 2026-02-24 |
| 4. Transaction-Client Linking | v1.0 | 4/4 | Complete | 2026-02-25 |
| 5. Invoices & PDF Export | v1.0 | 7/7 | Complete | 2026-02-25 |
| 6. Advanced Dashboard | v1.1 | 2/2 | Complete | 2026-02-25 |
| 7. Project Scaffold + Foundation | v2.0 | 0/3 | Not started | - |
| 8. Auth Shell + Navigation | v2.0 | 0/2 | Not started | - |
| 9. Simple Mode Screens | v2.0 | 0/4 | Not started | - |
| 10. Dashboard + CSV Export | v2.0 | 0/2 | Not started | - |
| 11. Advanced Mode + PDF Export | v2.0 | 0/5 | Not started | - |
| 12. App Store Compliance + Submission | v2.0 | 0/3 | Not started | - |
