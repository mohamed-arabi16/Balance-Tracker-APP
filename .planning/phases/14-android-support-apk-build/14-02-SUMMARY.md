---
phase: 14-android-support-apk-build
plan: 02
subsystem: ui
tags: [expo-symbols, ionicons, android, cross-platform, tab-bar, empty-state]

# Dependency graph
requires:
  - phase: 13-apple-hig-ui-polish
    provides: EmptyState component with SymbolView, tab bar icons using SymbolView in _layout.tsx
  - phase: 07-project-scaffold-foundation
    provides: "@expo/vector-icons bundled in Expo — Ionicons available without additional install"
provides:
  - TabIcon wrapper component (SymbolView + Ionicons fallback) for cross-platform tab icons
  - iconMap.ts with SF_TO_IONICONS map (12 entries) and getIoniconsName() helper
  - EmptyState with Ionicons fallback on SymbolView for Android/Web rendering
affects:
  - phase: 14-android-support-apk-build (plan 01 — APK build verification will show icons rendering on Android)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SymbolView fallback prop pattern: pass Ionicons as fallback prop to SymbolView — iOS gets SF Symbol quality, Android/Web gets Ionicons via official expo-symbols fallback mechanism"
    - "iconMap.ts centralized mapping: single source of truth for SF Symbol → Ionicons name translation, reused by TabIcon and EmptyState"

key-files:
  created:
    - BalanceTracker/src/lib/iconMap.ts
    - BalanceTracker/src/components/ui/TabIcon.tsx
  modified:
    - BalanceTracker/app/(tabs)/_layout.tsx
    - BalanceTracker/src/components/ui/EmptyState.tsx

key-decisions:
  - "TabIcon uses SymbolView fallback prop (not Platform.select or Platform.OS check) — official expo-symbols solution, zero callsite complexity, iOS SF Symbol quality preserved"
  - "iconMap.ts centralizes all SF→Ionicons mappings to keep TabIcon and EmptyState DRY — single file to update when new icons are added"
  - "Direct SymbolView import removed from _layout.tsx — TabIcon fully encapsulates cross-platform rendering logic"

patterns-established:
  - "Cross-platform icon pattern: wrap SymbolView with fallback prop rather than Platform.select — use this pattern for any new SF Symbol usage"
  - "iconMap as single source of truth: add new SF→Ionicons mappings to SF_TO_IONICONS before creating new icon usages"

requirements-completed:
  - DROID-01
  - DROID-02

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 14 Plan 02: Android Icon Fallbacks Summary

**TabIcon wrapper and iconMap created using SymbolView fallback prop — tab bar icons and EmptyState illustrations now render on Android via Ionicons fallback with zero iOS regression**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T12:51:05Z
- **Completed:** 2026-02-26T12:52:52Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `src/lib/iconMap.ts` with 12 SF Symbol → Ionicons mappings covering all tab bar and EmptyState icons
- Created `src/components/ui/TabIcon.tsx` using SymbolView fallback prop pattern — iOS gets SF Symbols, Android/Web gets Ionicons
- Updated `app/(tabs)/_layout.tsx` to use TabIcon for all 7 Tabs.Screen entries, removing bare SymbolView import
- Updated `src/components/ui/EmptyState.tsx` to include Ionicons fallback on SymbolView, covering all 5 symbolName callsites

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TabIcon wrapper and iconMap, update _layout.tsx** - `18bc05c` (feat)
2. **Task 2: Add Ionicons fallback to EmptyState SymbolView** - `0c93f40` (feat)

**Plan metadata:** `(docs commit follows)`

## Files Created/Modified
- `BalanceTracker/src/lib/iconMap.ts` - SF_TO_IONICONS map (12 entries) + getIoniconsName() helper function
- `BalanceTracker/src/components/ui/TabIcon.tsx` - Cross-platform tab icon: SymbolView primary, Ionicons fallback
- `BalanceTracker/app/(tabs)/_layout.tsx` - All 7 tabBarIcon entries replaced with TabIcon, bare SymbolView import removed
- `BalanceTracker/src/components/ui/EmptyState.tsx` - Added Ionicons fallback prop to SymbolView, added two new imports

## Decisions Made
- Used SymbolView's `fallback` prop (the official expo-symbols API) rather than Platform.select — this is zero-overhead and preserves SF Symbol quality on iOS with no conditional rendering logic
- `iconMap.ts` centralized as a shared module rather than inlining mappings in each component — keeps TabIcon and EmptyState DRY, single update point when adding icons
- Removed direct SymbolView import from `_layout.tsx` entirely — TabIcon fully encapsulates the cross-platform concern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Android icon fallbacks complete — tab bar and EmptyState illustrations will render correctly on Android builds
- Plan 14-01 (APK build verification) can now run — icons will display via Ionicons fallback on Android device/emulator
- iOS rendering unchanged — SymbolView still primary renderer, fallback only activates on non-iOS platforms

## Self-Check: PASSED

All files verified present. All task commits verified in git log.

---
*Phase: 14-android-support-apk-build*
*Completed: 2026-02-26*
