---
phase: 12-app-store-compliance-submission
plan: 02
subsystem: infra
tags: [eas, expo, ios, app-store, bundle-identifier, eas-cli, assets]

# Dependency graph
requires:
  - phase: 12-app-store-compliance-submission
    provides: Phase 12 Plan 01 - delete_user_data RPC, Delete Account, Privacy Policy, reset-password screen
provides:
  - EAS production build profile (eas.json) with distribution store + autoIncrement
  - app.json with ios.bundleIdentifier com.balancetracker.app, version 1.0.0, buildNumber 1
  - App Store-quality assets: icon.png (1024x1024), splash.png (1284x2778), adaptive-icon.png (1024x1024)
  - EAS CLI v18.0.5 installed globally
affects:
  - 12-03 (TestFlight upload and App Store Connect submission)

# Tech tracking
tech-stack:
  added: [eas-cli v18.0.5]
  patterns: [EAS build profiles (development/preview/production), placeholder credentials pattern for submit config]

key-files:
  created:
    - BalanceTracker/eas.json
    - BalanceTracker/assets/splash.png
    - BalanceTracker/assets/adaptive-icon.png
  modified:
    - BalanceTracker/app.json

key-decisions:
  - "com.balancetracker.app chosen as bundle identifier — must not be changed after first App Store submission"
  - "splash.png created at 1284x2778 (iPhone 14 Pro Max) with icon centered on white background using ImageMagick"
  - "adaptive-icon.png copied from icon.png (1024x1024) as Android adaptive icon foreground"
  - "eas.json submit section uses placeholder strings (appleId, ascAppId, appleTeamId) — user fills before eas submit"
  - "eas init deferred to Plan 03 — requires eas login authentication first; projectId placeholder left in app.json extra.eas"
  - "Android adaptive icon config simplified to single foregroundImage + backgroundColor — prior multi-image config was not standard"

patterns-established:
  - "EAS build profiles: development (devClient/internal), preview (internal/no-simulator), production (store/Release)"
  - "app.json extra.eas.projectId placeholder pattern — filled after eas init"

requirements-completed: [STORE-03]

# Metrics
duration: 8min
completed: 2026-02-26
---

# Phase 12 Plan 02: EAS Build Configuration and App Store Assets Summary

**EAS production build profile with distribution:store configured, com.balancetracker.app bundle ID set, and 1024x1024 icon + 1284x2778 splash assets in place for App Store submission**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-26T12:37:16Z
- **Completed:** 2026-02-26T12:45:00Z
- **Tasks:** 2
- **Files modified:** 4 (1 modified, 3 created)

## Accomplishments
- Configured `app.json` with all App Store-required fields: bundleIdentifier, buildNumber, version, infoPlist, android package
- Created `eas.json` with development/preview/production build profiles and submit section with placeholder credentials
- Created `assets/splash.png` (1284x2778, iPhone 14 Pro Max) and `assets/adaptive-icon.png` (1024x1024) using ImageMagick
- Installed EAS CLI v18.0.5 globally — `eas build --platform ios --profile production` ready to run after auth

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure app.json identity and install EAS CLI** - `d4c3782` (chore)
2. **Task 2: Create app icon + splash assets and configure eas.json** - `bcef34b` (chore)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `BalanceTracker/app.json` - Updated with bundleIdentifier, buildNumber, ios/android config, extra.eas, plugins
- `BalanceTracker/eas.json` - EAS build config: development/preview/production profiles + submit credentials
- `BalanceTracker/assets/splash.png` - 1284x2778 splash screen (white bg, icon centered, iPhone 14 Pro Max size)
- `BalanceTracker/assets/adaptive-icon.png` - 1024x1024 Android adaptive icon foreground (copy of icon.png)

## Decisions Made
- `com.balancetracker.app` chosen as bundle identifier — must remain unchanged after first App Store submission
- `eas.json` `submit` section uses placeholder strings — user fills `appleId`, `ascAppId`, `appleTeamId` before running `eas submit`. EAS also reads from env vars `EXPO_APPLE_ID`, `EXPO_APPLE_TEAM_ID`
- `eas init` deferred to Plan 03 (requires `eas login` first). `extra.eas.projectId` left as placeholder `"YOUR_EAS_PROJECT_ID"` in app.json until user runs `eas init`
- Android adaptive icon simplified from the prior 3-file config (foreground/background/monochrome) to standard `foregroundImage` + `backgroundColor` pattern matching app.json spec
- `splash.png` generated from existing `icon.png` (1024x1024, already branded) at 1284x2778 using ImageMagick composite

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] splash.png and adaptive-icon.png were missing despite being referenced in app.json**
- **Found during:** Task 2 (asset verification)
- **Issue:** app.json referenced `assets/splash.png` and `assets/adaptive-icon.png` but only `assets/splash-icon.png` existed; Expo build would fail
- **Fix:** Created `splash.png` (1284x2778) using ImageMagick composite from existing icon.png; copied icon.png as adaptive-icon.png
- **Files modified:** assets/splash.png (new), assets/adaptive-icon.png (new)
- **Verification:** `identify assets/splash.png` → 1284x2778 PNG; `identify assets/adaptive-icon.png` → 1024x1024 PNG
- **Committed in:** bcef34b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug/missing required asset)
**Impact on plan:** Essential fix — Expo build would fail without the referenced assets. No scope creep.

## Issues Encountered
- `convert` (ImageMagick v6 alias) showed deprecation warning on macOS with IMv7 — used `convert` command anyway (works correctly despite the warning). Using `magick` is the IMv7 canonical form.

## User Setup Required

Before running `eas build --platform ios --profile production`, the user must:

1. **Authenticate with EAS:**
   ```bash
   eas login
   ```

2. **Link project to EAS (generates real projectId):**
   ```bash
   cd BalanceTracker && eas init
   ```
   This replaces `YOUR_EAS_PROJECT_ID` in `app.json` extra.eas.projectId.

3. **Before running `eas submit` (Plan 03), fill in eas.json submit section:**
   - `appleId` — your Apple ID email
   - `ascAppId` — App Store Connect app ID (from App Store Connect dashboard)
   - `appleTeamId` — your Apple Developer Team ID

   Alternatively set environment variables: `EXPO_APPLE_ID`, `EXPO_APPLE_TEAM_ID`

4. **Optional — replace placeholder assets with final branded versions:**
   - `assets/icon.png` (1024x1024) — already uses existing branded icon
   - `assets/splash.png` (1284x2778) — generated from icon; replace with final design if needed

## Next Phase Readiness
- Plan 12-03 (TestFlight upload + App Store submission) is unblocked
- User needs to run `eas login` + `eas init` + enroll in Apple Developer Program before `eas build` can complete
- Apple Developer Program enrollment (STORE-02) was covered in Phase 12 Plan 01

---
*Phase: 12-app-store-compliance-submission*
*Completed: 2026-02-26*

## Self-Check: PASSED

- FOUND: BalanceTracker/eas.json
- FOUND: BalanceTracker/app.json
- FOUND: BalanceTracker/assets/icon.png
- FOUND: BalanceTracker/assets/splash.png
- FOUND: BalanceTracker/assets/adaptive-icon.png
- FOUND: .planning/phases/12-app-store-compliance-submission/12-02-SUMMARY.md
- FOUND: commit d4c3782 (Task 1)
- FOUND: commit bcef34b (Task 2)
