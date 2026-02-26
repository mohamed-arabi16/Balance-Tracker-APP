---
phase: 13-apple-hig-ui-polish
plan: 02
subsystem: ui
tags: [react-native, ios, hig, dark-mode, accessibility, nativewind, expo-router]

# Dependency graph
requires:
  - phase: 13-apple-hig-ui-polish
    plan: 01
    provides: "tokens.ts with COLORS.cellBg/groupedBg, SafeScreen grouped prop"

provides:
  - "All four list screens use iOS grouped background via SafeScreen grouped prop"
  - "All list rows are dark-mode-aware using COLORS.cellBg per colorScheme"
  - "All list rows have minHeight 44 (Apple HIG 44pt touch target)"
  - "All list rows show press opacity feedback (0.7) via Pressable style function"
  - "Transactions FAB removed — Stack.Screen headerRight '+' nav button added"
  - "ExpenseScreen no longer wraps in its own SafeScreen (uses parent TransactionsScreen wrapper)"
  - "Row separators at StyleSheet.hairlineWidth / #C6C6C8 across all four screens"
  - "StatusBadge / DebtStatusBadge hitSlop for 44pt tap target"
  - "Add buttons changed to #007AFF system blue in Debts and Assets"

affects:
  - "13-03: form dark mode screens"
  - "13-04: EmptyState polish"
  - "14-app-store-submission: final UI audit"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useColorScheme from nativewind + COLORS.cellBg for dark-mode-aware row backgrounds"
    - "Pressable style function for press opacity: ({ pressed }) => [styles.row, { backgroundColor: rowBg }, { opacity: pressed ? 0.7 : 1 }]"
    - "Stack.Screen headerRight inside screen component body for dynamic tab-aware nav button"
    - "ExpenseScreen rendered as child — parent SafeScreen provides bg (avoids nested SafeAreaView)"

key-files:
  created: []
  modified:
    - "BalanceTracker/app/(tabs)/transactions/index.tsx"
    - "BalanceTracker/app/(tabs)/transactions/expenses.tsx"
    - "BalanceTracker/app/(tabs)/debts/index.tsx"
    - "BalanceTracker/app/(tabs)/assets/index.tsx"

key-decisions:
  - "ExpenseScreen SafeScreen removed — TransactionsScreen's SafeScreen grouped wrapper is the only screen-level wrapper; avoids double safe area insets"
  - "Stack.Screen headerRight in TransactionsScreen reads activeTab state to route '+' to correct add screen (income vs expense)"
  - "Debts add button stays in ListHeaderComponent (not headerRight) — different visual positioning from Assets; only color updated to #007AFF"

patterns-established:
  - "List row dark mode: call useColorScheme at row component level, derive rowBg from COLORS.cellBg, pass as Pressable style function"
  - "Press feedback: style function with opacity: pressed ? 0.7 : 1 (no animation needed for simple rows)"
  - "Badge hitSlop: hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} on small Pressable components"

requirements-completed: [POLISH-02, POLISH-04]

# Metrics
duration: 7min
completed: 2026-02-26
---

# Phase 13 Plan 02: List Screen Polish Summary

**iOS grouped list polish across four screens — dark mode rows via COLORS.cellBg, 44pt touch targets, press opacity, FAB-to-headerRight migration for Transactions**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-26T11:54:18Z
- **Completed:** 2026-02-26T12:01:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Polished all four list screens (Transactions/Income, Transactions/Expenses, Debts, Assets) to Apple HIG grouped list standards
- Removed FAB from both income and expense screens; added `Stack.Screen headerRight` "+" button that routes to the correct add screen based on `activeTab` state
- Standardized dark mode row backgrounds using `useColorScheme` + `COLORS.cellBg` pattern across all four list screens; no more hardcoded `#ffffff` in row StyleSheets
- Added `minHeight: 44` to all list rows for Apple HIG minimum touch target compliance
- Press feedback via Pressable style function (`opacity: 0.7`) on all row types
- Separator lines updated to `StyleSheet.hairlineWidth` at `#C6C6C8` iOS system separator color
- `hitSlop` added to StatusBadge and DebtStatusBadge for expanded 44pt tap areas
- Add buttons in Debts and Assets updated from `#2563eb` to `#007AFF` iOS system blue

## Task Commits

Each task was committed atomically:

1. **Task 1: Polish Transactions screens (income + expenses) — grouped bg, dark mode, 44pt, remove FAB** - `ba2ed17` (feat)
2. **Task 2: Polish Debts and Assets screens — grouped bg, dark mode rows, 44pt touch targets** - `cde9641` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `BalanceTracker/app/(tabs)/transactions/index.tsx` — SafeScreen grouped, Stack.Screen headerRight '+' button, IncomeRow dark mode rowBg + press opacity, remove FAB styles, hairline separator (updated by prior phase 13-03/04 runs)
- `BalanceTracker/app/(tabs)/transactions/expenses.tsx` — Remove SafeScreen + FAB, add useColorScheme + COLORS, ExpenseRow dark mode rowBg + press opacity, minHeight 44, hairline separator, hitSlop on badge
- `BalanceTracker/app/(tabs)/debts/index.tsx` — SafeScreen grouped, DebtRow dark mode rowBg + press opacity, minHeight 44, hairline separator, hitSlop on DebtStatusBadge, addButton #007AFF
- `BalanceTracker/app/(tabs)/assets/index.tsx` — SafeScreen grouped, AssetRow dark mode rowBg + press opacity, minHeight 44, hairline separator updated to #C6C6C8, addButton #007AFF

## Decisions Made

- **ExpenseScreen SafeScreen removed:** `ExpenseScreen` previously wrapped its own `SafeScreen`. Since it's rendered inside `TransactionsScreen`'s `SafeScreen grouped`, a second `SafeAreaView` would produce double insets. Removed `SafeScreen` from `ExpenseScreen` — it now renders a bare `FlatList` as a child of the parent `SafeScreen`.
- **Stack.Screen headerRight reads activeTab state:** The "+" header button routes to `add-income` or `add-expense` depending on `activeTab`. This requires `Stack.Screen` inside `TransactionsScreen` where `activeTab` is in scope, not in a separate navigation config.
- **Debts add button stays in ListHeaderComponent:** Per plan note — Debts already uses a `ListHeaderComponent` header with the add button. Only color was updated to `#007AFF`. No structural change to headerRight nav button (different UI pattern from Assets).

## Deviations from Plan

None - plan executed exactly as written.

Note: `transactions/index.tsx` was already updated by a prior out-of-order execution of plans 13-03/13-04 which included Task 1 changes for this plan. The working tree correctly reflected these changes; Task 1 commit captures `expenses.tsx` which was the remaining file needing updates.

## Issues Encountered

- Plans 13-03 and 13-04 had been executed before 13-02, so `transactions/index.tsx` was already committed with the correct 13-02 changes. Execution proceeded cleanly by handling the remaining files (`expenses.tsx`, `debts/index.tsx`, `assets/index.tsx`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four list screens now use iOS grouped styling with dark mode support
- Pattern established: `useColorScheme + COLORS.cellBg` for dark-mode-aware row backgrounds — apply to any future list screens
- Phase 13-03 (form dark mode) already complete
- Phase 13-04 (EmptyState SF Symbols + Settings) already complete
- Phase 13-05 ready to execute

---
*Phase: 13-apple-hig-ui-polish*
*Completed: 2026-02-26*
