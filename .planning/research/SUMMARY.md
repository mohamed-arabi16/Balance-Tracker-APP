# Project Research Summary

**Project:** Balance Tracker iOS (React Native Port)
**Domain:** Personal finance + freelancer invoicing — React Native (Expo) iOS port of existing React/Supabase web PWA
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

Balance Tracker's iOS port is a rendering-layer replacement, not a full rebuild. The existing Supabase backend (PostgreSQL schema, RLS policies, Edge Functions, RPC calls), all custom React Query hooks, pure TypeScript business logic (`lib/`), Zod schemas, and i18n translation resources transfer directly to the React Native project with zero or minimal changes. Only the UI layer — every component that uses DOM elements, HTML, CSS, or browser-specific APIs — must be rebuilt from scratch using React Native core primitives styled with NativeWind v4. This architectural split is the foundational insight that structures the entire roadmap: do not attempt to port UI; do attempt to port logic.

The recommended stack is Expo SDK 52 (the last version with clean Supabase compatibility), React Native 0.76 (New Architecture by default), Expo Router v3 (file-based navigation), NativeWind v4 (Tailwind syntax for native), and the same TanStack React Query + react-hook-form + Zod + i18next toolchain already in use on the web. PDF generation replaces `@react-pdf/renderer` (browser-only, unusable in React Native) with `expo-print` + `expo-sharing`. Distribution targets the App Store exclusively via EAS Build + EAS Submit. iOS table stakes — bottom tab navigation, safe area handling, swipe-to-delete, pull-to-refresh, haptic feedback, dark mode system sync, privacy screen, locale-aware formatting — must all be present for App Store submission. The app has two genuine differentiators among iOS finance apps: Arabic RTL support and mobile invoicing with PDF export, neither of which any major competitor offers.

The most dangerous risks are front-loaded in project setup: the `react-native-url-polyfill` must be the first import in the entry file, the Supabase client must use the `expo-sqlite/localStorage` polyfill (not `localStorage`), and a Metro config alias must neutralize the `ws/stream` crash introduced in Expo SDK 53+ (avoided by pinning to SDK 52). RTL direction switching requires an app restart on iOS — this is a React Native architecture constraint, not a bug — and must be designed into the UX from the start. App Store submission requires a privacy policy URL, in-app account deletion, and a release build tested on a physical device before submitting.

---

## Key Findings

### Recommended Stack

The stack reuses the web app's entire non-UI toolchain. Expo SDK 52 is pinned specifically because SDK 53+ introduced a `ws/stream` Metro bundler crash with `@supabase/supabase-js` (tracked in upstream issues #1400/#1403, unresolved as of research date). React Native 0.76 ships with the New Architecture enabled by default, enabling JSI and concurrent rendering. Expo Router v3 provides file-based navigation that mirrors the web app's page structure. NativeWind v4 (Dec 2025) brings CSS variables and dark mode to the Tailwind syntax already in use on the web. EAS Build and EAS Submit handle App Store distribution without requiring a local macOS Xcode environment.

**Core technologies:**
- **Expo SDK 52** — project framework — pinned due to SDK 53+ Supabase incompatibility; upgrade path is clear once upstream resolves
- **React Native 0.76** — native iOS rendering via New Architecture; minimum iOS deployment target 15.1
- **Expo Router v3** — file-based navigation; tabs, stacks, modals, deep links; built on React Navigation v7
- **NativeWind v4** — Tailwind-syntax styling for React Native; dark mode, CSS variables; minimal learning curve given existing web stack
- **@supabase/supabase-js 2.x** — same client as web; requires `expo-sqlite/localStorage/install` polyfill for session persistence (not browser `localStorage`)
- **react-native-url-polyfill** — must be first import; supabase-js requires standard URL API absent from Hermes
- **TanStack React Query v5** — same hooks as web; needs one-time AppState focus + NetInfo online manager wiring
- **react-hook-form + Zod** — same forms and schema validation as web; zero changes to schema definitions
- **expo-print + expo-sharing** — replaces `@react-pdf/renderer` (browser-only); HTML string to PDF via WKWebView + iOS share sheet
- **EAS Build + EAS Submit** — cloud-based App Store binary compilation and submission; no local Xcode required
- **i18next + react-i18next + expo-localization** — same translation resources as web; `I18nManager.allowRTL()` wired at startup

See `.planning/research/STACK.md` for full version compatibility matrix and installation commands.

### Expected Features

The v2.0 milestone targets full feature parity with the web app plus iOS-native adaptations that are non-negotiable for a native feel. Every feature the web app has must ship — the App Store page cannot advertise a subset.

**Must have (table stakes — required for App Store submission):**
- Tab bar navigation with 5 sections — iOS users try native gesture navigation immediately; absence fails review
- Safe area handling (notch, Dynamic Island, home indicator) — App Store review flags missing safe area
- Auth port (login, logout, session persistence with expo-sqlite polyfill)
- Full CRUD for income, expense, debt, asset with native form UI
- Dashboard with net worth card and charts (Victory Native replaces Recharts, which is web-only)
- Swipe-to-delete on all lists — iOS users try this first; absence feels broken
- Pull-to-refresh on all list screens
- Keyboard avoidance on all form screens (react-native-keyboard-controller recommended)
- CSV export via iOS share sheet (expo-sharing replaces browser download link)
- Multi-currency with live exchange rates (hooks port unchanged)
- EN/AR bilingual with RTL layout (I18nManager; app restart required on language switch)
- Dark/light theme with system sync + manual override
- Advanced mode: clients, invoices, invoice status, PDF export via expo-print + share sheet
- Privacy screen on app switcher (blur overlay on AppState background event)
- Haptic feedback on save/delete/error (expo-haptics)
- Locale-aware number formatting (Intl.NumberFormat, confirmed in Hermes SDK 52+)
- In-app account deletion (required by Apple since June 2023; must be in Settings screen)
- Privacy policy URL (must be hosted and linked in App Store Connect before submission)

**Should have (differentiators — include in v2.0 if schedule allows, otherwise v2.x):**
- Quick-add bottom sheet (FAB or "+" trigger; @gorhom/bottom-sheet) — reduces friction for habit-loop transaction entry
- Skeleton loading states — polished perceived performance; Copilot-level quality signal
- Optimistic UI updates via React Query — sub-100ms perceived responsiveness on add/edit

**Defer to v2.x (explicitly out of scope for initial App Store submission):**
- Face ID / Touch ID biometric login — requires expo-local-authentication + keychain session; separate milestone
- Push notifications — requires APNs entitlement + server-side trigger infrastructure; separate milestone
- Home screen widgets — requires Swift WidgetKit extension; not achievable in Expo managed workflow
- Android support — doubles QA surface; separate milestone per PROJECT.md

See `.planning/research/FEATURES.md` for the full iOS-to-web adaptation mapping table and competitor analysis.

### Architecture Approach

The architecture enforces a strict two-layer split: the backend and all business logic layers are ported verbatim; only the rendering layer is rebuilt. The reusable layer comprises all TypeScript types from `integrations/supabase/types.ts`, all custom hooks, all pure `lib/` functions, Zod schemas, and i18n translation resources. The rebuild layer is everything that touches DOM elements, Shadcn components, CSS, `react-router-dom`, or browser APIs. The project is a standalone new Expo repo — not a monorepo. The monorepo cost/benefit calculation favors separate repos for a solo/small team where the shared layer is stable and infrequently changing.

**Major components:**
1. **Expo Router file tree (`src/app/`)** — route definition; `(auth)` group for unauthenticated screens, `(tabs)` group for authenticated tab bar, advanced screens nested inside tabs
2. **Stack.Protected auth guard** — replaces web's `ProtectedRoute` and `AdvancedRoute`; driven by `AuthContext` session and mode state
3. **AuthContext + Supabase RN client** — rebuilt with `expo-sqlite/localStorage` polyfill + AppState token refresh; identical public interface to web's AuthContext
4. **Ported hooks layer** — all `useIncomes`, `useExpenses`, `useDebts`, `useAssets`, `useClients`, `useInvoices`, etc. copied with import path updates; React Query config adds AppState focus manager + NetInfo online manager
5. **Context providers** — ThemeContext rebuilt using Appearance API + NativeWind; ModeContext, CurrencyContext, DateContext ported with AsyncStorage swap for localStorage
6. **NativeWind-styled native UI components** — every UI primitive rebuilt using `View`, `Text`, `Pressable`, `FlatList`; @gorhom/bottom-sheet for modals; Victory Native for charts
7. **expo-print + expo-sharing (PDF layer)** — replaces `@react-pdf/renderer`; HTML template with base64-encoded images; RTL support via `<html dir="rtl">`
8. **EAS Build + EAS Submit** — distribution pipeline; OTA updates via EAS Update for post-launch JS fixes

See `.planning/research/ARCHITECTURE.md` for build order, data flow diagrams, anti-patterns, and the full reuse vs. rebuild decision map.

### Critical Pitfalls

Ten technical pitfalls and five App Store compliance pitfalls were identified. The highest-impact:

1. **Missing URL polyfill crashes Supabase at runtime** — add `import 'react-native-url-polyfill/auto'` as the absolute first line of the entry file before any other import; failure causes `TypeError: URL.hostname is not implemented` on every Supabase call
2. **Wrong Supabase auth storage loses session on restart** — use `expo-sqlite/localStorage/install` polyfill (not browser `localStorage`); add AppState listeners for `startAutoRefresh()`/`stopAutoRefresh()` to prevent offline session-clearing bug
3. **ws/stream Metro crash on Expo SDK 53+** — pin to Expo SDK 52; the crash occurs even when realtime subscriptions are never called; workaround is a `metro.config.js` resolver alias if SDK 53+ must be used
4. **RTL layout direction requires full app restart on iOS** — design language-switch UX to show "restart required" prompt from the start; initialize `I18nManager.allowRTL()` at startup based on persisted preference; build all components with logical properties (`marginStart`/`marginEnd`) from day one
5. **`@react-pdf/renderer` is browser-only — crashes React Native** — use `expo-print` + `expo-sharing` from day one; all invoice images must be base64-encoded in the HTML template (WKWebView blocks local `file://` URIs)
6. **Missing in-app account deletion causes App Store rejection** — Apple Guideline 5.1.1(v) has required this since June 2023; must be a full Supabase data + auth deletion flow in the Settings screen
7. **App crashes during App Store review = Guideline 2.1 rejection** — test the release build (not Expo Go, not dev build) on a physical iPhone before submitting; provide a test account in App Store Connect review notes

See `.planning/research/PITFALLS.md` for recovery costs, warning signs, and the "Looks Done But Isn't" pre-submission checklist.

---

## Implications for Roadmap

Based on the combined research, six phases are suggested. The build order is determined by hard dependency chains: the Supabase client and auth shell must exist before any screen can render user data; the navigation shell must exist before feature screens; simple mode screens before advanced mode; PDF generation only after invoice UI is complete; App Store submission is the final gate.

### Phase 1: Project Scaffold + Supabase Foundation

**Rationale:** Every critical pitfall (URL polyfill, session persistence, ws/stream crash, PDF strategy, Text component enforcement) must be resolved before a single feature is built. A broken foundation discovered in Phase 3 means rewriting already-shipped screens. Mistakes here have the highest blast radius.
**Delivers:** A working Expo SDK 52 project with Supabase client correctly configured for React Native, all polyfills in place, React Query wired with AppState/NetInfo, i18n init with RTL support, and all portable layers (hooks, lib, types, translation strings) copied from the web project. Produces a blank app that compiles, connects to Supabase, and persists a session across restarts.
**Addresses:** Session persistence, multi-currency data layer, i18n translation strings (ported, not rebuilt), PDF strategy decision
**Avoids:** Pitfalls 1 (URL polyfill), 2 (session storage), 3 (ws/stream crash), 5 (@react-pdf), 8 (Text component pattern); establishes ESLint rule `react-native/no-raw-text`
**Research flag:** Standard patterns — well-documented in official Expo and Supabase docs. No additional research needed.

### Phase 2: Auth Shell + Navigation Structure

**Rationale:** Authentication and navigation are load-bearing infrastructure. No feature screen can be built, tested, or demonstrated without the auth gate and tab bar in place. This phase has no direct feature value to users but unblocks all of Phases 3–5.
**Delivers:** Sign-in/sign-up screens, AuthContext with AppState token refresh, root `_layout.tsx` with `Stack.Protected` auth guard, ThemeContext (dark mode system sync), ModeContext, bottom tab bar with correct iOS HIG patterns, and stub screens for each tab. The app is navigable end-to-end with no feature content yet.
**Addresses:** Tab bar navigation (table stakes), dark mode sync, RTL startup initialization, safe area handling
**Avoids:** Pitfall 4 (RTL direction — "restart required" UX designed upfront); anti-pattern of multiple QueryClient instances (one global client established here)
**Research flag:** Standard patterns — Expo Router auth docs are official and complete.

### Phase 3: Simple Mode Screens

**Rationale:** The core value proposition is income/expense/debt/asset tracking. These screens also serve as the proving ground for all native UI patterns (FlatList, swipe-to-delete, pull-to-refresh, keyboard avoidance, bottom sheet forms, Victory Native charts) that are reused in Phase 4. Build these first so the patterns are established and debugged before advanced complexity is introduced.
**Delivers:** Dashboard (net worth card, Victory Native charts), Income list + add/edit/delete, Expenses list + add/edit/delete, Debts list + history, Assets list + price tracking, Settings screen (theme, currency, language, mode toggle).
**Addresses:** All P1 table stakes: swipe-to-delete, pull-to-refresh, keyboard avoidance, CSV export, multi-currency, dark mode, haptics, locale-aware formatting, privacy screen on app switcher, skeleton loading
**Avoids:** Pitfall 9 (FlatList instead of ScrollView from the start); Pitfall 10 (KeyboardAvoidingView with `useHeaderHeight()`); chart library conflict (Victory Native, not Recharts which is web-only)
**Research flag:** Victory Native integration may benefit from a quick research pass — the library had API changes in late 2025 (confidence rated MEDIUM in FEATURES.md). Validate current Victory Native v5 API before building dashboard charts.

### Phase 4: Advanced Mode Screens + PDF Export

**Rationale:** Advanced mode depends on Phase 3 being complete and stable — the hooks are already proven, React Query is configured, and the pattern for list + form screens is established. Advanced mode introduces the deepest UI complexity (client detail, invoice line item editor) and the app's two biggest differentiators: mobile invoicing and PDF export. PDF export is placed here, not in Phase 5, because validating Arabic PDF output early avoids costly template rewrites.
**Delivers:** Advanced Dashboard, Clients list + new/edit, Client detail, Invoices list + new/edit, Invoice detail with status management, expo-print PDF generation + expo-sharing share sheet.
**Addresses:** Advanced mode feature parity, PDF export differentiator, client and invoice CRUD
**Avoids:** Pitfall 5 (@react-pdf/renderer — expo-print from day one); Pitfall 6 (base64-encode logo in HTML template); deep link configuration for invoice screens
**Research flag:** expo-print PDF template quality depends on HTML/CSS implementation — validate Arabic text rendering on a physical device on day 1 of PDF work before building the full template. This is the one acknowledged medium-confidence area across all research files.

### Phase 5: Settings + App Store Compliance Prep

**Rationale:** Account deletion is a mandatory App Store requirement (Guideline 5.1.1(v)) that requires a Supabase RPC function for atomic data deletion plus a native confirmation flow. RTL verification must happen here before submitting — fixing RTL issues post-submission restarts the review clock. Privacy policy and app metadata are submission blockers.
**Delivers:** Full Settings screen (account deletion flow, language switch with restart prompt, theme + currency + mode settings), full RTL audit of all screens on physical device with Arabic selected, privacy policy document, app icon + splash screen, EAS Build production profile configured and tested.
**Addresses:** In-app account deletion (required per Apple), RTL layout correctness (full audit), App Store metadata (screenshots, description, privacy policy URL)
**Avoids:** Pitfall AS-3 (missing account deletion); Pitfall 4 (final RTL verification pass); language switch UX with restart prompt
**Research flag:** Standard patterns. Account deletion Supabase function is straightforward RPC; App Store metadata requirements are well-documented.

### Phase 6: App Store Submission

**Rationale:** Submission is not a formality — App Store review rejects apps for privacy manifest issues, crashes, incomplete metadata, and missing functionality. Each rejection adds approximately one week of review cycle. Front-loading all verification is cheaper than a rejection.
**Delivers:** App live on the App Store with all features complete, release build tested on physical device, privacy manifest verified, screenshots taken with real representative data, test account credentials documented for reviewers.
**Addresses:** All App Store compliance pitfalls (AS-1 through AS-5)
**Avoids:** Pitfall 7 (PrivacyInfo.xcprivacy — Expo SDK 52+ includes automatically); Pitfall AS-2 (privacy policy URL); Pitfall AS-4 (release build crash during review); Pitfall AS-5 (stale or misleading screenshots)
**Research flag:** Standard patterns. Run the "Looks Done But Isn't" checklist from `.planning/research/PITFALLS.md` before triggering `eas submit`.

### Phase Ordering Rationale

- **Phases 1–2 are non-negotiable prerequisites.** No feature can be built, tested, or committed to the app without a working Supabase connection and a navigable shell. Attempting to build feature screens before auth is in place means constantly working around missing context.
- **Phase 3 before Phase 4** because advanced mode hooks share the same React Query setup and native UI patterns. Debugging FlatList performance or keyboard avoidance on a simple income form is far less costly than discovering the bug first on an invoice line item editor.
- **PDF export in Phase 4 (not Phase 5)** because it is a P1 feature and a core differentiator, and because validating Arabic PDF output early avoids discovering template issues at the end of the project when the review clock is ticking.
- **Phase 5 (compliance) before Phase 6 (submission)** because account deletion, RTL verification, and privacy policy are blocking submission requirements, not polish items.

### Research Flags

Phases likely needing a deeper research pass during planning:
- **Phase 3 (Victory Native charts):** Confidence is MEDIUM on the current API surface. A 20-minute targeted research pass on Victory Native v5 before building dashboard charts is recommended. Specifically: line chart with tap-to-callout interaction and dynamic width via `useWindowDimensions`.
- **Phase 4 (expo-print Arabic PDF):** Run a minimal proof-of-concept — HTML string with Arabic text, `Print.printToFileAsync`, inspect the output on a physical device — before building the full invoice template. If Arabic text is garbled, the fallback is to move PDF generation to a Supabase Edge Function; that path needs to be understood before deep template work begins.

Phases with well-documented standard patterns (skip deeper research):
- **Phase 1:** Supabase + Expo official quickstart docs are complete and verified HIGH confidence.
- **Phase 2:** Expo Router auth documentation is official and directly applicable.
- **Phase 5:** Account deletion pattern is standard Supabase RPC; App Store metadata requirements are well-documented by Apple.
- **Phase 6:** EAS Submit workflow is official and well-maintained.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core framework verified via Expo SDK changelogs and official Supabase Expo quickstart. PDF strategy (expo-print) rated MEDIUM — library is active and well-documented but final output quality depends on HTML/CSS implementation. |
| Features | HIGH | iOS table stakes verified via Apple HIG and competitor analysis. RTL restart requirement confirmed via React Native official docs and GitHub issues. expo-print WKWebView local asset limitation confirmed via official docs. |
| Architecture | HIGH | All major patterns verified against official Expo Router, Supabase, TanStack Query, and React Native documentation. Monorepo decision supported by multiple independent sources. |
| Pitfalls | HIGH | Critical pitfalls backed by official documentation and active GitHub issues. App Store compliance requirements verified directly from Apple's guidelines. Recovery cost estimates are approximations. |

**Overall confidence:** HIGH

### Gaps to Address

- **Victory Native v5 API:** Research selected Victory Native but confidence on the specific interaction API (tap-to-callout, responsive width) is MEDIUM. Validate against current docs before building dashboard charts in Phase 3.
- **expo-print Arabic font rendering:** Whether Arabic characters render correctly via WKWebView's PDF pipeline with available system fonts has not been directly validated. A minimal proof-of-concept is required on day 1 of Phase 4 PDF work before the full template is built.
- **Expo SDK 52 shelf life:** The pin to SDK 52 is correct as of February 2026, but the upstream supabase-js `ws/stream` fix could ship at any time. Check supabase-js issues #1400/#1403 at project start. If resolved, upgrading to the latest stable SDK before building Phase 3 is recommended.
- **Apple Developer Program enrollment timing:** EAS Build can produce a binary without an Apple Developer account, but TestFlight and App Store submission require the account and bundle ID to be registered. This admin step has a 24–48 hour processing delay and should be started no later than Phase 4 to avoid blocking Phase 6.

---

## Sources

### Primary (HIGH confidence)
- Expo SDK 52 Changelog — https://expo.dev/changelog/2024-11-12-sdk-52
- Expo SDK 53 Changelog (Supabase incompatibility) — https://expo.dev/changelog/sdk-53
- supabase-js issues #1400, #1403 — https://github.com/supabase/supabase-js/issues/1400
- Supabase Expo quickstart (official) — https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Expo Print documentation — https://docs.expo.dev/versions/latest/sdk/print/
- Expo Sharing documentation — https://docs.expo.dev/versions/latest/sdk/sharing/
- Expo Router authentication docs — https://docs.expo.dev/router/advanced/authentication/
- Expo Router tabs navigation — https://docs.expo.dev/router/advanced/tabs/
- Supabase Auth React Native quickstart — https://supabase.com/docs/guides/auth/quickstarts/react-native
- React Native I18nManager docs — https://reactnative.dev/docs/i18nmanager
- TanStack Query React Native docs — https://tanstack.com/query/latest/docs/framework/react/react-native
- EAS Build documentation — https://docs.expo.dev/build/introduction/
- EAS Submit iOS docs — https://docs.expo.dev/submit/ios/
- Apple App Review Guidelines — https://developer.apple.com/app-store/review/guidelines/
- NativeWind dark mode docs — https://www.nativewind.dev/docs/core-concepts/dark-mode
- RTL direction change requires restart (GitHub #48311) — https://github.com/facebook/react-native/issues/48311

### Secondary (MEDIUM confidence)
- NativeWind v4 installation — https://www.nativewind.dev/docs/getting-started/installation
- expo-print HTML-to-PDF community guide (Jan 2026) — https://anytechie.medium.com/how-to-use-expo-print-complete-guide-to-printing-in-react-native-apps-173fa435dadf
- LogRocket — Top React Native chart libraries 2025 — https://blog.logrocket.com/top-react-native-chart-libraries/
- GeekyAnts RTL + Expo guide — https://geekyants.com/blog/implementing-rtl-right-to-left-in-react-native-expo---a-step-by-step-guide
- Eleken — Fintech UX Best Practices 2026 — https://www.eleken.co/blog-posts/fintech-ux-best-practices
- Supabase React Native gotchas (Prosperasoft) — https://www.prosperasoft.com/blog/database/supabase/supabase-react-native-gotchas/
- Supabase session lost offline (GitHub discussion #36906) — https://github.com/orgs/supabase/discussions/36906
- Expo + React Hook Form + Zod guide — https://dev.to/birolaydin/expo-react-hook-form-typescript-zod-4oac

### Tertiary (LOW confidence — needs validation during implementation)
- Copilot Money haptics as differentiator — inferred from user review analysis; subjective
- Offline-first as anti-feature for finance apps — expert opinion, no single authoritative source

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
