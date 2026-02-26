---
phase: 02-mode-infrastructure
plan: 03
subsystem: ui
tags: [react, sidebar, settings, mode-toggle, i18n, lucide-react]

# Dependency graph
requires:
  - phase: 02-01
    provides: ModeContext (useMode, setMode, isAdvanced, isUpdating, AppMode type)

provides:
  - Sidebar mode toggle button (visible from every page, disabled during isUpdating)
  - Sidebar advanced nav section (Advanced Dashboard, Clients, Invoices) conditional on isAdvanced
  - Settings Mode Card with Select (simple/advanced), calls setMode() from ModeContext directly
  - Mode translation keys (EN + AR) in i18n/index.ts

affects:
  - Phase 3 (Client management — Clients nav item now present in Advanced mode)
  - Phase 4 (Invoices — Invoices nav item now present in Advanced mode)
  - Phase 5 (Invoices UI — mode switching already wired up)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional nav section pattern: isAdvanced guard wrapping Separator + advanced nav items"
    - "Mode toggle in sidebar footer: single BarChart3 icon button, disabled during mutation"
    - "setMode() called directly from ModeContext in Settings — never via persistSettings wrapper"

key-files:
  created: []
  modified:
    - src/components/layout/Sidebar.tsx
    - src/pages/Settings.tsx
    - src/i18n/index.ts

key-decisions:
  - "sidebarItems array moved inside Sidebar function body — required for hook access (useMode needs to be called inside component)"
  - "Mode toggle uses setMode() from ModeContext directly; Settings Mode Card also calls setMode() directly (not persistSettings) to avoid double-persist and double toast"

patterns-established:
  - "Advanced nav items always rendered below a Separator in a conditional isAdvanced block"
  - "Mode toggle button disabled={isUpdating} to prevent double-click mutations"

requirements-completed: [MODE-01, MODE-02]

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 2 Plan 03: Mode UI Entry Points Summary

**Sidebar mode toggle button + advanced nav section (Advanced Dashboard/Clients/Invoices) wired to ModeContext, plus Settings Mode Card with Simple/Advanced Select — full mode infrastructure now usable from UI**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T18:16:10Z
- **Completed:** 2026-02-23T18:18:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Sidebar now shows a mode toggle button (BarChart3 icon) in the footer, visible from every page, disabled during isUpdating
- Advanced mode shows 3 additional nav items (Advanced Dashboard, Clients, Invoices) below a Separator — zero regression to Simple mode
- Settings page has a Mode Card between Language and Data Export with a Select for simple/advanced, calling setMode() from ModeContext directly
- Added all mode-related translation keys (EN + AR): mode.switchToAdvanced, mode.switchToSimple, nav.advanced.dashboard, nav.clients, nav.invoices, settings.modeTitle, settings.modeDescription, settings.modeLabel, settings.mode.simple, settings.mode.advanced

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Sidebar with mode toggle and advanced nav section** - `1f9c8ce` (feat)
2. **Task 2: Add Mode preference Card to Settings.tsx** - `55b002b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/layout/Sidebar.tsx` - Added useMode hook, moved sidebarItems inside function, added advancedItems array, conditional advanced nav section with Separator, mode toggle button in footer
- `src/pages/Settings.tsx` - Added useMode import + call, Layers icon import, Mode Card between Language and Data Export cards
- `src/i18n/index.ts` - Added mode-related translation keys in both EN and AR sections

## Decisions Made

- `sidebarItems` array must be inside the component function body so `useMode()` can be called as a hook. Array content is byte-for-byte identical to the original module-level version.
- Settings Mode Card calls `setMode()` from `useMode()` directly — NOT through the `persistSettings` wrapper — to avoid double-persisting the value and showing two success toasts (ModeContext.setMode already calls updateSettings internally).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added mode/nav translation keys to i18n/index.ts**
- **Found during:** Task 1 (Sidebar extension)
- **Issue:** Translation keys used in Sidebar (`mode.switchToAdvanced`, `mode.switchToSimple`, `nav.advanced.dashboard`, `nav.clients`, `nav.invoices`) and Settings (`settings.modeTitle`, `settings.modeDescription`, `settings.modeLabel`, `settings.mode.simple`, `settings.mode.advanced`) were absent from i18n/index.ts. Without these keys, all mode-related UI labels would render as raw key strings.
- **Fix:** Added all 10 missing keys to both EN and AR translation sections in src/i18n/index.ts
- **Files modified:** src/i18n/index.ts
- **Verification:** TypeScript compiles cleanly; build succeeds; keys present in both EN and AR sections
- **Committed in:** 1f9c8ce (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical)
**Impact on plan:** Auto-fix necessary for UI correctness — raw translation keys would be displayed without it. No scope creep.

## Issues Encountered

None — plan executed cleanly once translation keys were added.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full mode infrastructure is complete and testable: ModeContext (02-01), AdvancedRoute guard (02-01), Sidebar toggle (02-03), Settings preference (02-03)
- Phase 3 (Client Management) can begin — Clients nav item is already visible in Advanced mode
- Phase 4 (Invoice Management) can follow — Invoices nav item is already visible in Advanced mode

## Self-Check: PASSED

- FOUND: src/components/layout/Sidebar.tsx
- FOUND: src/pages/Settings.tsx
- FOUND: src/i18n/index.ts
- FOUND: .planning/phases/02-mode-infrastructure/02-03-SUMMARY.md
- FOUND commit: 1f9c8ce (Task 1)
- FOUND commit: 55b002b (Task 2)
- TypeScript: PASS (zero errors)
- Build: PASS (npm run build succeeded)

---
*Phase: 02-mode-infrastructure*
*Completed: 2026-02-23*
