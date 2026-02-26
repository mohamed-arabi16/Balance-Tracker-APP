---
phase: 13-apple-hig-ui-polish
plan: "01"
subsystem: ui
tags: [react-native, nativewind, design-tokens, ios-hig, shadow, typography, spacing, activityindicator]

# Dependency graph
requires:
  - phase: 10-dashboard-csv-export
    provides: IncomeExpenseChart with Victory Native (chart component being polished)
  - phase: 07-project-scaffold-foundation
    provides: SafeScreen layout wrapper (extended with grouped prop)
provides:
  - Design token constants (SHADOWS, TYPOGRAPHY, SPACING, RADIUS, COLORS) at src/lib/tokens.ts
  - iOS-native card shadows on all three dashboard card components
  - SafeScreen grouped background variant for iOS grouped list screens
  - ActivityIndicator loading state on Dashboard screen
  - "Overview" and "Summary" section headers on Dashboard
affects: [14-apple-hig-ui-polish, all dashboard components, all screens using SafeScreen]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SHADOWS.card from tokens spread into StyleSheet style prop (not NativeWind className) for true iOS native shadows"
    - "style={[existingStyle, SHADOWS.card]} array merge for components with existing StyleSheet styles"
    - "SafeScreen grouped prop pattern for iOS system grouped background variant"

key-files:
  created:
    - BalanceTracker/src/lib/tokens.ts
  modified:
    - BalanceTracker/src/components/dashboard/NetWorthCard.tsx
    - BalanceTracker/src/components/dashboard/FinancialSummaryCard.tsx
    - BalanceTracker/src/components/dashboard/IncomeExpenseChart.tsx
    - BalanceTracker/src/components/layout/SafeScreen.tsx
    - BalanceTracker/app/(tabs)/index.tsx

key-decisions:
  - "SHADOWS.card applied via style prop (not className) — NativeWind shadow-sm does NOT produce iOS native shadows on physical devices"
  - "style={[borderStyle, SHADOWS.card]} array merge in FinancialSummaryCard to preserve borderLeft color while adding shadow"
  - "SafeScreen grouped prop uses inline hex values (#F2F2F7 / #1C1C1E) matching UIKit system grouped colors"
  - "ActivityIndicator color hardcoded to #007AFF (iOS tint) — matches COLORS.tint token"

patterns-established:
  - "Token import pattern: import { SHADOWS } from '@/lib/tokens' — all dashboard polish plans use this"
  - "Style array merge: style={[existingStyleObject, SHADOWS.card]} for components with pre-existing style props"
  - "Section header pattern: text-xs font-semibold uppercase tracking-wider for iOS HIG list section headers"

requirements-completed: [POLISH-01, POLISH-04]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 13 Plan 01: Apple HIG UI Polish — Design Tokens + Dashboard Polish Summary

**iOS design token system (SHADOWS, TYPOGRAPHY, SPACING, RADIUS, COLORS) with native card shadows on all three dashboard card components and ActivityIndicator loading state replacing bare Text**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-26T11:49:02Z
- **Completed:** 2026-02-26T11:51:15Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created src/lib/tokens.ts with five design token constant groups (SHADOWS, TYPOGRAPHY, SPACING, RADIUS, COLORS) following Apple HIG specifications
- Applied SHADOWS.card (iOS-native shadow props) to NetWorthCard, FinancialSummaryCard, and IncomeExpenseChart — replacing non-functional NativeWind shadow-sm classes
- Extended SafeScreen with grouped?: boolean prop that switches background to iOS system grouped color (#F2F2F7 light / #1C1C1E dark)
- Upgraded Dashboard loading state from bare `<Text>Loading...</Text>` to ActivityIndicator with descriptive caption
- Added "Overview" and "Summary" section headers to Dashboard screen following iOS HIG grouped list pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/lib/tokens.ts design token file** - `b8470cf` (feat)
2. **Task 2: Polish dashboard cards with iOS shadows and upgrade SafeScreen + loading state** - `d990425` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified
- `BalanceTracker/src/lib/tokens.ts` - Design token constants: SHADOWS (iOS native), TYPOGRAPHY (HIG scale), SPACING (8pt grid), RADIUS, COLORS (UIKit semantics)
- `BalanceTracker/src/components/dashboard/NetWorthCard.tsx` - Replaced shadow-sm with SHADOWS.card style prop
- `BalanceTracker/src/components/dashboard/FinancialSummaryCard.tsx` - Merged SHADOWS.card with existing borderLeft style array
- `BalanceTracker/src/components/dashboard/IncomeExpenseChart.tsx` - Added SHADOWS.card to empty state view and chart container view
- `BalanceTracker/src/components/layout/SafeScreen.tsx` - Added grouped?: boolean prop with iOS system grouped background
- `BalanceTracker/app/(tabs)/index.tsx` - ActivityIndicator loading state, "Overview" and "Summary" section headers

## Decisions Made
- Used style prop (not NativeWind className) for shadows because NativeWind shadow-sm/md utilities do NOT produce iOS native shadows on physical devices — they only work in web/Expo web preview
- FinancialSummaryCard uses style array merge `[borderStyle, SHADOWS.card]` to preserve the colored left border while adding shadow
- SafeScreen grouped uses literal hex values instead of COLORS token to avoid requiring useColorScheme() hook inside the component

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Design token foundation in place — all subsequent Phase 13 plans can import from @/lib/tokens
- SafeScreen grouped prop ready for any screen needing iOS grouped list appearance
- Dashboard polish baseline established; Phase 13 Plan 02 can continue with forms/modals polish

## Self-Check: PASSED

All files verified present on disk:
- FOUND: BalanceTracker/src/lib/tokens.ts
- FOUND: BalanceTracker/src/components/dashboard/NetWorthCard.tsx
- FOUND: BalanceTracker/src/components/dashboard/FinancialSummaryCard.tsx
- FOUND: BalanceTracker/src/components/dashboard/IncomeExpenseChart.tsx
- FOUND: BalanceTracker/src/components/layout/SafeScreen.tsx
- FOUND: BalanceTracker/app/(tabs)/index.tsx

All commits verified in git log:
- FOUND: b8470cf (Task 1: tokens.ts)
- FOUND: d990425 (Task 2: dashboard polish)

TypeScript: 0 errors (npx tsc --noEmit clean)

---
*Phase: 13-apple-hig-ui-polish*
*Completed: 2026-02-26*
