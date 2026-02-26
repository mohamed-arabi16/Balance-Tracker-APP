# Phase 7 Research: Project Scaffold + Foundation

**Phase:** 07 — Project Scaffold + Foundation
**Researched:** 2026-02-26
**Confidence:** HIGH (all findings drawn from milestone research verified against official docs)

---

## What This Phase Must Establish

Phase 7 is the only phase where architectural decisions are made for the entire app. Every pattern baked in here propagates to all 5 subsequent feature phases. Shortcuts taken here require retrofitting across all screens later.

**Non-negotiable outcomes:**
1. App compiles and runs on a physical iOS device
2. Supabase client connects with session persistence across force-quit
3. Portable layer (hooks, lib, types, i18n strings) copied in and import paths resolved
4. RTL initialization committed to an approach (applied at startup, not runtime)
5. NativeWind dark/light theming wired to iOS system appearance
6. Safe areas, keyboard avoidance, haptics, and privacy screen established as reusable patterns — not screen-by-screen afterthoughts

---

## Requirement Analysis

| Requirement | What It Actually Means for This Phase |
|-------------|---------------------------------------|
| FOUND-01 | `npx create-expo-app` with SDK 52, install all deps, configure Babel + Metro for NativeWind v4 |
| FOUND-02 | Supabase client with `expo-sqlite/localStorage/install` polyfill + `react-native-url-polyfill` + AppState token refresh |
| FOUND-03 | Copy `hooks/`, `lib/`, `integrations/supabase/types.ts`, `i18n/` resources from web — adjust import paths |
| UX-01 | Install `react-native-safe-area-context`, wrap root in `<SafeAreaProvider>`, create `SafeScreen` wrapper component |
| UX-02 | Establish `KeyboardAvoidingView` pattern with `useHeaderHeight()` offset — create reusable `KeyboardAwareScreen` component |
| UX-03 | Install `expo-haptics`, create `haptics.ts` utility with named actions (`onSave`, `onDelete`, `onError`) |
| UX-04 | Implement privacy screen using `AppState` listener — blur or hide sensitive content when app enters background |
| UX-05 | No work needed — native ScrollView/FlatList has iOS scroll physics by default |
| UX-06 | Create reusable `EmptyState` component: minimal, CTA button, encouraging copy |
| UX-07 | Set `"orientation": "portrait"` in `app.json` |
| I18N-01 | Copy translation resources from web `src/i18n/index.ts`, set up `i18next` init with `expo-localization` device detection |
| I18N-02 | Apply `I18nManager.allowRTL()` at startup before first render; design language-switch UX with persistent "restart required" banner |
| I18N-03 | Port `useExchangeRate` hook — already uses Supabase Edge Function, no changes needed to the hook itself |
| I18N-04 | Port `lib/locale.ts` — pure function, copy unchanged |
| THEME-01 | NativeWind v4 `useColorScheme()` reads iOS system appearance; set `"userInterfaceStyle": "automatic"` in `app.json` |
| THEME-02 | `setColorScheme('dark' | 'light' | 'system')` from NativeWind stored in AsyncStorage for manual override |

---

## Implementation Decisions

### Decision 1: Supabase Session Storage — expo-sqlite localStorage Polyfill

**Use:** `expo-sqlite/localStorage/install` polyfill (not `expo-secure-store` adapter, not raw AsyncStorage).

**Rationale:** The milestone research (STACK.md) documents this as the official Supabase recommendation as of 2025. The `expo-secure-store` adapter has a 2KB per-item size limit that Supabase sessions can exceed on some iOS versions. AsyncStorage is not the recommended approach either. The `expo-sqlite` polyfill transparently replaces `localStorage` with no size limit and is what `supabase.com/docs/guides/getting-started/quickstarts/expo-react-native` documents.

**Pattern:**
```typescript
// src/integrations/supabase/client.ts — FIRST lines
import 'react-native-url-polyfill/auto'
import 'expo-sqlite/localStorage/install'
import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'
import type { Database } from './types'

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: localStorage,      // provided by expo-sqlite polyfill
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,  // no URL-based OAuth on mobile
    },
  }
)

// Pause/resume token refresh with app lifecycle
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
```

**Verification needed:** After wiring this up, force-quit the app and reopen — `supabase.auth.getSession()` must return non-null. This is the Phase 7 success criterion for FOUND-02.

---

### Decision 2: RTL Initialization Strategy

**Approach:** Apply RTL at app startup based on persisted AsyncStorage preference. Never call `I18nManager.forceRTL()` at runtime.

**Rationale from PITFALLS.md:** `I18nManager.forceRTL()` is a dev/testing tool. Calling it without a full native restart creates partially-RTL layouts. The correct pattern is `I18nManager.allowRTL(language === 'ar')` at app init (before first render), with the direction set based on what's stored in AsyncStorage.

**First-launch detection (I18N-01 + CONTEXT.md decision):**
```typescript
// src/i18n/index.ts
import { I18nManager } from 'react-native'
import * as Localization from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'

const LANG_KEY = 'app_language'

export async function initI18n() {
  const saved = await AsyncStorage.getItem(LANG_KEY)
  const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en'
  const language = saved ?? (deviceLang === 'ar' ? 'ar' : 'en')

  // Apply RTL direction BEFORE any render
  I18nManager.allowRTL(language === 'ar')

  await i18n.use(initReactI18next).init({
    resources,          // ported verbatim from web
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
}
```

**Language switch UX (CONTEXT.md decision — persistent banner, no forced restart):**

When the user switches language in Settings:
1. Save new language to AsyncStorage
2. Change `i18n.changeLanguage()` for text updates (text switches immediately)
3. Show a persistent non-blocking banner: "Restart the app to apply the new layout direction"
4. Banner stays visible until the user closes and reopens the app
5. On next cold start, `initI18n()` reads the saved language and applies the correct RTL direction

This means: text content updates immediately, but layout direction (flex, padding start/end, header alignment) only flips on the next launch. This is the correct iOS behavior — it matches Apple's own behavior for RTL language switching in iOS system settings.

**Layout convention for all components going forward:**
- Use `marginStart` / `marginEnd` (NOT `marginLeft` / `marginRight`)
- Use `paddingStart` / `paddingEnd` (NOT `paddingLeft` / `paddingRight`)
- These logical properties flip automatically with RTL — zero per-screen RTL overrides needed

---

### Decision 3: Theming — NativeWind v4 + System Sync

**Setup requirements in `app.json`:**
```json
{
  "expo": {
    "userInterfaceStyle": "automatic",
    "orientation": "portrait"
  }
}
```

**Dark/light switch pattern (THEME-01 + THEME-02):**
```typescript
// src/contexts/ThemeContext.tsx
import { useColorScheme } from 'nativewind'
import AsyncStorage from '@react-native-async-storage/async-storage'

const THEME_KEY = 'app_theme'

// On mount: read saved override from AsyncStorage, apply it
// If no override: 'system' — NativeWind reads iOS Appearance API automatically
// setColorScheme('dark' | 'light' | 'system') — also saves to AsyncStorage
```

NativeWind v4 reads `Appearance.getColorScheme()` by default. Manual override persisted in AsyncStorage. The ThemeContext from the web app must be rebuilt — it uses `document.documentElement.classList` which does not exist in React Native.

**NativeWind config files required (both mandatory for v4):**
- `babel.config.js` — add `'nativewind/babel'` to plugins
- `metro.config.js` — wrap with `withNativeWind(config, { input: './global.css' })`
- `global.css` — Tailwind directives + CSS variable definitions for theme colors

---

### Decision 4: Safe Area Wrapper Pattern (UX-01)

Create a `SafeScreen` wrapper component used by every screen. Do not manually add `SafeAreaView` per-screen — that creates inconsistency.

```typescript
// src/components/layout/SafeScreen.tsx
import { SafeAreaView } from 'react-native-safe-area-context'

interface SafeScreenProps {
  children: React.ReactNode
  className?: string
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
}

export function SafeScreen({ children, className, edges = ['top', 'bottom'] }: SafeScreenProps) {
  return (
    <SafeAreaView edges={edges} className={`flex-1 bg-white dark:bg-gray-950 ${className ?? ''}`}>
      {children}
    </SafeAreaView>
  )
}
```

Root layout (`app/_layout.tsx`) wraps with `<SafeAreaProvider>` once. All screen files use `<SafeScreen>` instead of `<View>`.

---

### Decision 5: Keyboard Avoidance Pattern (UX-02)

Two options were considered. Recommendation: use `react-native-keyboard-controller`.

**Why not bare `KeyboardAvoidingView`:** It requires `keyboardVerticalOffset={useHeaderHeight()}` which is boilerplate on every form screen and breaks inside bottom sheets. It also has known iOS-specific bugs with nested navigators.

**Recommended:** `react-native-keyboard-controller` — wraps the root with a `KeyboardProvider` and exposes `KeyboardAwareScrollView` that handles all iOS edge cases automatically, including Dynamic Island, notch, and navigation header offset.

```typescript
// app/_layout.tsx — add KeyboardProvider to provider stack
import { KeyboardProvider } from 'react-native-keyboard-controller'

// src/components/layout/FormScreen.tsx — reusable form wrapper
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

export function FormScreen({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={16}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {children}
    </KeyboardAwareScrollView>
  )
}
```

If `react-native-keyboard-controller` causes issues with the dev build setup, fallback is `KeyboardAvoidingView` with `behavior="padding"` and `useHeaderHeight()` offset from `@react-navigation/elements`.

---

### Decision 6: Haptics Utility (UX-03)

Create a single `src/lib/haptics.ts` file with named actions. This prevents scattered `expo-haptics` calls and makes haptic policy visible in one place.

```typescript
// src/lib/haptics.ts
import * as Haptics from 'expo-haptics'

export const haptics = {
  // Light tap — successful form save, item selected
  onSave:    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  // Heavy impact — destructive actions (delete confirm)
  onDelete:  () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  // Error shake pattern
  onError:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  // Tab bar tap / toggle
  onToggle:  () => Haptics.selectionAsync(),
}
```

Haptics fire on: save (income, expense, debt, asset, client, invoice), delete confirmation, form validation error. Not on: navigation, scrolling, passive reads.

---

### Decision 7: Privacy Screen (UX-04)

**Approach:** Blur overlay on `AppState` backgrounding. Avoid a solid color — it feels abrupt. A semi-transparent blur with the app icon centered is the Apple-native pattern (matches iOS app switcher behavior of native apps like Notes, Wallet).

```typescript
// src/components/layout/PrivacyScreen.tsx
import { useEffect, useState } from 'react'
import { AppState, View, Image, BlurView } from ... // expo-blur for the blur

export function PrivacyOverlay() {
  const [isBackground, setIsBackground] = useState(false)

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setIsBackground(state === 'inactive' || state === 'background')
    })
    return () => sub.remove()
  }, [])

  if (!isBackground) return null

  return (
    <View style={StyleSheet.absoluteFill} className="items-center justify-center">
      <BlurView intensity={80} style={StyleSheet.absoluteFill} />
      {/* Optional: app icon centered */}
    </View>
  )
}
```

Requires `expo-blur`. Mount `<PrivacyOverlay />` once in the root `_layout.tsx` at the top of the provider stack, above all screens.

**Note:** `AppState` fires `inactive` on iOS when the user swipes up to the app switcher but before the screenshot is taken. This is the correct event to listen for — `background` fires after the screenshot is already captured.

---

### Decision 8: Empty State Component (UX-06)

Minimal, no illustrations, Apple HIG-compliant spacing. Encouraging copy per CONTEXT.md.

```typescript
// src/components/ui/EmptyState.tsx
interface EmptyStateProps {
  title: string       // e.g. "No income tracked yet"
  message: string     // e.g. "Start tracking your income to see it here."
  ctaLabel: string    // e.g. "Add Income"
  onCta: () => void
}
```

Usage in list screens: rendered when `data.length === 0` and not loading. CTA button calls the same action as the screen's primary add button.

---

### Decision 9: Folder Structure

```
src/
├── app/                     # Expo Router — every file is a route
│   ├── _layout.tsx          # Root: providers + Stack.Protected auth guard
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── (tabs)/
│       ├── _layout.tsx      # Bottom tab bar (5 tabs: Dashboard, Transactions, Debts, Assets, More)
│       ├── index.tsx        # Dashboard
│       ├── transactions/
│       ├── debts/
│       ├── assets/
│       └── settings.tsx
│
├── components/
│   ├── ui/                  # Primitives: Button, Card, Input, Badge, EmptyState
│   ├── layout/              # SafeScreen, FormScreen, PrivacyOverlay
│   └── shared/              # EmptyState (used across multiple screens)
│
├── contexts/                # Rebuilt for RN: AuthContext, ThemeContext
│                            # Ported: ModeContext, CurrencyContext, DateContext
├── hooks/                   # PORTED from web (minimal changes)
├── lib/                     # PORTED pure functions (zero changes) + new: haptics.ts, queryClient.ts
├── i18n/                    # PORTED translation resources; rebuilt init file
└── integrations/
    └── supabase/
        ├── client.ts        # Rebuilt for RN
        └── types.ts         # Copied verbatim from web
```

---

## Portable Layer: What to Copy from Web

These files from the existing web app (`src/`) copy with zero or minimal changes:

| Web Path | Destination | Changes Required |
|----------|-------------|-----------------|
| `src/integrations/supabase/types.ts` | `src/integrations/supabase/types.ts` | None — same Supabase project |
| `src/lib/queryKeys.ts` | `src/lib/queryKeys.ts` | None |
| `src/lib/currency.ts` | `src/lib/currency.ts` | None — pure functions |
| `src/lib/finance.ts` | `src/lib/finance.ts` | None |
| `src/lib/debt.ts` | `src/lib/debt.ts` | None |
| `src/lib/locale.ts` | `src/lib/locale.ts` | None |
| `src/lib/netWorth.ts` | `src/lib/netWorth.ts` | None |
| `src/i18n/index.ts` (translation resources object only) | `src/i18n/resources.ts` | Extract just the `resources` export; discard init code |
| `src/hooks/useIncomes.ts` | `src/hooks/useIncomes.ts` | Change `@/lib/supabase` → `@/integrations/supabase/client` |
| `src/hooks/useExpenses.ts` | same | Same import path change |
| `src/hooks/useDebts.ts` | same | Same |
| `src/hooks/useAssets.ts` | same | Same |
| `src/hooks/useClients.ts` | same | Same |
| `src/hooks/useInvoices.ts` | same | Same |
| `src/hooks/useUserSettings.ts` | same | Same |
| `src/hooks/useExchangeRate.ts` | same | Same |
| `src/hooks/useAssetPrices.ts` | same | Same |
| `src/hooks/useFilteredData.ts` | same | Same |
| `src/contexts/ModeContext.tsx` | `src/contexts/ModeContext.tsx` | None — persists to `user_settings`, no localStorage |
| `src/contexts/DateContext.tsx` | `src/contexts/DateContext.tsx` | None |
| `src/contexts/CurrencyContext.tsx` | `src/contexts/CurrencyContext.tsx` | Replace `localStorage` cache read/write with AsyncStorage |

**Must be rebuilt (do not copy):**
- `src/integrations/supabase/client.ts` — uses browser localStorage
- `src/contexts/AuthContext.tsx` — needs AppState listener
- `src/contexts/ThemeContext.tsx` — uses document.documentElement
- `src/i18n/index.ts` (init code) — needs I18nManager + expo-localization

---

## Critical Pitfalls for This Phase

From PITFALLS.md — items that must be addressed in Phase 7 specifically:

### P1: URL Polyfill Must Be First Import (CRITICAL)
`import 'react-native-url-polyfill/auto'` must be the **absolute first import** in `app/_layout.tsx`. If placed after any Supabase import, `URL.hostname is not implemented` crashes the app on first network call. This is silent in Expo Go but hard crashes in device builds.

### P3: Supabase ws Module Crash on SDK 53+ (ALREADY MITIGATED)
The project is pinned to Expo SDK 52 (STATE.md decision). This pitfall only affects SDK 53+. No metro.config.js aliases needed. Do not upgrade SDK during this phase.

### P8: All Text Must Be Inside `<Text>` — Enable ESLint Rule Immediately
Enable `react-native/no-raw-text` ESLint rule before porting any web code. The web uses `<div>string</div>` patterns throughout. Catching this at lint time prevents production crashes. Set up `.eslintrc` with `@react-native-community/eslint-config` in the first plan.

### P4: RTL Requires App Restart — Do Not Promise Runtime Switch
The language-switch UX must be designed with the restart requirement in mind from the start (see Decision 2 above). Do not build a settings toggle that implies instant RTL flip — it will produce visually broken half-RTL layouts.

### AppState Privacy Timing
The privacy overlay must listen for `inactive` (not just `background`) because iOS captures the app switcher screenshot at the `inactive` transition. Listening only to `background` is too late — the content is already captured.

---

## Phase 7 Build Sequence (Recommended Plan Split)

**Plan 1: Project scaffold + dependencies + portable layer copy**
- `npx create-expo-app` with SDK 52 blank TypeScript template
- Install all dependencies (see STACK.md installation section)
- Configure NativeWind v4 (babel.config.js, metro.config.js, global.css, tailwind.config.js)
- Configure `app.json` (orientation portrait, userInterfaceStyle automatic)
- Set up ESLint with `react-native/no-raw-text` rule
- Copy portable layer files, adjust import paths
- Verify: `npx expo start` shows blank app without errors

**Plan 2: Supabase client + Auth Context + React Query config**
- Write `src/integrations/supabase/client.ts` (RN client with localStorage polyfill)
- Write `src/lib/queryClient.ts` (AppState focus manager + NetInfo online manager)
- Write `src/contexts/AuthContext.tsx` (session, loading, AppState token refresh)
- Write root `app/_layout.tsx` (providers + Stack.Protected guard)
- Write stub `(auth)/sign-in.tsx` and `(auth)/sign-up.tsx`
- Verify: session persists across force-quit on physical device

**Plan 3: Core UX patterns + i18n init**
- Write `src/i18n/index.ts` (init with expo-localization, I18nManager, AsyncStorage)
- Write `src/contexts/ThemeContext.tsx` (NativeWind useColorScheme + AsyncStorage override)
- Write `src/components/layout/SafeScreen.tsx`
- Write `src/components/layout/FormScreen.tsx` (keyboard-aware)
- Write `src/components/layout/PrivacyOverlay.tsx` (AppState-based blur)
- Write `src/lib/haptics.ts`
- Write `src/components/ui/EmptyState.tsx`
- Write stub `(tabs)/_layout.tsx` with 5 tabs
- Verify all Phase 7 success criteria on physical device

---

## Success Criteria Verification

| Criterion | How to Verify |
|-----------|---------------|
| App launches on physical iOS, connects to Supabase | Sign in, sign out — no crash, no "URL.hostname" error |
| Session persists across force-quit | Sign in, force-quit from app switcher, reopen — still signed in |
| Light/dark follows system without restart | iOS Settings > Display > Dark Mode toggle — app switches immediately |
| Arabic mode activates with restart banner | Switch to Arabic in Settings — persistent banner appears, text switches, restart shows RTL |
| Safe areas on iPhone 14 Pro+ | Content does not overlap Dynamic Island or home indicator |
| Privacy screen blurs in app switcher | Swipe up to app switcher — content is blurred, not visible |

---

## Open Questions for Implementation

1. **`react-native-keyboard-controller` vs bare `KeyboardAvoidingView`:** The recommended choice is `react-native-keyboard-controller` but it requires a development build (`expo-dev-client`). If the project is using Expo Go for early development, use `KeyboardAvoidingView` initially and migrate when the dev build is ready. Flag this decision in Plan 2.

2. **`expo-blur` availability in managed workflow:** `expo-blur` is an Expo module that works in managed workflow — no prebuild needed. Confirm version compatibility with SDK 52 before using in the privacy screen implementation.

3. **`@react-native-community/netinfo` for React Query online manager:** This package requires a dev build (it has native code). Alternative: skip the online manager for Phase 7 and add it in Phase 8 when the dev build is required anyway for `@gorhom/bottom-sheet`. React Query will still work without it — it just won't pause queries when offline.

---

*Research for Phase 07: Project Scaffold + Foundation*
*Researched: 2026-02-26*
