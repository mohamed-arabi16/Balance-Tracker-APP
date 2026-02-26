# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26 after v2.0 milestone start)

**Core value:** Anyone can track their money simply — and freelancers can manage their business without switching apps.
**Current focus:** v2.0 iOS Native App — Phase 10: Dashboard + CSV Export

## Current Position

Milestone: v2.0 iOS Native App
Phase: 9 of 12 (Simple Mode Screens)
Plan: 4 of 4 in Phase 9 (COMPLETE)
Status: In progress — Phase 9 Plans 01, 03, 04 complete (02 pending)
Last activity: 2026-02-26 — 09-04 complete: Assets FlatList with live prices, ReanimatedSwipeable, add/edit formSheet with auto_update Switch

Progress: [██████████░░░░░░░░░░] 50% (6/12 phases complete, v1.0+v1.1)

## Performance Metrics

**Velocity (v1.0 + v1.1):**
- Total plans completed: 23
- Average duration: human-gated (verification plans) + ~2 min (implementation plans)
- Total execution time: ~36 min (automated) + human-gated checkpoints

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Database & Type Foundation | 3/3 | 6 min + human-gated | human-gated |
| 2. Mode Infrastructure | 4/4 | 7 min | 1.75 min |
| 3. Client Management | 3/3 | ~5 min + human-verify | human-gated |
| 4. Transaction-Client Linking | 4/4 | ~7 min + human-verify | human-gated |
| 5. Invoices & PDF Export | 7/7 | 14 min + human-verify | human-gated |
| 6. Advanced Dashboard | 2/2 | 2 min + human-verify | human-gated |

**Recent Trend:**
- Last 5 plans: 05-04 (2 min), 05-05 (2 min), 05-06 (3 min), 06-01 (2 min), 06-02 (human-gated)
- Trend: Fast (UI pages follow established patterns)
| Phase 09 P04 | 3 | 2 tasks | 3 files |
| Phase 09 P03 | 4 | 2 tasks | 5 files |
| Phase 09 P02 | 3 | 2 tasks | 3 files |
| Phase 10 P02 | 3 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key decisions for v2.0:

- [v2.0 Roadmap]: expo-print + expo-sharing replaces @react-pdf/renderer (browser-only, crashes RN) — used in Phase 11
- [v2.0 Roadmap]: RTL requires app restart on iOS — design "restart required" prompt in Phase 7 i18n init, not Phase 12
- [v2.0 Roadmap]: FIX-01 (tax_amount generated column in INSERT) assigned to Phase 11 (Invoices) — same phase where invoice creation is built
- [v2.0 Roadmap]: Victory Native replaces Recharts (web-only) — validate tap-to-callout API before Phase 10 planning
- [v2.0 Roadmap]: UX patterns (safe areas, haptics, swipe-to-delete, keyboard avoidance) assigned to Phase 7 — architectural decisions baked in before any feature screen
- [v2.0 Roadmap]: Expo SDK 52 pinned — SDK 53+ has unresolved ws/stream Metro crash with supabase-js (#1400/#1403)
- [v2.0 Roadmap, 07-01 update]: Expo SDK 55 installed (create-expo-app latest stable) — SDK 52 pin may be stale; monitor ws/stream Metro compatibility in Plan 02 when full Supabase client is built
- [07-01]: AsyncStorage replaces localStorage for all RN context persistence (DateContext, CurrencyContext)
- [07-01]: Placeholder stubs pattern — AuthContext, useLogActivity, analytics.ts created as type-safe no-ops to allow hooks to compile before Plan 02/08 implementation
- [07-01]: EXPO_PUBLIC_ prefix for all public env vars (replaces VITE_ prefix from web app)
- [07-01]: URL polyfill (react-native-url-polyfill/auto) imported first in app/_layout.tsx
- [07-02]: expo-sqlite localStorage polyfill used for Supabase session storage (not expo-secure-store — 2KB per-item limit exceeded by Supabase sessions)
- [07-02]: NetInfo online manager omitted from queryClient.ts — requires dev build; deferred to Phase 8
- [07-02]: SplashScreen.preventAutoHideAsync() called in _layout.tsx; hide delegated to Phase 8 after auth+i18n init
- [07-03]: FormScreen uses KeyboardAvoidingView + ScrollView fallback — react-native-keyboard-controller requires dev build; Expo Go phase; upgrade deferred to Phase 8
- [07-03]: setColorScheme in nativewind v4 is a method on useColorScheme() return value, not a named export — destructure from hook
- [07-03]: SplashScreen.hideAsync() moved to _layout.tsx after initI18n() — Plan 03 owns i18n gate, so splash hide belongs here
- [01-03]: Generated columns (tax_amount, total, amount) excluded from Insert/Update types — same pattern applies to RN port
- [08-01]: expo-router typed routes: .expo/types/router.d.ts is gitignored — use 'as any' type assertions on Link hrefs for new routes until first expo start regenerates the file
- [08-01]: queryClient.clear() called only in explicit signOut(), NOT in onAuthStateChange — avoids clearing cache on token auto-refresh
- [08-01]: resetPassword has no redirectTo — covered in Phase 12 plan 12-01 Task 3 (balancetracker://reset-password deep link + reset-password screen)
- [08-02]: Stack.Protected auth guard pattern — two guards in RootNavigator (!session shows (auth), !!session shows (tabs)); no imperative router.replace() redirect
- [08-02]: RootNavigator returns null while isLoading — splash screen covers this gap; SplashScreen.hideAsync() fires only when both i18n and auth resolve
- [08-02]: Tab directories (debts/, assets/) require their own _layout.tsx so Expo Router names route segments correctly to match Tabs.Screen name props
- [08-02]: AuthContext.onAuthStateChange must NOT call setIsLoading(false) — getSession already sets it; duplicate call causes null→Stack→null flicker in RootNavigator
- [08-02]: FormScreen wrapped in SafeAreaView so auth screens respect notch and Dynamic Island on modern iPhones
- [09-01]: DeleteAction is a plain function (not React component) to match ReanimatedSwipeable renderRightActions SharedValue signature
- [09-01]: StatusBadge passes ALL UpdateIncomePayload fields on mutate to prevent Supabase null overwrites
- [09-01]: date-fns was not pre-installed — auto-installed as blocking dep; now available to Plans 09-02/03/04
- [09-01]: formSheet Stack layout defines add-expense screen upfront so Plan 09-02 only needs to create the file
- [Phase 09]: useAssetPrices called once at AssetScreen level and passed as props to AssetRow to avoid N separate hook subscriptions
- [Phase 09]: Stale warning guarded by !loading AND snapshot !== null — prevents spurious warning flash on initial mount (Pitfall 7)
- [Phase 09]: Debt status toggle passes ALL UpdateDebtPayload fields spread from item to avoid Supabase null overwrites on partial update
- [Phase 09]: payment.tsx uses note:'Payment' + payment_date to distinguish payment history entries from edit history entries in useUpdateDebt
- [Phase 09]: ExpenseScreen dual export (named+default) enables inline tab switching in index.tsx without navigation push
- [Phase 09]: index.tsx tab chip switcher: useState<'income'|'expenses'> drives conditional render of IncomeScreen vs ExpenseScreen
- [Phase 10]: expo-file-system v19 new API used (File + Paths) instead of deprecated legacy writeAsStringAsync + cacheDirectory
- [Phase 10]: Hook types (Income, Expense, Debt, Asset) imported from hook files, not Database types — hooks define own interfaces with extra fields like is_receivable

### Pending Todos

None.

### Blockers/Concerns

- [Phase 10]: Victory Native v5 API confidence is MEDIUM — validate tap-to-callout and responsive width before building dashboard charts
- [Phase 11]: expo-print Arabic font rendering not validated — run minimal proof-of-concept on physical device before full PDF template build
- [Phase 12]: Apple Developer Program enrollment needs 24–48hr processing — start no later than Phase 11 to avoid blocking submission

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 10-02-PLAN.md — exportCsv utility (expo-file-system v19 File API + expo-sharing) + Settings screen with Export button wired to all four data hooks, EXPRT-01 complete
Resume file: None
