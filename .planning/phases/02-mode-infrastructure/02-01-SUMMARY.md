---
phase: 02-mode-infrastructure
plan: 01
subsystem: ui
tags: [react, context, react-query, typescript, routing]

# Dependency graph
requires:
  - phase: 01-database-type-foundation
    provides: UserSettingsRow type with app_mode field, useUserSettings hook with updateSettings

provides:
  - ModeProvider and useMode hook for global app_mode state (simple/advanced)
  - AdvancedRoute guard that blocks simple-mode users from advanced pages
  - queryKeys factory with centralized cache key management for all hooks

affects:
  - 02-02 (mode toggle UI — needs ModeProvider and useMode)
  - 03-client-management (needs AdvancedRoute and queryKeys.clients)
  - all future hooks in Phase 3+ that use queryKeys factory

# Tech tracking
tech-stack:
  added: []
  patterns: [DB-synced context pattern (mirrors ThemeContext), route guard pattern (mirrors ProtectedRoute), centralized query key factory]

key-files:
  created:
    - src/contexts/ModeContext.tsx
    - src/components/AdvancedRoute.tsx
    - src/lib/queryKeys.ts
  modified: []

key-decisions:
  - "No localStorage for mode — no flash risk because default 'simple' is the safe state"
  - "No isLoading guard in AdvancedRoute — cold-cache flash deferred until it becomes a real user issue"
  - "Existing hooks not migrated to queryKeys — only new Phase 3+ hooks use factory from day one"

patterns-established:
  - "DB-synced context: useEffect on settings?.field syncs local state from DB; setX() calls updateSettings for optimistic persistence"
  - "Route guard: check boolean from context, return Navigate on false, return children fragment on true"
  - "queryKeys factory: (userId: string) => ['key', userId] as const for all query cache keys"

requirements-completed: [MODE-01, MODE-03, MODE-04]

# Metrics
duration: 1min
completed: 2026-02-23
---

# Phase 02 Plan 01: Mode Infrastructure Foundation Summary

**ModeContext (DB-synced app_mode), AdvancedRoute guard (redirects to / for simple mode), and queryKeys factory (7 cache key factories for Phase 3+ hooks)**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-23T18:12:21Z
- **Completed:** 2026-02-23T18:13:22Z
- **Tasks:** 2
- **Files modified:** 3 (all new, no existing files changed)

## Accomplishments

- ModeContext following exact ThemeContext pattern — useEffect on `settings?.app_mode` syncs from DB, setMode() calls updateSettings for optimistic persistence with automatic rollback on failure
- AdvancedRoute guard that mirrors ProtectedRoute structure — returns `<Navigate to="/" replace />` when `isAdvanced` is false
- queryKeys factory with 7 factories (userSettings, assets, incomes, expenses, debts, clients, invoices) ensuring cache key consistency across all current and future hooks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ModeContext with DB-synced mode state** - `3acfd1b` (feat)
2. **Task 2: Create AdvancedRoute guard and queryKeys factory** - `51953c6` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/contexts/ModeContext.tsx` — AppMode type, ModeProvider with DB sync via useEffect, useMode hook
- `src/components/AdvancedRoute.tsx` — Route guard redirecting simple-mode users to /
- `src/lib/queryKeys.ts` — Centralized query key factory with 7 keys for all hook types

## Decisions Made

- No localStorage for mode (default 'simple' is the safe state — no risk of showing advanced UI on cold load)
- No isLoading guard in AdvancedRoute (deferred until cold-cache flash becomes a real user issue, per research decision)
- Existing hooks (useAssets, useIncomes, etc.) not migrated to queryKeys now — new Phase 3+ hooks use factory from day one

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ModeProvider ready to be added to App.tsx provider tree (done in 02-02)
- AdvancedRoute ready to wrap advanced page routes (done when those pages are created)
- queryKeys factory ready for all Phase 3+ hooks
- No blockers for Phase 02 Plan 02

---
*Phase: 02-mode-infrastructure*
*Completed: 2026-02-23*
