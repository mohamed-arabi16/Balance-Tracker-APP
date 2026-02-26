# Feature Research — iOS Native Port (v2.0)

**Domain:** Personal finance tracking app — React Native iOS port of existing web PWA
**Researched:** 2026-02-26
**Confidence:** MEDIUM-HIGH (iOS patterns verified via Apple HIG + multiple sources; React Native specifics via Expo docs + community)

---

## Context

This document replaces the previous web-era FEATURES.md (which covered Advanced Mode v1.1).
The v2.0 milestone is a full feature port to iOS via React Native (Expo). The backend is unchanged
(same Supabase project, same DB schema, same RLS). The task is: rebuild the entire UI natively,
adopting iOS-native patterns throughout.

All Simple + Advanced mode features already exist on the web. The research question is:
**what iOS-native adaptations are required, what UX patterns apply, and what is differentiating
on mobile vs table stakes?**

---

## Table Stakes

Features iOS finance app users assume exist. Missing any of these = users leave or leave a 1-star
review.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Tab bar navigation | iOS standard for 4-6 top-level sections; every iOS app uses it | LOW | 5 tabs: Dashboard, Transactions, Debts, Assets, More/Settings. Apple HIG: max 5 visible tabs, 49pt height, SF Symbols icons |
| Safe area handling | iPhone notch, Dynamic Island, home indicator — content must not be obscured | LOW | `react-native-safe-area-context` is built into Expo default template; must wrap all screens |
| Dark mode system sync | iOS users expect dark mode to follow system setting automatically | LOW | React Native's `Appearance` API + `useColorScheme()` hook. Must also respect the app's manual override (existing web preference) |
| Native keyboard avoidance | Forms with number inputs must slide up so keyboard doesn't block the field | MEDIUM | `KeyboardAvoidingView` has iOS-specific bugs; use `react-native-keyboard-controller` as drop-in replacement. Critical for transaction entry and invoice forms |
| Swipe-to-delete on lists | iOS convention: left-swipe reveals a red Delete action on list rows | MEDIUM | Applies to transactions, debts, assets, clients. Use React Native's `Swipeable` (from `react-native-gesture-handler`) or a FlatList with swipe config. NOT a nice-to-have — iOS users try this immediately |
| Pull-to-refresh | iOS convention for refreshing data lists | LOW | `RefreshControl` component, built into RN. Apply to: transactions list, debts, assets, invoice list |
| Native loading states | Skeleton screens for first load; spinner for background refresh | LOW | Skeleton on initial mount (not on pull-to-refresh, which would cause flicker). Use `react-native-skeleton-placeholder` or build with Animated API |
| Empty states with call to action | Every list that can be empty needs a human message + primary action button | LOW | Critical for first-run: "No transactions yet — Add your first one" with a CTA. Exists on web; must port to native layouts |
| Share sheet for export (CSV + PDF) | iOS users expect to send files via the native share sheet (AirDrop, email, Files, etc.) | MEDIUM | Use `expo-sharing` (wraps UIActivityViewController). Works for both CSV and PDF files. Replace web's download link pattern entirely |
| Haptic feedback on destructive actions | iOS users expect tactile confirmation for delete, save, and error states | LOW | `expo-haptics`: `notificationAsync('success')` on save, `notificationAsync('error')` on failure, `impactAsync('medium')` on delete. Use sparingly |
| Native scroll physics | Lists must use iOS-native momentum scrolling, rubber-band overscroll | LOW | React Native's `ScrollView`/`FlatList` use native scroll by default — do not override with JS scroll implementations |
| Portrait-only orientation lock | Finance apps with dense data tables break in landscape | LOW | Lock to portrait in Expo config (`orientation: "portrait"`). Avoids complex responsive layout work for v2.0 |
| Privacy screen on app switcher | Financial data must not appear in the iOS app switcher screenshot | MEDIUM | Use `react-native-privacy-snapshot` or toggle a blur overlay on `AppState` change to `background`. This is a known expectation for finance apps |
| Locale-aware number formatting | iOS users expect amounts formatted per device locale (decimal separator, grouping) | MEDIUM | Use `Intl.NumberFormat` with the user's selected currency. Do NOT hardcode period as decimal — Arabic and European users use comma. This is already done on web; must port correctly to RN |
| RTL layout support for Arabic | Arabic is an existing supported language; iOS must flip layout direction | HIGH | `I18nManager.forceRTL()` requires app restart — plan for this upfront. Not all third-party components respect the RTL flag; custom icons (chevrons, back arrows) need manual mirroring. Test on physical device — simulator has RTL edge cases |

---

## Differentiators

Features that set this iOS app apart from a straight port or a generic finance tracker. Not expected
by default, but meaningfully raise the product above competitors if included.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Quick-add transaction from anywhere | Finance apps that make adding a transaction painful lose the habit loop. A persistent FAB (floating action button) or a "+" in the tab bar triggers a bottom sheet entry without navigating away | MEDIUM | Bottom sheet with amount input, category picker, date. On web this is a dialog; on iOS this is a bottom sheet (modal half-screen). `@gorhom/bottom-sheet` is the standard library. The number pad should appear immediately (autofocus) |
| Persistent cross-session data continuity | Same Supabase backend means users open the iOS app and see their existing web data immediately — no migration, no setup | LOW | This is a differentiator vs apps that require re-entry of data. Must be communicated clearly on first launch: "Your Balance Tracker data is here." |
| Optimistic UI updates | Tapping "Add" should reflect in the list immediately, before the server responds. iOS users expect sub-100ms list updates | MEDIUM | React Query's `optimisticUpdate` pattern. On failure, roll back with a toast error. Supabase's realtime could supplement but is not required for v2.0 |
| Haptic-powered transaction confirmation | When a transaction is saved, a `notificationSuccess` haptic fires. This turns a mundane form submit into a satisfying moment — apps like Copilot are noted for this specifically | LOW | Requires `expo-haptics`. One line of code per success handler — high ROI |
| Native PDF share via iOS share sheet | Invoice PDF is generated on-device and shared via the native iOS share sheet (AirDrop, email, Files app, Telegram, etc.) without any server involvement | MEDIUM | `expo-print` + `expo-sharing`. Replace `@react-pdf/renderer` (web-only) with `expo-print`'s HTML-to-PDF approach. IMPORTANT: local image assets (logos) must be base64-encoded due to WKWebView limitation on iOS |
| Bilingual EN/AR with in-app switch | RTL finance apps are rare. Arabic speakers are underserved. The existing EN/AR support is a genuine differentiator on the App Store | HIGH | RTL requires app restart per `I18nManager` — design a "language changed, restart to apply" prompt. All third-party components must be audited for RTL breakage |
| Advanced mode: freelancer toolkit on mobile | Clients, invoices, and PDF export on mobile is genuinely unusual. Most freelance invoice apps are web-only | MEDIUM | Port the full Advanced mode. On mobile, invoicing gets a dedicated tab or section under "More" |
| Skeleton loading with content shape hints | Shows the structure of what's loading (net worth card shape, transaction list shape) rather than a generic spinner | LOW | Higher perceived performance. Standard in polished iOS finance apps (Robinhood, Copilot use this pattern) |

---

## Anti-Features

Features to deliberately NOT build in this milestone. Documenting prevents scope creep and re-litigation.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Push notifications | Deferred per PROJECT.md. Requires Apple Push Notification Service (APNs) entitlement, notification permission prompt UX, background fetch logic, and server-side trigger infrastructure — a separate milestone's worth of work | Deferred to v2.x milestone |
| Face ID / Touch ID biometric login | Deferred per PROJECT.md. Requires `expo-local-authentication`, keychain storage of the session token, and fallback flows for enrollment, lockout, and device transfer scenarios | Deferred to v2.x milestone |
| Home screen widgets | Requires WidgetKit extension (Swift), not achievable in React Native/Expo managed workflow without an Expo config plugin and a native module. Entirely separate codebase from the RN app | Deferred to v2.x milestone |
| Android support | iOS first per PROJECT.md. Supporting Android alongside iOS doubles QA effort and introduces platform-specific layout bugs (bottom sheet behavior, RTL, keyboard avoidance differ significantly between platforms) | Android is a separate milestone |
| Offline-first with sync conflict resolution | Full offline-first is architecturally complex for a finance app (conflict resolution on financial data is legally and logically dangerous — which version of a debt payment is "true"?). Current web app has PWA offline support; mobile should handle poor connectivity gracefully but not implement offline write-then-sync | Use React Query's cache for offline read access; show a connectivity banner when offline; block writes with a clear error message |
| In-app PDF viewer | Users want to SEND the PDF, not view it in-app. An in-app PDF viewer adds complexity (library, gestures, zoom) with little value if the share sheet opens the PDF in Files/Mail/Preview natively | Share immediately via expo-sharing; the OS handles viewing |
| Real-time collaborative editing | All data is single-user per PROJECT.md RLS design. WebSocket real-time sync (Supabase Realtime) adds complexity for no user-visible benefit in a personal finance context | React Query polling on focus is sufficient |
| AI spending insights / categorization | Trendy but requires an inference backend, meaningful transaction history, and careful UX to avoid surfacing wrong or intrusive "insights". Not in scope for a port milestone | Future consideration after user base is established on mobile |
| Apple Pay / payment processing | This app tracks money; it does not move money. No payment rails needed | CSV/PDF export is the output surface |
| iPad-optimized split-view layout | The port targets iPhone first. iPad layout requires split-view navigation (UISplitViewController pattern), multi-column layouts, and separate design work | Lock to compact size class for v2.0; iPad can open the app but gets the iPhone layout |

---

## iOS-Specific UX Adaptations Needed for Existing Web Features

This section maps each existing web feature to its required iOS native adaptation. These are not
optional polish items — they are what makes the port feel native rather than a web view wrapper.

### Navigation

| Web Pattern | iOS Adaptation | Notes |
|-------------|---------------|-------|
| Sidebar / top nav links | Tab bar with 5 sections | Dashboard, Transactions (income+expense combined or split), Debts, Assets, Settings/More |
| Page routing (React Router) | Stack navigator per tab (React Navigation) | Each tab has its own navigation stack. Modal sheets for create/edit |
| Dialog modals (Shadcn Dialog) | Bottom sheets or full-screen modal stacks | Simple forms → bottom sheet (`@gorhom/bottom-sheet`). Complex forms (invoice) → full-screen modal pushed on stack |
| Breadcrumbs / back button in header | Native back chevron in NavigationBar | React Navigation provides this automatically; respect iOS back-swipe gesture |

### Transaction Entry (Income / Expense)

| Web Pattern | iOS Adaptation | Notes |
|-------------|---------------|-------|
| Form in a dialog with all fields visible | Bottom sheet with scrollable form; keyboard avoidance essential | Amount field first, autofocused, numeric keyboard type |
| HTML `<input type="number">` | `keyboardType="decimal-pad"` on TextInput | Do NOT use `type="number"` — React Native ignores it. Explicitly set keyboard type per field |
| Dropdown/select for category | Native Picker component or ActionSheet | `@react-native-picker/picker` for inline; ActionSheet for bottom of screen |
| Date input | `DateTimePicker` from `@react-native-community/datetimepicker` | iOS uses a spinner/calendar native date picker, not an HTML date input |
| Form submit button at bottom of dialog | Primary button docked above keyboard | Use `KeyboardAvoidingView` so button stays visible when keyboard is up |

### Dashboard / Charts

| Web Pattern | iOS Adaptation | Notes |
|-------------|---------------|-------|
| Recharts (SVG, web-only) | Victory Native or React Native Gifted Charts | Recharts does not work in React Native. Victory Native (Skia-backed) is the recommended replacement. Budget similar API surface |
| Fixed-width chart containers | Charts must respect device width with `useWindowDimensions()` | No fixed pixel widths — use `width: Dimensions.get('window').width - 32` pattern |
| Hover tooltips on charts | Tap-to-highlight with a callout | No hover on mobile. Tap events with animated callout showing the tapped data point |

### CSV Export

| Web Pattern | iOS Adaptation | Notes |
|-------------|---------------|-------|
| Browser `<a href download>` | Write file to cache dir + `expo-sharing` share sheet | `FileSystem.writeAsStringAsync()` then `Sharing.shareAsync()`. The OS presents the share sheet — user picks email, AirDrop, Files, etc. |

### PDF Export (Invoice)

| Web Pattern | iOS Adaptation | Notes |
|-------------|---------------|-------|
| `@react-pdf/renderer` (React component → PDF) | `expo-print` with HTML template | `expo-print`'s `printToFileAsync()` renders HTML+CSS to PDF. Replace React PDF components with an HTML template string. CRITICAL: logo images must be base64-encoded (WKWebView cannot load local file:// URIs) |
| Lazy dynamic import | Same pattern applies | `expo-print` should still be imported only when invoked — it's heavy |
| Download link | `expo-sharing` share sheet | Same as CSV; user shares to email/AirDrop/Files |

### Multi-currency with Live Rates

| Web Pattern | iOS Adaptation | Notes |
|-------------|---------------|-------|
| Fetch on mount, cached in React Query | Same — works unchanged | No platform-specific changes needed |
| `Intl.NumberFormat` for display | Same — Hermes engine (Expo default) supports `Intl` since SDK 48 | Verify `Intl` is enabled in Expo config if targeting SDK < 50. As of Expo SDK 52+ this is default |

### RTL / Arabic Language

| Web Pattern | iOS Adaptation | Notes |
|-------------|---------------|-------|
| CSS `dir="rtl"` + `text-align: right` | `I18nManager.forceRTL(true)` + app restart | RTL in React Native is layout-level (Flexbox mirrors), not CSS. Requires `I18nManager.forceRTL()` before app renders — trigger only on language change, which requires an app restart prompt |
| Language stored in `user_settings` | Same Supabase column — read on app launch | Apply `I18nManager.forceRTL()` based on stored preference before first render |
| Custom icons (chevrons, arrows) | Must be manually mirrored in RTL mode | Check `I18nManager.isRTL` and apply `scaleX: -1` transform to directional icons |
| Third-party components | Audit all libraries for RTL support | Many RN libraries do NOT respect the RTL flag. Test every screen in Arabic mode |

### Settings / Theme Toggle

| Web Pattern | iOS Adaptation | Notes |
|-------------|---------------|-------|
| Tailwind dark mode class toggling | React Native StyleSheet + context-based theme values | No Tailwind on native. Use a `ThemeContext` with light/dark value objects |
| System theme detection via media query | `useColorScheme()` from `react-native` | Returns `'light'` or `'dark'`. Combine with user override stored in preferences |

---

## Feature Dependencies

```
Tab bar navigation (React Navigation)
    └──required by──> All screens

Safe area context
    └──required by──> All screens (notch / home indicator avoidance)

Authentication (Supabase auth session)
    └──required by──> All data screens

Theme system (ThemeContext)
    └──required by──> All components

React Query data layer (hooks ported from web)
    └──required by──> Dashboard, Transactions, Debts, Assets, Clients, Invoices

Swipe-to-delete
    └──requires──> react-native-gesture-handler (already a React Navigation dependency)

Quick-add bottom sheet
    └──requires──> @gorhom/bottom-sheet
    └──enhances──> Transaction creation (faster entry path)

expo-print (PDF)
    └──requires──> expo-sharing (to share the generated file)
    └──requires──> base64 logo encoding (if logo feature included)

I18nManager RTL setup
    └──requires──> App restart mechanism (prompt + RCTReloadCommand)
    └──conflicts with──> In-session language switching (must restart; cannot switch live)

Chart library (Victory Native)
    └──conflicts with──> Recharts (web-only; cannot be used in React Native)
```

### Dependency Notes

- **Tab navigation requires safe area context:** React Navigation's tab bar and headers consume safe area insets by default. Do not add extra safe area padding on top — it will double-pad.
- **RTL conflicts with in-session switching:** `I18nManager.forceRTL()` requires an app reload to take effect. Design a "Restart to apply" flow — do not attempt live RTL toggling.
- **expo-print requires expo-sharing:** PDF generation alone does not help the user — they need to share it. These two ship together.
- **react-native-gesture-handler is a React Navigation peer dependency:** Installing React Navigation already pulls this in. Use it for swipe-to-delete — no extra install cost.

---

## MVP Definition (v2.0 Launch)

### Launch With (v2.0 App Store submission)

All of these must be present for the app to be submitted. They represent feature parity with the
web app plus mandatory iOS native adaptations.

- [ ] Tab bar navigation (Dashboard, Transactions, Debts, Assets, More) — iOS standard, non-negotiable
- [ ] Safe area + dark mode system sync — App Store review will flag missing safe area handling
- [ ] Auth (login, logout, session persistence) — existing Supabase auth, ported
- [ ] Full CRUD for income, expense, debt, asset — existing web logic, new native UI
- [ ] Dashboard with net worth and charts (Victory Native replacing Recharts)
- [ ] Swipe-to-delete on all list screens — iOS users will try this; missing it feels broken
- [ ] Pull-to-refresh on all list screens
- [ ] Keyboard avoidance on all form screens
- [ ] CSV export via iOS share sheet
- [ ] Multi-currency with live exchange rates
- [ ] EN/AR multilingual with RTL layout
- [ ] Dark/light theme (system-synced + manual override)
- [ ] Advanced mode: clients, invoices, invoice status, PDF export via share sheet, advanced dashboard
- [ ] Privacy screen on app switcher (blur overlay on background)
- [ ] Haptic feedback on save/delete/error
- [ ] Locale-aware number formatting

### Add After Launch (v2.x)

- [ ] Biometric authentication (Face ID / Touch ID) — high user request; deferred in PROJECT.md
- [ ] Push notifications for overdue invoices — requires APNs setup; deferred in PROJECT.md
- [ ] Home screen widgets — requires native Swift WidgetKit extension; deferred in PROJECT.md
- [ ] Quick-add transaction widget in notification center
- [ ] Android support — separate milestone per PROJECT.md

### Future Consideration (v3+)

- [ ] AI spending categorization / insights
- [ ] Offline write-then-sync with conflict resolution
- [ ] iPad split-view layout optimization
- [ ] Time tracking integration (hours → invoice line items)
- [ ] Recurring invoice templates with auto-scheduling

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Tab bar navigation | HIGH | LOW | P1 |
| Safe area handling | HIGH | LOW | P1 |
| Auth port | HIGH | LOW | P1 |
| Transaction CRUD (native UI) | HIGH | MEDIUM | P1 |
| Dashboard with charts (Victory Native) | HIGH | MEDIUM | P1 |
| Swipe-to-delete | HIGH | MEDIUM | P1 |
| Keyboard avoidance on forms | HIGH | MEDIUM | P1 |
| CSV share sheet export | HIGH | LOW | P1 |
| Multi-currency port | HIGH | LOW | P1 |
| RTL / Arabic port | HIGH | HIGH | P1 |
| Dark mode system sync | HIGH | LOW | P1 |
| Advanced mode: clients + invoices | HIGH | HIGH | P1 |
| PDF export via expo-print + share sheet | HIGH | MEDIUM | P1 |
| Privacy screen on app switcher | MEDIUM | LOW | P1 |
| Haptic feedback | MEDIUM | LOW | P1 |
| Pull-to-refresh | MEDIUM | LOW | P1 |
| Skeleton loading states | MEDIUM | LOW | P2 |
| Quick-add FAB / bottom sheet | MEDIUM | MEDIUM | P2 |
| Optimistic UI updates | MEDIUM | MEDIUM | P2 |
| Locale-aware number formatting | HIGH | MEDIUM | P1 |
| Biometric login | HIGH | HIGH | P3 (deferred) |
| Push notifications | HIGH | HIGH | P3 (deferred) |
| Home screen widgets | MEDIUM | HIGH | P3 (deferred) |

**Priority key:**
- P1: Must have for App Store submission
- P2: Should have; include if time allows in v2.0, otherwise v2.x
- P3: Future milestone; do not scope into v2.0

---

## Competitor Feature Analysis

| Feature | Copilot Money (iOS-only) | YNAB iOS | MoneyWiz iOS | Our Approach |
|---------|--------------------------|----------|--------------|--------------|
| Tab bar navigation | Yes — 5 tabs | Yes | Yes | Tab bar: 5 sections |
| Swipe to delete | Yes | Yes | Yes | react-native-gesture-handler Swipeable |
| Pull-to-refresh | Yes | Yes | Yes | RefreshControl on all lists |
| Quick-add | FAB with bottom sheet | "+" in tab bar center | Dedicated entry widget | FAB or "+" in nav bar |
| Haptics | Yes — noted as differentiator | Yes | Yes | expo-haptics on save/delete |
| Dark mode | System-synced + override | System-synced | System-synced + override | Same as web override, system-synced |
| Offline read | Yes (cached) | Yes (full offline) | Yes (full offline) | React Query cache for reads; block writes when offline |
| Charts | Native animated charts | Simple bar charts | Rich chart library | Victory Native (Skia-backed) |
| Biometric | Yes (table stakes for them) | Yes | Yes | Deferred to v2.x |
| PDF export | No (Copilot is bank-sync focused) | No | Yes | expo-print + share sheet |
| Invoicing | No | No | No | Unique differentiator on iOS |
| RTL / Arabic | No | No | No | Unique differentiator on App Store |

---

## Confidence Notes

| Area | Confidence | Source |
|------|------------|--------|
| iOS table stakes (tab bar, safe area, swipe-to-delete) | HIGH | Apple HIG + competitor analysis + community consensus |
| expo-print for PDF on iOS | HIGH | Expo official docs (verified: WKWebView local asset limitation confirmed) |
| expo-sharing for share sheet | HIGH | Expo official docs |
| RTL requiring app restart | HIGH | React Native docs + GitHub issues (confirmed bugs with live switching) |
| Victory Native for charts | MEDIUM | Multiple 2025 recommendations; official docs verified |
| Keyboard avoidance using react-native-keyboard-controller | MEDIUM | Community consensus; DROP-IN replacement claim verified via docs |
| Offline-first is anti-feature for finance | MEDIUM | Expert opinion + architecture articles; no single authoritative source |
| Haptics as differentiator (not just table stakes) | MEDIUM | Copilot Money user reviews + fintech UX articles; subjective |

---

## Sources

- [Apple HIG — Navigation and Search](https://developer.apple.com/design/human-interface-guidelines/navigation-and-search) — MEDIUM confidence (JS-gated page, content summarized from search)
- [Apple HIG — Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) — MEDIUM confidence (JS-gated)
- [Apple HIG — Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures/) — via WebSearch
- [Expo Print Documentation](https://docs.expo.dev/versions/latest/sdk/print/) — HIGH confidence (verified directly)
- [Expo Sharing Documentation](https://docs.expo.dev/versions/latest/sdk/sharing/) — HIGH confidence (verified directly)
- [Expo Haptics Documentation](https://docs.expo.dev/versions/latest/sdk/haptics/) — HIGH confidence via WebSearch
- [React Native I18nManager — RTL Support](https://reactnative.dev/docs/i18nmanager) — HIGH confidence
- [Expo Safe Area Context](https://docs.expo.dev/versions/latest/sdk/safe-area-context/) — HIGH confidence
- [Expo Keyboard Handling Guide](https://docs.expo.dev/guides/keyboard-handling/) — HIGH confidence
- [Eleken — Fintech UX Best Practices 2026](https://www.eleken.co/blog-posts/fintech-ux-best-practices) — MEDIUM confidence
- [LogRocket — Top React Native Chart Libraries 2025](https://blog.logrocket.com/top-react-native-chart-libraries/) — MEDIUM confidence
- [Copilot Money Review — Money with Katie 2026](https://moneywithkatie.com/copilot-review-a-budgeting-app-that-finally-gets-it-right/) — LOW-MEDIUM (review article, not official)
- [App Store Review Guidelines 2025](https://nextnative.dev/blog/app-store-review-guidelines) — MEDIUM confidence

---

*Feature research for: Balance Tracker iOS v2.0 — React Native port*
*Researched: 2026-02-26*
*Supersedes: previous FEATURES.md (Advanced Mode v1.1 web)*
