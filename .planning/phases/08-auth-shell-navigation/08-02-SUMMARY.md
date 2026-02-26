---
phase: 08-auth-shell-navigation
plan: 02
subsystem: auth
tags: [expo-router, stack-protected, tab-navigation, sf-symbols, react-native, supabase, splash-screen]

# Dependency graph
requires:
  - phase: 08-01-auth-shell-navigation
    provides: Real Supabase AuthContext with session/signOut/signUp/signIn, auth screens (sign-in, sign-up, forgot-password)
  - phase: 07-project-scaffold-foundation
    provides: Root layout providers (SafeAreaProvider, QueryClientProvider, ThemeProvider), SafeScreen, FormScreen, haptics, i18n resources

provides:
  - Stack.Protected auth guard in root layout — unauthenticated users see (auth), authenticated users see (tabs)
  - 5-tab navigation bar with SF Symbol icons (house, list.bullet, creditcard.fill, chart.bar.fill, ellipsis.circle.fill)
  - Functional Settings screen with user email display and sign-out button
  - Stub screens for all 5 tabs (Dashboard, Transactions, Debts, Assets, Settings) — ready for Phase 9-11 replacement
  - SplashScreen coordination — hides only after BOTH i18n and auth resolve (no flash of wrong screen)
  - i18n keys for tabs.* and settings.* namespaces (EN + AR)

affects:
  - 09-simple-mode-screens (replaces tab stub screens with real FlatList screens)
  - 10-dashboard-csv-export (replaces Dashboard tab stub with charts and NetWorthCard)
  - 11-advanced-mode-pdf-export (adds conditional Clients/Invoices tabs)
  - 12-app-store-compliance (adds account deletion and privacy policy to Settings screen)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Stack.Protected guard pattern — two guards, one for (auth) group (!session), one for (tabs) group (!!session); no useRouter().replace() redirect needed
    - RootNavigator internal component — decouples auth guard from provider setup; returns null while isLoading to keep splash screen visible
    - SplashScreen dual-gate — SplashScreen.hideAsync() called only when isLoading is false, ensuring both i18n and auth complete before reveal
    - Tab directory _layout.tsx — required for Expo Router to correctly name route segments matching Tabs.Screen name props
    - SymbolView tabBarIcon — each Tabs.Screen uses SymbolView with tintColor={color} for native SF Symbol rendering

key-files:
  created:
    - BalanceTracker/app/(tabs)/_layout.tsx
    - BalanceTracker/app/(tabs)/index.tsx
    - BalanceTracker/app/(tabs)/transactions/index.tsx
    - BalanceTracker/app/(tabs)/debts/index.tsx
    - BalanceTracker/app/(tabs)/debts/_layout.tsx
    - BalanceTracker/app/(tabs)/assets/index.tsx
    - BalanceTracker/app/(tabs)/assets/_layout.tsx
    - BalanceTracker/app/(tabs)/settings.tsx
  modified:
    - BalanceTracker/app/_layout.tsx
    - BalanceTracker/src/i18n/resources.ts
    - BalanceTracker/src/components/layout/FormScreen.tsx
    - BalanceTracker/src/contexts/AuthContext.tsx

key-decisions:
  - "Stack.Protected auth guard: two guards in RootNavigator — !session shows (auth), !!session shows (tabs); no imperative router.replace() needed"
  - "RootNavigator returns null while isLoading — splash screen covers this gap; no spinner or blank screen flash"
  - "SplashScreen.hideAsync() called in RootNavigator useEffect after isLoading is false — ensures BOTH i18n (Phase 7) and auth (Phase 8) resolve before splash hides"
  - "Tab directories (debts/, assets/) require their own _layout.tsx so Expo Router names route segments correctly to match Tabs.Screen name props"
  - "AuthContext.onAuthStateChange does NOT call setIsLoading(false) — getSession already sets loading state; removing the duplicate call eliminates null→Stack→null flicker in RootNavigator"
  - "FormScreen wrapped in SafeAreaView so auth screens respect notch and Dynamic Island on modern iPhones"

patterns-established:
  - "Tab stub screen pattern: SafeScreen > View with flex-1 items-center justify-center > Text showing t('tabs.X') — all 4 non-settings stubs follow this"
  - "Settings screen: useAuth().user?.email for email display, haptics.onDelete() + await signOut() for sign-out; Stack.Protected handles redirect automatically"

requirements-completed: [AUTH-03, AUTH-05, FOUND-04]

# Metrics
duration: human-gated (physical device verification)
completed: 2026-02-26
---

# Phase 8 Plan 02: Auth Shell + Navigation Summary

**Stack.Protected auth guard + 5-tab SF Symbol navigation with Settings sign-out, verified end-to-end on physical iOS device**

## Performance

- **Duration:** Human-gated (physical device verification checkpoint)
- **Started:** 2026-02-26T03:13:35Z
- **Completed:** 2026-02-26 (human-verified)
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 12

## Accomplishments

- Wired Stack.Protected auth guard in root layout — unauthenticated users see sign-in screen, authenticated users see 5-tab bar; no imperative routing
- Built 5-tab navigation bar with SymbolView SF Symbol icons, i18n tab labels, correct iOS system blue/gray tint colors
- Created functional Settings screen with user email display and sign-out (haptics + supabase signOut), plus 4 stub screens for phases 9-11 to replace
- Fixed SplashScreen coordination so splash stays visible until both i18n and auth resolve — no flash of wrong screen on app open
- All 5 Phase 8 success criteria verified on physical iOS device (auth guard, sign-up, session persistence, sign-out, password reset)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire root layout with AuthProvider, Stack.Protected auth guard, and SplashScreen coordination** - `88b1ff2` (feat)
2. **Task 2: Create 5-tab layout with SF Symbols and stub screens including Settings with sign-out** - `40bf957` (feat)
3. **Task 3: Verify full auth flow and navigation on device** - Approved by human (no code commit)

**Post-checkpoint fixes:**
- `8ed0b58` (fix) — Replace over-engineered transactions screen with correct Phase 8 stub
- `3a00c64` (fix) — Add _layout.tsx to debts/ and assets/ tab directories
- `24d4cfb` (fix) — Fix auth screen safe area and auth loading double-render

## Files Created/Modified

- `BalanceTracker/app/_layout.tsx` — Added AuthProvider wrapper and RootNavigator with Stack.Protected guards; SplashScreen.hideAsync() moved here
- `BalanceTracker/app/index.tsx` — Deleted (Phase 7 test screen; conflicts with (tabs)/index.tsx)
- `BalanceTracker/app/(tabs)/_layout.tsx` — 5-tab layout with SymbolView SF Symbol icons and iOS tint colors
- `BalanceTracker/app/(tabs)/index.tsx` — Dashboard tab stub (SafeScreen + centered placeholder)
- `BalanceTracker/app/(tabs)/transactions/index.tsx` — Transactions tab stub
- `BalanceTracker/app/(tabs)/debts/index.tsx` — Debts tab stub
- `BalanceTracker/app/(tabs)/debts/_layout.tsx` — Stack layout to fix Expo Router route segment naming
- `BalanceTracker/app/(tabs)/assets/index.tsx` — Assets tab stub
- `BalanceTracker/app/(tabs)/assets/_layout.tsx` — Stack layout to fix Expo Router route segment naming
- `BalanceTracker/app/(tabs)/settings.tsx` — Settings screen with user email + haptic sign-out button
- `BalanceTracker/src/i18n/resources.ts` — Added tabs.* and settings.signOut/signedInAs keys (EN + AR)
- `BalanceTracker/src/components/layout/FormScreen.tsx` — Wrapped in SafeAreaView for auth screen notch/Dynamic Island support
- `BalanceTracker/src/contexts/AuthContext.tsx` — Removed duplicate setIsLoading(false) from onAuthStateChange to eliminate loading flicker

## Decisions Made

- **Stack.Protected over router.replace():** Using the declarative guard pattern means auth redirects are automatic and zero-code — adding or removing session just re-evaluates the guards.
- **RootNavigator returning null while loading:** Keeps the native splash screen visible during the auth check gap — no spinner or white flash between splash and content.
- **SplashScreen.hideAsync() in RootNavigator:** Both gates (i18n via i18nReady, auth via isLoading) must be false before the splash hides. The i18nReady gate is upstream in RootLayout; the auth gate is in RootNavigator.
- **Tab directory _layout.tsx required:** Expo Router requires each directory-based tab to have its own _layout.tsx so route segment naming matches Tabs.Screen name props. Without it, routes are named "debts/index" instead of "debts", causing "No route named X" warnings.
- **AuthContext loading fix:** onAuthStateChange was calling setIsLoading(false) redundantly. getSession() already resolves loading state. The duplicate call caused a brief null→Stack→null flicker in RootNavigator before the session evaluated.
- **FormScreen SafeAreaView:** Auth screens use FormScreen as their root container. Without SafeAreaView, content on iPhone 14 Pro/15 was clipped by the Dynamic Island.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Transactions stub screen was replaced with Phase 9 scope code**
- **Found during:** Post Task 2 (during human verification)
- **Issue:** The initial transactions/index.tsx was a full FlatList + swipeable + hooks implementation (318 lines) that belonged in Phase 9, caused TypeScript errors, and broke the build
- **Fix:** Replaced with a 17-line stub matching the dashboard/debts/assets pattern
- **Files modified:** `BalanceTracker/app/(tabs)/transactions/index.tsx`
- **Verification:** TypeScript compiled cleanly; transactions tab showed correct stub text
- **Committed in:** `8ed0b58`

**2. [Rule 2 - Missing Critical] Added _layout.tsx to debts/ and assets/ tab directories**
- **Found during:** Post Task 2 (during human verification)
- **Issue:** Without _layout.tsx in directory-based tab folders, Expo Router names the routes "debts/index" and "assets/index" which don't match Tabs.Screen name="debts"/"assets", causing navigation warnings
- **Fix:** Created _layout.tsx with a simple Stack layout in both debts/ and assets/
- **Files modified:** `BalanceTracker/app/(tabs)/debts/_layout.tsx`, `BalanceTracker/app/(tabs)/assets/_layout.tsx`
- **Verification:** Navigation warnings resolved; all 5 tabs navigate correctly
- **Committed in:** `3a00c64`

**3. [Rule 1 - Bug] Fixed auth screen safe area and auth loading double-render flicker**
- **Found during:** Human verification (Test 7 — no splash flash)
- **Issue:** (a) Auth screens using FormScreen had content clipped by Dynamic Island on iPhone 14 Pro+. (b) RootNavigator showed a brief null→Stack→null flicker because AuthContext.onAuthStateChange called setIsLoading(false) redundantly after getSession() already set it.
- **Fix:** (a) Wrapped FormScreen content in SafeAreaView. (b) Removed the duplicate setIsLoading(false) call from onAuthStateChange.
- **Files modified:** `BalanceTracker/src/components/layout/FormScreen.tsx`, `BalanceTracker/src/contexts/AuthContext.tsx`
- **Verification:** Safe area respected on physical device; splash→sign-in transition is clean with no flicker
- **Committed in:** `24d4cfb`

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing critical)
**Impact on plan:** All fixes necessary for correct routing, visual correctness, and polish. No scope creep — all stayed within Phase 8 auth shell scope.

## Issues Encountered

- Expo Router route segment naming is not obvious — directory-based tabs require an explicit _layout.tsx to get correct segment names. This pattern is now established for Phase 9 (transactions/ already had this from its stack layout).
- AuthContext loading state management was subtle: getSession() is async and sets isLoading via the useEffect, while onAuthStateChange fires whenever session changes. The two must not both manage isLoading or a double-render occurs.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auth shell is complete and device-verified. All 5 tab screens are accessible to authenticated users.
- Stub screens in (tabs)/ are ready for Phase 9 replacement: income screen replaces transactions stub, debts screen replaces debts stub, assets screen replaces assets stub, dashboard will be replaced in Phase 10.
- Stack.Protected guard will automatically update when Phase 9-12 add new routes — no changes to root layout needed.
- Settings screen will need Phase 10 CSV export button and Phase 12 account deletion — the screen structure (SafeScreen, sections pattern) supports additive changes.

---
*Phase: 08-auth-shell-navigation*
*Completed: 2026-02-26*
