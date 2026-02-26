---
phase: 13-apple-hig-ui-polish
plan: 04
subsystem: ui
tags: [expo-symbols, sf-symbols, empty-state, ios-hig, nativewind, shadows, react-native]

# Dependency graph
requires:
  - phase: 13-01
    provides: tokens.ts with SHADOWS.card, TYPOGRAPHY, SPACING, RADIUS, COLORS constants

provides:
  - EmptyState component with optional SF Symbol icon via SymbolView (56pt, hierarchical, gray)
  - Optional ctaLabel/onCta props — info-only empty states compile without CTA button
  - Dashboard empty state with symbolName='chart.bar'
  - Income empty state with symbolName='arrow.up.circle'
  - Expenses empty state with symbolName='arrow.down.circle'
  - Debts empty state with symbolName='creditcard'
  - Assets empty state with symbolName='banknote'
  - Settings SettingsCard using SHADOWS.card (iOS-native shadow) instead of NativeWind shadow-sm

affects:
  - 13-05 (any remaining polish plans)
  - future empty states in any new list screens

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SymbolView from expo-symbols used in EmptyState component with 'as any' type assertion on name prop
    - Optional prop pattern for ctaLabel/onCta — guard with {ctaLabel && onCta ? ... : null}
    - SHADOWS.card applied via StyleSheet.create (not NativeWind className) for native iOS shadows

key-files:
  created: []
  modified:
    - BalanceTracker/src/components/ui/EmptyState.tsx
    - BalanceTracker/app/(tabs)/index.tsx
    - BalanceTracker/app/(tabs)/transactions/index.tsx
    - BalanceTracker/app/(tabs)/transactions/expenses.tsx
    - BalanceTracker/app/(tabs)/debts/index.tsx
    - BalanceTracker/app/(tabs)/assets/index.tsx
    - BalanceTracker/app/(tabs)/settings.tsx

key-decisions:
  - "EmptyState symbolName prop uses 'as any' type assertion — expo-symbols name union is extremely long; silently shows nothing for invalid names so type safety tradeoff is acceptable"
  - "Settings SettingsCard: StyleSheet.create({ card: SHADOWS.card }) pattern used to apply shadow object as StyleSheet style — avoids spreading SHADOWS.card inline on every card"

patterns-established:
  - "SF Symbol in EmptyState: always 56pt, hierarchical type, #9ca3af tint for secondary visual weight"
  - "Optional CTA pattern: {ctaLabel && onCta ? <Button /> : null} — both props required together or neither"

requirements-completed: [POLISH-05, POLISH-04]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 13 Plan 04: EmptyState SF Symbol Icons + Settings Card Shadows Summary

**SymbolView SF Symbol icons (56pt) added to all 5 screen EmptyState components; EmptyState ctaLabel/onCta made optional; Settings SettingsCard upgraded from NativeWind shadow-sm to SHADOWS.card**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T11:14:31Z
- **Completed:** 2026-02-26T11:16:49Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- EmptyState upgraded: SymbolView import, optional symbolName prop renders 56pt SF Symbol above title, ctaLabel/onCta are optional with null-safe handlePress
- All 5 list screens pass symbolName prop: chart.bar (dashboard), arrow.up.circle (income), arrow.down.circle (expenses), creditcard (debts), banknote (assets)
- Settings SettingsCard component upgraded from NativeWind shadow-sm to SHADOWS.card via StyleSheet.create for proper iOS native shadows on physical devices
- TypeScript compiles clean (0 errors) across all 7 modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade EmptyState with optional SF Symbol icon and optional CTA props** - `de2a6f1` (feat)
2. **Task 2: Add symbolName to all empty states and polish Settings screen cards** - `36cc2f3` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `BalanceTracker/src/components/ui/EmptyState.tsx` - Added SymbolView import; optional symbolName/ctaLabel/onCta props; SF Symbol renders above title; CTA button conditionally rendered
- `BalanceTracker/app/(tabs)/index.tsx` - Dashboard EmptyState gets symbolName="chart.bar"
- `BalanceTracker/app/(tabs)/transactions/index.tsx` - Income EmptyState gets symbolName="arrow.up.circle"
- `BalanceTracker/app/(tabs)/transactions/expenses.tsx` - Expenses EmptyState gets symbolName="arrow.down.circle"
- `BalanceTracker/app/(tabs)/debts/index.tsx` - Debts EmptyState gets symbolName="creditcard"
- `BalanceTracker/app/(tabs)/assets/index.tsx` - Assets EmptyState gets symbolName="banknote"
- `BalanceTracker/app/(tabs)/settings.tsx` - Import StyleSheet + SHADOWS; SettingsCard uses cardStyles.card (SHADOWS.card) not shadow-sm

## Decisions Made
- EmptyState symbolName prop uses `as any` type assertion on SymbolView's `name` prop — the expo-symbols name union is extremely long and using `as any` avoids TS errors without meaningful safety risk (expo-symbols silently shows nothing for invalid names)
- SettingsCard shadow: used `StyleSheet.create({ card: SHADOWS.card })` pattern to apply the shadow object as a named style — cleaner than inline style spread and consistent with Phase 13 shadow token pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all changes applied cleanly, TypeScript compiles with 0 errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All EmptyState components now have SF Symbol icons matching their content type — visually complete Apple HIG empty states
- EmptyState is now flexible (optional CTA) for future info-only screens
- Settings screen sections use proper iOS native shadows
- Ready for any remaining Phase 13 polish plans (13-05 if it exists)

## Self-Check: PASSED

All 7 modified files confirmed present on disk. Both task commits (de2a6f1, 36cc2f3) confirmed in git log.

---
*Phase: 13-apple-hig-ui-polish*
*Completed: 2026-02-26*
