---
phase: 11-advanced-mode-pdf-export
plan: 01
subsystem: ui
tags: [expo-router, react-context, tab-navigation, mode-gating, expo-print, zod, react-hook-form]

# Dependency graph
requires:
  - phase: 08-auth-shell-navigation
    provides: AuthProvider wrapping the root layout (ModeProvider sits inside AuthProvider)
  - phase: 07-project-scaffold-foundation
    provides: ModeContext.tsx, useMode hook, tab bar structure
provides:
  - ModeProvider mounted in root layout inside AuthProvider, accessible via useMode() to all screens
  - Tab bar with conditional Clients and Invoices tabs (href: null pattern hides when !isAdvanced)
  - Stub screens for /clients and /invoices routes to prevent Expo Router errors
  - All 5 Phase 11 dependencies installed and TypeScript-clean
affects:
  - 11-02-PLAN.md (Clients screen uses useMode gating)
  - 11-03-PLAN.md (Invoices screen uses useMode gating)
  - 11-04-PLAN.md (Advanced Dashboard uses useMode gating)

# Tech tracking
tech-stack:
  added:
    - expo-print ~15.0.8 (SDK 54 compatible — PDF generation for invoice export)
    - react-hook-form ^7.71.2 (form state management for client/invoice forms)
    - zod ^4.3.6 (schema validation for form inputs)
    - "@hookform/resolvers ^5.2.2 (zod adapter for react-hook-form)"
    - expo-sharing already present at ~14.0.8
  patterns:
    - "href: isAdvanced ? undefined : null — Expo Router pattern for hiding tabs without destroying routes"
    - "ModeProvider inside AuthProvider — required ordering since useUserSettings calls useAuth"
    - "Stub screens pattern — minimal SafeScreen+Text placeholder prevents Expo Router route-not-found errors before real screens are built"

key-files:
  created:
    - BalanceTracker/app/(tabs)/clients/index.tsx
    - BalanceTracker/app/(tabs)/invoices/index.tsx
  modified:
    - BalanceTracker/app/_layout.tsx
    - BalanceTracker/app/(tabs)/_layout.tsx
    - BalanceTracker/package.json

key-decisions:
  - "ModeProvider placed inside AuthProvider (not beside it) because useUserSettings calls useAuth — ordering enforces dependency"
  - "href: isAdvanced ? undefined : null hides Advanced tabs without unmounting their routes — allows instant show/hide on toggle"
  - "expo-install used for expo-print (SDK version resolution); npm install used for pure-JS libs (react-hook-form, zod, @hookform/resolvers)"

patterns-established:
  - "Conditional tab gating: href: isAdvanced ? undefined : null in Tabs.Screen options"
  - "Stub screen pattern: SafeScreen + Text placeholder until real screen is built in subsequent plans"

requirements-completed: [ADV-01]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 11 Plan 01: Advanced Mode Tab Gating Summary

**ModeProvider wired into root layout + Expo Router href:null pattern gating Clients and Invoices tabs behind isAdvanced, with 5 Phase 11 deps installed**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T10:44:40Z
- **Completed:** 2026-02-26T10:46:52Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Installed all 5 Phase 11 dependencies: expo-print, expo-sharing (already present), react-hook-form, zod, @hookform/resolvers
- ModeProvider mounted inside AuthProvider in root layout — all screens can now call useMode()
- Tab bar extended with conditional Clients and Invoices tabs that use href: null when !isAdvanced, instantly hiding them without destroying routes
- Stub screens created for /clients and /invoices to prevent Expo Router route errors before Plans 02 and 03 build real screens
- TypeScript compiles with zero errors (npx tsc --noEmit)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install new Phase 11 dependencies** - `95b3922` (chore)
2. **Task 2: Mount ModeProvider and wire conditional tab visibility** - `15da8f2` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `BalanceTracker/package.json` — expo-print, react-hook-form, zod, @hookform/resolvers added
- `BalanceTracker/package-lock.json` — lockfile updated with 4 new packages
- `BalanceTracker/app/_layout.tsx` — ModeProvider imported and wrapped around RootNavigator (inside AuthProvider)
- `BalanceTracker/app/(tabs)/_layout.tsx` — useMode imported; Clients and Invoices Tabs.Screen added with href: isAdvanced ? undefined : null
- `BalanceTracker/app/(tabs)/clients/index.tsx` — Stub screen (SafeScreen + "Clients" Text)
- `BalanceTracker/app/(tabs)/invoices/index.tsx` — Stub screen (SafeScreen + "Invoices" Text)

## Decisions Made
- ModeProvider placed inside AuthProvider (not beside it): useUserSettings calls useAuth, so ModeProvider must be a descendant of AuthProvider to avoid context errors
- href: isAdvanced ? undefined : null chosen over conditional rendering: this pattern hides the tab in the bar while keeping the route mounted and navigable, enabling instant show/hide without remounting
- expo-install used for expo-print to get the SDK 54-compatible version (15.0.8); npm install used for pure-JS libraries which don't require SDK alignment

## Deviations from Plan

None — plan executed exactly as written. The plan correctly anticipated that AuthProvider already exists (from Phase 8) and specified ModeProvider should go inside it. Tab layout already existed from Phase 8 so Task 2 modified rather than created.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 11 gating foundation is complete: ModeProvider accessible everywhere, tab bar toggles correctly
- Plan 11-02 (Clients screen) can now be executed — stub is in place, real CRUD screen goes in `app/(tabs)/clients/`
- Plan 11-03 (Invoices screen) ready — stub in place, real screen goes in `app/(tabs)/invoices/`
- expo-print, react-hook-form, zod, and @hookform/resolvers are installed and ready for Plans 02-04

---
*Phase: 11-advanced-mode-pdf-export*
*Completed: 2026-02-26*
