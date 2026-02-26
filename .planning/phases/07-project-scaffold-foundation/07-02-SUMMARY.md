---
phase: 07-project-scaffold-foundation
plan: 02
subsystem: infra
tags: [supabase, react-query, expo-sqlite, react-native, session-persistence, appstate, safe-area, splash-screen]

# Dependency graph
requires:
  - phase: 07-01
    provides: Placeholder Supabase client and app/_layout.tsx scaffold to be replaced
provides:
  - Production Supabase RN client with expo-sqlite localStorage polyfill for session persistence
  - AppState token refresh lifecycle (pause on background, resume on foreground)
  - React Query client with AppState focus manager (staleTime: 5min, gcTime: 30min)
  - Root layout with SafeAreaProvider and QueryClientProvider wrapping Slot
  - SplashScreen.preventAutoHideAsync() call (to be hidden in Phase 8)
affects:
  - 07-03 (i18n init builds on the root layout established here)
  - Phase 8 (AuthContext, SplashScreen hide, NetInfo online manager all wire into this layout)
  - All subsequent phases (all hooks depend on the Supabase client for auth and data operations)

# Tech tracking
tech-stack:
  added: []  # All packages installed in Plan 01; only configuration changed
  patterns:
    - expo-sqlite localStorage polyfill imported second (after URL polyfill) in client.ts
    - AppState.addEventListener used for both Supabase token refresh lifecycle and React Query focus management
    - No NetInfo dependency in queryClient.ts — deferred to Phase 8 when dev build is required anyway
    - SplashScreen hidden responsibility delegated to Phase 8 (auth + i18n init)

key-files:
  created:
    - BalanceTracker/src/lib/queryClient.ts
  modified:
    - BalanceTracker/src/integrations/supabase/client.ts
    - BalanceTracker/app/_layout.tsx

key-decisions:
  - "expo-sqlite localStorage polyfill used for Supabase session storage (not expo-secure-store) — expo-secure-store has 2KB per-item size limit; Supabase sessions exceed this limit"
  - "NetInfo online manager omitted from queryClient.ts — requires dev build; deferred to Phase 8 where dev build is required anyway"
  - "SplashScreen.preventAutoHideAsync() called at module level in _layout.tsx — hide will be triggered in Phase 8 once auth and i18n are initialized"

patterns-established:
  - "Pattern 5: expo-sqlite over expo-secure-store — use expo-sqlite localStorage polyfill for any storage that can exceed 2KB (Supabase sessions, JWT tokens)"
  - "Pattern 6: Dual AppState listeners — Supabase and React Query each independently subscribe to AppState.change for lifecycle management"
  - "Pattern 7: NetInfo deferred — React Query online manager requires dev build; skip in Expo Go phases, add in Phase 8"

requirements-completed: [FOUND-02]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 7 Plan 02: Supabase RN Client + React Query Configuration Summary

**Supabase RN client with expo-sqlite localStorage session persistence and AppState token refresh, React Query configured with AppState focus manager, root layout wrapped with SafeAreaProvider and QueryClientProvider.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T02:00:34Z
- **Completed:** 2026-02-26T02:01:47Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Supabase client upgraded from placeholder to production — expo-sqlite localStorage polyfill stores sessions (survives force-quit), AppState listener pauses/resumes token refresh on background/foreground
- React Query client created with 5-minute staleTime, 30-minute gcTime, and AppState focus manager that triggers refetch when user returns to app
- Root layout now wraps the full app tree in SafeAreaProvider and QueryClientProvider; SplashScreen auto-hide prevented pending Phase 8 auth+i18n init

## Task Commits

Each task was committed atomically:

1. **Task 1: Build Supabase RN client with session persistence and AppState lifecycle** - `169b8ae` (feat)
2. **Task 2: Configure React Query client and wire root layout providers** - `cabd4da` (feat)

**Plan metadata:** (to be committed with SUMMARY.md)

## Files Created/Modified

- `BalanceTracker/src/integrations/supabase/client.ts` - Production Supabase client: URL polyfill first, expo-sqlite localStorage second, createClient with auth config, AppState listener
- `BalanceTracker/src/lib/queryClient.ts` - QueryClient with AppState focus manager; no NetInfo (deferred to Phase 8)
- `BalanceTracker/app/_layout.tsx` - SafeAreaProvider > QueryClientProvider > Slot; SplashScreen.preventAutoHideAsync at module level

## Decisions Made

- Used expo-sqlite localStorage polyfill instead of expo-secure-store for Supabase session storage. expo-secure-store has a 2KB per-item size limit; Supabase session tokens regularly exceed this. The expo-sqlite approach is the officially documented React Native solution.
- Omitted NetInfo online manager from queryClient.ts. The `@react-native-community/netinfo` package requires a dev build (not compatible with Expo Go). Since Phase 8 requires a dev build anyway, this is explicitly deferred. React Query operates correctly without it — queries just won't pause when offline.
- SplashScreen.preventAutoHideAsync() is called at module level in _layout.tsx. Hiding will be triggered in Phase 8 after both auth state and i18n locale are resolved. This prevents a flash of unstyled content on app launch.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compiled with zero errors after both tasks. All 5 plan verifications passed (expo-sqlite polyfill, detectSessionInUrl:false, focusManager, QueryClientProvider, SafeAreaProvider).

## User Setup Required

The `.env` file in BalanceTracker/ must contain valid Supabase credentials for the client to connect:
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `EXPO_PUBLIC_SUPABASE_PROJECT_ID` — Supabase project ID (used by useAssetPrices edge function hook)

## Next Phase Readiness

- Plan 03 (i18n init) can build directly on the root layout — add i18n provider inside QueryClientProvider
- Phase 8 providers (AuthContext, theme) will layer inside the existing SafeAreaProvider/QueryClientProvider shell
- All 10 data hooks (useIncomes, useExpenses, useDebts, etc.) are now backed by a production Supabase client with session persistence
- React Query refetch-on-focus is active — stale queries automatically reload when user returns to the app

## Self-Check: PASSED

- `BalanceTracker/src/integrations/supabase/client.ts` — FOUND
- `BalanceTracker/src/lib/queryClient.ts` — FOUND
- `BalanceTracker/app/_layout.tsx` — FOUND
- `.planning/phases/07-project-scaffold-foundation/07-02-SUMMARY.md` — FOUND
- Commit `169b8ae` — FOUND (feat: Supabase RN client)
- Commit `cabd4da` — FOUND (feat: React Query + root layout)
- TypeScript: 0 errors confirmed

---
*Phase: 07-project-scaffold-foundation*
*Completed: 2026-02-26*
