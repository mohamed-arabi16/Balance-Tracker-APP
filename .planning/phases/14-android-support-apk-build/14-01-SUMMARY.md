---
phase: 14-android-support-apk-build
plan: 01
subsystem: infra
tags: [expo, android, eas-build, expo-system-ui, dark-mode, apk, aab]

# Dependency graph
requires:
  - phase: 12-app-store-compliance-submission
    provides: eas.json base config with production iOS profile and app.json bundleIdentifier

provides:
  - expo-system-ui installed and registered as plugin — enables userInterfaceStyle: automatic on Android
  - androidStatusBar config in app.json — translucent true, barStyle auto for SDK 54 edge-to-edge
  - eas.json preview.android.buildType: apk — enables APK sideload testing on Android devices
  - eas.json production.android.buildType: app-bundle — enables Play Store AAB submission
  - eas.json cli.version updated to >= 16.0.0

affects:
  - 14-02-android-dark-mode-tokens
  - 14-03-android-ci-verification

# Tech tracking
tech-stack:
  added:
    - expo-system-ui ~6.0.9 (SDK 54 pinned)
  patterns:
    - expo-system-ui plugin registration pattern — required for userInterfaceStyle: automatic to work on Android
    - androidStatusBar.translucent: true pattern for SDK 54 edge-to-edge Android 16 support
    - eas.json per-platform buildType pattern — ios and android objects inside each build profile

key-files:
  created: []
  modified:
    - BalanceTracker/package.json — expo-system-ui ~6.0.9 added to dependencies
    - BalanceTracker/package-lock.json — lockfile updated
    - BalanceTracker/app.json — androidStatusBar block added, expo-system-ui added to plugins array
    - BalanceTracker/eas.json — Android APK/AAB build profiles added, cli.version updated to >= 16.0.0

key-decisions:
  - "expo-system-ui ~6.0.9 installed via npx expo install for SDK 54 pinning — not npm install"
  - "androidStatusBar placed at same level as android and ios (not nested inside android) — correct app.json schema"
  - "cli.version updated from >= 12.0.0 to >= 16.0.0 — matches current EAS CLI release track"

patterns-established:
  - "Android-first eas.json pattern: every build profile has both ios and android entries"
  - "expo-system-ui plugin pattern: required in plugins array for dark mode to activate on Android"

requirements-completed: [DROID-03, DROID-04, DROID-05]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 14 Plan 01: Android Support APK Build Summary

**expo-system-ui installed and registered, androidStatusBar translucent config added, eas.json extended with Android APK preview and AAB production profiles**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T12:50:55Z
- **Completed:** 2026-02-26T12:52:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed expo-system-ui ~6.0.9 (SDK 54 pinned via `npx expo install`) — without this, `userInterfaceStyle: automatic` is silently ignored on Android and dark mode never activates
- Added `androidStatusBar` block to app.json (`barStyle: auto`, `translucent: true`) for correct edge-to-edge behavior on SDK 54 / Android 16
- Extended eas.json with `preview.android.buildType: apk` (APK sideload) and `production.android.buildType: app-bundle` (Play Store AAB); updated cli.version to >= 16.0.0

## Task Commits

Each task was committed atomically:

1. **Task 1: Install expo-system-ui and update app.json Android config** - `f089a90` (feat)
2. **Task 2: Update eas.json with Android APK preview profile and correct CLI version** - `b35d181` (feat)

## Files Created/Modified

- `BalanceTracker/package.json` - expo-system-ui ~6.0.9 added to dependencies
- `BalanceTracker/package-lock.json` - lockfile updated after npm install
- `BalanceTracker/app.json` - androidStatusBar block added (barStyle: auto, translucent: true); expo-system-ui added to plugins array
- `BalanceTracker/eas.json` - cli.version >= 16.0.0; preview.android.buildType: apk; production.android.buildType: app-bundle

## Decisions Made

- Used `npx expo install expo-system-ui` (not bare `npm install`) to get the SDK 54-pinned version ~6.0.9 instead of latest
- `androidStatusBar` added as sibling of `android`/`ios` at the expo object level — this is the correct app.json schema position (not nested inside `android`)
- cli.version bumped from >= 12.0.0 to >= 16.0.0 matching current EAS CLI stable release

## Deviations from Plan

None — plan executed exactly as written.

The existing plugins array in app.json had 5 entries (plan showed 6 with expo-symbols). This is a pre-existing condition; expo-symbols is in package.json dependencies and does not require plugin registration. No deviation action was taken.

## Issues Encountered

None — both tasks completed cleanly on first attempt.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Android build infrastructure is fully configured — EAS can now produce APK (preview) and AAB (production) for Android
- expo-system-ui plugin registered — dark mode NativeWind dark: classes will respond to device setting on Android after native rebuild
- 14-02 (Android dark mode token verification) is unblocked
- 14-03 (Android CI verification / EAS build trigger) is unblocked

---
*Phase: 14-android-support-apk-build*
*Completed: 2026-02-26*
