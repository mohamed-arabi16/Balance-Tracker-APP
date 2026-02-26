# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26 after v2.0 milestone start)

**Core value:** Anyone can track their money simply — and freelancers can manage their business without switching apps.
**Current focus:** v2.0 iOS Native App — Phase 11: Advanced Mode + PDF Export

## Current Position

Milestone: v2.0 iOS Native App
Phase: 11 of 12 (Advanced Mode + PDF Export)
Plan: 5 of 5 in Phase 11 (COMPLETE)
Status: Phase 11 Plan 05 COMPLETE — Client picker added to income and expense forms behind isAdvanced gate; ADV-05 complete; Phase 12 next
Last activity: 2026-02-26 — 11-05 complete: add-income.tsx and add-expense.tsx updated with conditional client picker; income-form.tsx and expense-form.tsx stubs created; client_id wired in mutation payloads; tsc clean

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
| Phase 09 P04 | 3 | 2 tasks | 3 files |
| Phase 09 P03 | 4 | 2 tasks | 5 files |
| Phase 09 P02 | 3 | 2 tasks | 3 files |
| Phase 10 P02 | 3 | 2 tasks | 3 files |
| Phase 10-dashboard-csv-export P01 | 5 | 3 tasks | 6 files |
| Phase 10-dashboard-csv-export P03 | human-gated | 1 tasks | 0 files |
| Phase 11-advanced-mode-pdf-export P01 | 2 | 2 tasks | 6 files |
| Phase 11-advanced-mode-pdf-export P02 | 3 | 2 tasks | 5 files |
| Phase 11 P03 | 9 | 2 tasks | 5 files |
| Phase 11-advanced-mode-pdf-export P05 | 4 | 1 tasks | 4 files |

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
- [08-01]: expo-router typed routes: .expo/types/router.d.ts is gitignored — use 'as any' type assertions on Link hrefs for new routes until first expo start regenerates the file
- [08-01]: queryClient.clear() called only in explicit signOut(), NOT in onAuthStateChange — avoids clearing cache on token auto-refresh
- [08-01]: resetPassword has no redirectTo — covered in Phase 12 plan 12-01 Task 3 (balancetracker://reset-password deep link + reset-password screen)
- [08-02]: Stack.Protected auth guard pattern — two guards in RootNavigator (!session shows (auth), !!session shows (tabs)); no imperative router.replace() redirect
- [08-02]: RootNavigator returns null while isLoading — splash screen covers this gap; SplashScreen.hideAsync() fires only when both i18n and auth resolve
- [08-02]: Tab directories (debts/, assets/) require their own _layout.tsx so Expo Router names route segments correctly to match Tabs.Screen name props
- [08-02]: AuthContext.onAuthStateChange must NOT call setIsLoading(false) — getSession already sets it; duplicate call causes null→Stack→null flicker in RootNavigator
- [08-02]: FormScreen wrapped in SafeAreaView so auth screens respect notch and Dynamic Island on modern iPhones
- [09-01]: DeleteAction is a plain function (not React component) to match ReanimatedSwipeable renderRightActions SharedValue signature
- [09-01]: StatusBadge passes ALL UpdateIncomePayload fields on mutate to prevent Supabase null overwrites
- [09-01]: date-fns was not pre-installed — auto-installed as blocking dep; now available to Plans 09-02/03/04
- [09-01]: formSheet Stack layout defines add-expense screen upfront so Plan 09-02 only needs to create the file
- [Phase 09]: useAssetPrices called once at AssetScreen level and passed as props to AssetRow to avoid N separate hook subscriptions
- [Phase 09]: Stale warning guarded by !loading AND snapshot !== null — prevents spurious warning flash on initial mount (Pitfall 7)
- [Phase 09]: Debt status toggle passes ALL UpdateDebtPayload fields spread from item to avoid Supabase null overwrites on partial update
- [Phase 09]: payment.tsx uses note:'Payment' + payment_date to distinguish payment history entries from edit history entries in useUpdateDebt
- [Phase 09]: ExpenseScreen dual export (named+default) enables inline tab switching in index.tsx without navigation push
- [Phase 09]: index.tsx tab chip switcher: useState<'income'|'expenses'> drives conditional render of IncomeScreen vs ExpenseScreen
- [Phase 10]: expo-file-system v19 new API used (File + Paths) instead of deprecated legacy writeAsStringAsync + cacheDirectory
- [Phase 10]: Hook types (Income, Expense, Debt, Asset) imported from hook files, not Database types — hooks define own interfaces with extra fields like is_receivable
- [Phase 10-dashboard-csv-export]: useAnimatedReaction+runOnJS replaces useDerivedValue+animatedProps for callout label — RN Text has no text prop natively, so animatedProps pattern fails
- [Phase 10-dashboard-csv-export]: dashboard.tsx alongside index.tsx — tab bar uses index as dashboard; dashboard.tsx accessible as /dashboard route for Phase 10 testing without modifying tab bar
- [Phase 10-dashboard-csv-export]: Inter-Medium.ttf downloaded from rsms/inter v4.0 GitHub raw URL (299KB) for chart axis label rendering via victory-native useFont()
- [Phase 10-dashboard-csv-export]: Skia native module is present in Expo Go SDK 54 — no dev build required for Victory Native XL chart rendering
- [Phase 10-dashboard-csv-export]: Phase 10 complete — DASH-01, DASH-02, DASH-03, EXPRT-01 all verified on device; Phase 11 unblocked
- [Phase 11-advanced-mode-pdf-export]: ModeProvider placed inside AuthProvider (not beside it) because useUserSettings calls useAuth — ordering enforces dependency
- [Phase 11-advanced-mode-pdf-export]: href: isAdvanced ? undefined : null hides Advanced tabs without unmounting routes — enables instant show/hide on toggle
- [Phase 11-advanced-mode-pdf-export]: expo-install for expo-print (SDK version resolution); npm install for pure-JS libs (react-hook-form, zod, @hookform/resolvers)
- [Phase 11-advanced-mode-pdf-export Plan 02]: clients/_layout.tsx required for Expo Router to resolve nested routes under clients/ with formSheet presentation
- [Phase 11-advanced-mode-pdf-export Plan 02]: Client detail uses FlatList+ListHeaderComponent (not SectionList) — simpler two-section layout without VirtualizedList nesting concerns
- [Phase 11-advanced-mode-pdf-export Plan 02]: Client-side filtering of incomes/expenses by client_id — data already in TanStack Query cache, no extra queries
- [Phase 11-advanced-mode-pdf-export Plan 02]: useEffect+reset() for ClientEditScreen pre-fill — prevents empty defaultValues flash before useClient() resolves
- [Phase 11]: z.number() + parseFloat() in onChangeText replaces z.coerce.number() — zod v4 coerce output type is unknown, breaking zodResolver; no .default() on fields to avoid input/output type split
- [Phase 11]: invoiceFormSchema extracted to src/lib/ — avoids TypeScript path resolution issues with [id] bracket in cross-directory imports
- [Phase 11]: currency enum USD|TRY only — matches DB currency_code enum exactly (EUR/GBP not in Supabase schema)
- [Phase 11-advanced-mode-pdf-export]: income-form.tsx and expense-form.tsx created as re-export stubs pointing to add-income.tsx and add-expense.tsx — Phase 9 named the screens differently from the plan spec; stubs satisfy artifact contract without duplicating logic

### Pending Todos

None.

### Blockers/Concerns

- [Phase 11]: expo-print Arabic font rendering not validated — run minimal proof-of-concept on physical device before full PDF template build
- [Phase 12]: Apple Developer Program enrollment needs 24–48hr processing — start no later than Phase 11 to avoid blocking submission

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 11-05-PLAN.md — income and expense forms updated with conditional client picker (isAdvanced gate); client_id wired in mutation payloads; ADV-05 complete; Phase 11 all 5 plans done; Phase 12 next
Resume file: None
