# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26 after v2.0 milestone start)

**Core value:** Anyone can track their money simply — and freelancers can manage their business without switching apps.
**Current focus:** v2.0 iOS Native App — Phase 7: Project Scaffold + Foundation

## Current Position

Milestone: v2.0 iOS Native App
Phase: 7 of 12 (Project Scaffold + Foundation)
Plan: 3 of 3 in Phase 7 (COMPLETE)
Status: Phase 7 complete
Last activity: 2026-02-26 — 07-03 complete: UX foundation components, i18n init, ThemeContext

Progress: [██████████░░░░░░░░░░] 50% (6/12 phases complete, v1.0+v1.1)

## Performance Metrics

**Velocity (v1.0 + v1.1):**
- Total plans completed: 23
- Average duration: human-gated (verification plans) + ~2 min (implementation plans)
- Total execution time: ~36 min (automated) + human-gated checkpoints

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Database & Type Foundation | 3/3 | 6 min + human-gated | human-gated |
| 2. Mode Infrastructure | 4/4 | 7 min | 1.75 min |
| 3. Client Management | 3/3 | ~5 min + human-verify | human-gated |
| 4. Transaction-Client Linking | 4/4 | ~7 min + human-verify | human-gated |
| 5. Invoices & PDF Export | 7/7 | 14 min + human-verify | human-gated |
| 6. Advanced Dashboard | 2/2 | 2 min + human-verify | human-gated |

**Recent Trend:**
- Last 5 plans: 05-04 (2 min), 05-05 (2 min), 05-06 (3 min), 06-01 (2 min), 06-02 (human-gated)
- Trend: Fast (UI pages follow established patterns)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key decisions for v2.0:

- [v2.0 Roadmap]: expo-print + expo-sharing replaces @react-pdf/renderer (browser-only, crashes RN) — used in Phase 11
- [v2.0 Roadmap]: RTL requires app restart on iOS — design "restart required" prompt in Phase 7 i18n init, not Phase 12
- [v2.0 Roadmap]: FIX-01 (tax_amount generated column in INSERT) assigned to Phase 11 (Invoices) — same phase where invoice creation is built
- [v2.0 Roadmap]: Victory Native replaces Recharts (web-only) — validate tap-to-callout API before Phase 10 planning
- [v2.0 Roadmap]: UX patterns (safe areas, haptics, swipe-to-delete, keyboard avoidance) assigned to Phase 7 — architectural decisions baked in before any feature screen
- [v2.0 Roadmap]: Expo SDK 52 pinned — SDK 53+ has unresolved ws/stream Metro crash with supabase-js (#1400/#1403)
- [v2.0 Roadmap, 07-01 update]: Expo SDK 55 installed (create-expo-app latest stable) — SDK 52 pin may be stale; monitor ws/stream Metro compatibility in Plan 02 when full Supabase client is built
- [07-01]: AsyncStorage replaces localStorage for all RN context persistence (DateContext, CurrencyContext)
- [07-01]: Placeholder stubs pattern — AuthContext, useLogActivity, analytics.ts created as type-safe no-ops to allow hooks to compile before Plan 02/08 implementation
- [07-01]: EXPO_PUBLIC_ prefix for all public env vars (replaces VITE_ prefix from web app)
- [07-01]: URL polyfill (react-native-url-polyfill/auto) imported first in app/_layout.tsx
- [07-02]: expo-sqlite localStorage polyfill used for Supabase session storage (not expo-secure-store — 2KB per-item limit exceeded by Supabase sessions)
- [07-02]: NetInfo online manager omitted from queryClient.ts — requires dev build; deferred to Phase 8
- [07-02]: SplashScreen.preventAutoHideAsync() called in _layout.tsx; hide delegated to Phase 8 after auth+i18n init
- [07-03]: FormScreen uses KeyboardAvoidingView + ScrollView fallback — react-native-keyboard-controller requires dev build; Expo Go phase; upgrade deferred to Phase 8
- [07-03]: setColorScheme in nativewind v4 is a method on useColorScheme() return value, not a named export — destructure from hook
- [07-03]: SplashScreen.hideAsync() moved to _layout.tsx after initI18n() — Plan 03 owns i18n gate, so splash hide belongs here
- [01-03]: Generated columns (tax_amount, total, amount) excluded from Insert/Update types — same pattern applies to RN port

### Pending Todos

None.

### Blockers/Concerns

- [Phase 10]: Victory Native v5 API confidence is MEDIUM — validate tap-to-callout and responsive width before building dashboard charts
- [Phase 11]: expo-print Arabic font rendering not validated — run minimal proof-of-concept on physical device before full PDF template build
- [Phase 12]: Apple Developer Program enrollment needs 24–48hr processing — start no later than Phase 11 to avoid blocking submission

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 07-03-PLAN.md — UX foundation components, i18n init, ThemeContext, PrivacyOverlay
Resume file: None
