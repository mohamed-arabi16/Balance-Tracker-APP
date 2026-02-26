# Stack Research: Balance Tracker iOS (React Native Port)

**Domain:** React Native (Expo) iOS app — personal finance + freelancer invoicing
**Researched:** 2026-02-26
**Confidence:** HIGH (core stack), MEDIUM (PDF strategy), HIGH (Supabase integration)

---

## Context: What This Replaces

The web app shipped on React 18 + Vite + Shadcn/ui + TanStack React Query + Supabase. The iOS port reuses the **same Supabase backend, same DB schema, same RLS policies, same hooks/query logic** — only the rendering layer changes. This stack document covers exclusively the React Native layer.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Expo (managed workflow) | SDK 52 | Project scaffolding, build system, native module access | SDK 52 is the last stable SDK with clean Supabase compatibility (no metro ES module workaround needed). SDK 53+ introduces a `ws/stream` resolution error with `@supabase/supabase-js` — tracked in supabase-js issues [#1400](https://github.com/supabase/supabase-js/issues/1400) and [#1403](https://github.com/supabase/supabase-js/issues/1403). Use SDK 52 until supabase-js resolves this upstream. |
| React Native | 0.76 (via Expo SDK 52) | Native iOS rendering | Ships with SDK 52. First RN version with New Architecture enabled by default — JSI, concurrent rendering, faster bridge. iOS 15.1 minimum deployment target. |
| TypeScript | 5.x | Type safety | Same TS already used across 16,650 LOC of web app. Types for Supabase generated tables, shared hooks, and query return shapes can be reused directly. |
| Expo Router | 3.x (included with SDK 52) | File-based navigation | Superset of React Navigation v7. File-based routing mirrors the web app's pages structure. Handles tabs, stacks, modals, and deep links natively. iOS swipe-back gesture is automatic. |

**Confidence: HIGH** — Verified via [Expo SDK 52 changelog](https://expo.dev/changelog/2024-11-12-sdk-52), [supabase-js issues #1400/#1403](https://github.com/supabase/supabase-js/issues/1400).

---

### Supabase Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @supabase/supabase-js | 2.x (latest 2.x compatible with SDK 52) | Database, auth, RPC calls | Same client the web app uses. RLS policies, Edge Functions, RPC functions (`invoice_number` atomic increment) all work identically. Zero new backend services needed. |
| expo-sqlite (localStorage polyfill) | included with Expo SDK 52 | Session persistence for Supabase auth | Official Supabase + Expo recommended approach as of 2025. Uses `expo-sqlite/localStorage/install` polyfill — replaces the browser `localStorage` API transparently. Handles token refresh automatically. |
| react-native-url-polyfill | 2.x | URL API polyfill required by supabase-js | React Native's JS engine lacks the standard URL API; supabase-js requires it. One import at app entry (`import 'react-native-url-polyfill/auto'`) fixes this. |

**Supabase client initialization pattern:**
```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import 'expo-sqlite/localStorage/install'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,   // no URL-based OAuth in mobile
    },
  }
)
```

**Confidence: HIGH** — Verified via [official Supabase Expo quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native).

---

### Navigation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Expo Router | 3.x | All navigation — tabs, stack, modals | Built on React Navigation v7. File-based structure maps cleanly to the web app's page architecture. Typed routes, automatic deep linking, platform-native gesture support (iOS swipe-back). |
| React Native Gesture Handler | ~2.22.0 | Native gesture recognition | Required peer dep for Expo Router / React Navigation. Provides iOS-native pan, swipe, and tap gesture recognizers via the New Architecture JSI. |
| React Native Reanimated | ~3.16.7 | Declarative animations | Required for bottom sheets, transition animations, swipeable list items. Specified version is SDK 52 compatible (3.16.1 does not support RN 0.77; 3.16.7+ does). |

**Navigation architecture for this app:**
```
app/
  _layout.tsx          — root Stack (wraps auth gate)
  (auth)/
    login.tsx
    signup.tsx
  (tabs)/
    _layout.tsx        — Bottom tab navigator (Dashboard, Transactions, Clients, Settings)
    index.tsx          — Dashboard
    transactions/
      _layout.tsx      — Stack inside Transactions tab
      index.tsx
      add.tsx          — Add income/expense (modal presentation)
      [id].tsx         — Edit entry
    clients/           — Advanced mode only
      _layout.tsx
      index.tsx
      [id]/
        index.tsx
        invoices.tsx
    settings.tsx
  invoice/
    [id].tsx           — Full-screen invoice detail (modal over tabs)
```

**Confidence: HIGH** — Verified via [Expo Router introduction](https://docs.expo.dev/router/introduction/) and [common navigation patterns](https://docs.expo.dev/router/basics/common-navigation-patterns/).

---

### UI Components and Styling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| NativeWind | v4.x | Tailwind-syntax utility styling for React Native | Tailwind syntax is already used for all Shadcn components on the web. NativeWind v4 (Dec 2025) added CSS variables, dark mode via `useColorScheme`, container queries, and improved style merging. Developers already know this syntax — minimal learning curve. |
| React Native built-in components | (RN 0.76) | Base layer: View, Text, ScrollView, FlatList, TextInput, TouchableOpacity | Use native primitives as the actual rendered components. NativeWind styles are applied via `className` prop — identical mental model to Shadcn/ui on web. |
| @gorhom/bottom-sheet | ~5.x | Bottom sheet modals for add/edit forms | iOS-native bottom sheet gesture (drag to dismiss). Required for HIG-compliant form entry. Works with Expo managed workflow via prebuild. |
| expo-haptics | SDK 52 | Haptic feedback on actions | HIG compliance: iOS users expect haptic feedback on destructive actions, confirmations, and toggles. `impactAsync`, `notificationAsync` APIs. |
| expo-status-bar | SDK 52 | Status bar control | Manages light/dark status bar appearance per-screen. Required with dark mode support. |

**On UI library choice — NativeWind over Tamagui or Gluestack:**

Tamagui is a valid alternative but requires learning a new component abstraction and has a steeper setup curve. Gluestack UI v3 (2025) is excellent for accessibility but adds a significant component layer over primitives. Since the web app already uses Tailwind-syntax utilities and the team knows this pattern, NativeWind v4 delivers the best ratio of native feel to onboarding speed. NativeWindUI (nativewindui.com) provides 30+ pre-built iOS-idiomatic components built on NativeWind — useful reference implementations even if not used directly.

**Dark/light theming:**
```typescript
// NativeWind v4 pattern — reads system preference
import { useColorScheme } from 'nativewind'

const { colorScheme, setColorScheme } = useColorScheme()
// Toggle: setColorScheme('dark' | 'light' | 'system')
```

Requires `"userInterfaceStyle": "automatic"` in `app.json`.

**Confidence: HIGH (NativeWind)** — Verified via [NativeWind dark mode docs](https://www.nativewind.dev/docs/core-concepts/dark-mode), [Expo color themes](https://docs.expo.dev/develop/user-interface/color-themes/).

---

### State Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TanStack React Query | v5.x | All server state — fetching, caching, mutation, optimistic updates | Already used throughout the web app. React Native is a first-class platform for TanStack Query. The existing hooks (`useIncomes`, `useExpenses`, `useClients`, `useInvoices`, `useUserSettings`) can be ported with near-zero changes — replace `@/lib/supabase` import paths and remove any DOM-specific side effects. |
| React Context | (React 19) | Lightweight global UI state — auth session, app mode | Auth session context and app mode context (`isAdvancedMode`) remain React Context, identical to the web app. No Zustand or Redux needed — the app has no complex derived global state. |

**What NOT to use for state:**
- Zustand/Redux/Jotai — all overkill. The existing pattern of React Query (server state) + Context (UI prefs) is sufficient and already battle-tested in this codebase.
- AsyncStorage for query cache persistence — not needed for this app; in-memory query cache rehydrates from Supabase fast enough on network.

**Confidence: HIGH** — Verified via [TanStack Query React Native docs](https://tanstack.com/query/latest/docs/framework/react/react-native).

---

### Forms

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| react-hook-form | 7.x | Form state management | Already used across all web app forms. Works identically in React Native — `Controller` wraps each `TextInput`. Same `useForm`, `zodResolver`, `handleSubmit` API. |
| zod | 3.x | Schema validation | Already used for all web app validation schemas (`incomeSchema`, `clientSchema`, `invoiceSchema`). Zero changes needed to schema definitions — they're pure TypeScript with no DOM dependencies. |
| @hookform/resolvers | 3.x | zod-to-react-hook-form bridge | Same resolver package used on web. |

**Confidence: HIGH** — Verified via community sources: [Expo + React Hook Form + Zod](https://dev.to/birolaydin/expo-react-hook-form-typescript-zod-4oac).

---

### Internationalisation and RTL

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| i18next + react-i18next | latest 2.x / 14.x | Translation keys, language switching | Same i18n stack used on the web app. The existing `en` and `ar` translation objects in `src/i18n/index.ts` can be ported directly. `useTranslation` hook is identical. |
| expo-localization | SDK 52 | Detect device locale on app start | Provides `getLocales()` to read the device's preferred language. Used to set default language on first launch. |
| React Native I18nManager | (built-in RN 0.76) | RTL layout direction enforcement | `I18nManager.forceRTL(true)` flips all layout directions (flexbox start/end, text alignment). Called when switching to Arabic. **Requires app reload** (`Updates.reloadAsync()` or `RNRestart`) to take effect — this is a known iOS constraint, not a library limitation. |

**RTL switching pattern:**
```typescript
import { I18nManager } from 'react-native'
import * as Updates from 'expo-updates'

const switchToArabic = async () => {
  i18n.changeLanguage('ar')
  if (!I18nManager.isRTL) {
    I18nManager.forceRTL(true)
    await Updates.reloadAsync()  // reloads the JS bundle to apply RTL
  }
}
```

**Styling convention:** Use `marginStart`/`marginEnd` and `paddingStart`/`paddingEnd` (logical properties) instead of `marginLeft`/`marginRight` throughout — these flip automatically with RTL direction.

**Confidence: HIGH** — Verified via [React Native I18nManager docs](https://reactnative.dev/docs/i18nmanager), [GeekyAnts RTL guide](https://geekyants.com/blog/implementing-rtl-right-to-left-in-react-native-expo---a-step-by-step-guide).

---

### PDF Generation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| expo-print | ~13.x (SDK 52) | Generate PDF from HTML string | Official Expo module. `Print.printToFileAsync({ html })` renders an HTML string through iOS's WKWebView print pipeline and writes a PDF to the app cache directory. No native module compilation required — works in Expo managed workflow. |
| expo-sharing | ~12.x (SDK 52) | Share/save generated PDF | `shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' })` opens iOS share sheet — allows user to save to Files, send via Mail, AirDrop, etc. This is the HIG-compliant way to "download" a file on iOS. |
| expo-file-system | ~17.x (SDK 52) | Temporary file management | Used in conjunction with expo-print for cache cleanup after sharing. `deleteAsync()` removes the cached PDF after the share action completes. |

**Why expo-print over @react-pdf/renderer:**

The web app uses `@react-pdf/renderer` (a browser/Node PDF rendering engine). That library does **not** work in React Native — it depends on browser APIs unavailable in the RN JS runtime.

`expo-print` uses iOS's native WKWebView print rendering pipeline, which produces vector PDF with selectable text from HTML input. The trade-off is that the template is written in HTML/CSS string (not JSX), but this is manageable for an invoice layout and is the only approach that:
1. Works in Expo managed workflow (no custom native modules)
2. Produces vector PDF (selectable text)
3. Supports full CSS layout including RTL via `direction: rtl`
4. Handles pagination natively via `@page` CSS

**iOS limitation:** Local asset URLs (`file://`) are not supported in the HTML source due to WKWebView restrictions. Images (e.g., a logo) must be base64-encoded and inlined.

**Invoice PDF pattern:**
```typescript
import * as Print from 'expo-print'
import { shareAsync } from 'expo-sharing'

const generateInvoicePDF = async (invoice: Invoice) => {
  const html = buildInvoiceHTML(invoice)   // returns HTML string with inline CSS
  const { uri } = await Print.printToFileAsync({ html })
  await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' })
}
```

**RTL support in HTML template:**
```html
<html dir="rtl">
  <body style="direction: rtl; font-family: ...">
    <!-- Arabic invoice content here -->
  </body>
</html>
```

**Confidence: MEDIUM** — expo-print is well-documented and active (last published 3 months ago per npm). The HTML template approach is the recommended managed-workflow pattern per [Expo docs](https://docs.expo.dev/versions/latest/sdk/print/) and [Jan 2026 guide](https://anytechie.medium.com/how-to-use-expo-print-complete-guide-to-printing-in-react-native-apps-173fa435dadf). Rated MEDIUM only because the final PDF quality of the invoice template depends on HTML/CSS implementation quality, which needs validation during build.

---

### App Distribution

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| EAS Build | latest CLI | Compile iOS .ipa binary | Expo's managed cloud build service. No local Xcode environment required to produce an App Store binary. Handles code signing, provisioning profiles, and entitlements. `eas build --platform ios --profile production` |
| EAS Submit | latest CLI | Upload to App Store Connect | `eas submit --platform ios` uploads the .ipa to TestFlight automatically. Removes the macOS-only requirement for App Store uploads. |
| EAS Update | latest | OTA JavaScript updates | Post-launch JS/asset fixes without App Store resubmission. Only non-native changes (JS, images, assets). Native code changes require a new EAS Build. |

**Apple Developer Requirements:**
- Apple Developer Program membership ($99/year)
- Bundle identifier registered in App Store Connect (e.g., `com.mohamedkhair.balancetracker`)
- App Store Connect API Key (for automated CI submissions) or Apple ID + App-specific password

**eas.json profile:**
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "production": {
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"
      }
    }
  }
}
```

**Confidence: HIGH** — Verified via [EAS Submit iOS docs](https://docs.expo.dev/submit/ios/) and [EAS Build docs](https://docs.expo.dev/build/introduction/).

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-haptics | SDK 52 | Haptic feedback | Every destructive action (delete confirm), form submit success, toggle switches |
| expo-status-bar | SDK 52 | Status bar light/dark control | Per-screen status bar appearance (light text on dark screens) |
| expo-updates | SDK 52 | OTA update management | After App Store launch — push JS fixes without resubmission |
| expo-constants | SDK 52 | Access `app.json` values at runtime | App version number, build number for Settings → About screen |
| expo-localization | SDK 52 | Device locale detection | Set default language on first launch |
| react-native-safe-area-context | 4.x | Insets for notch/Dynamic Island | Wrap root layout — all screens need safe area insets for iPhone with notch |
| @react-native-async-storage/async-storage | 2.x | Lightweight key-value store | Fast-read cache for theme/language preference (flash prevention before DB loads). Do NOT use for Supabase session — use expo-sqlite localStorage polyfill instead. |

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Expo Go | Development testing on physical device | Limited — some native modules (e.g., @gorhom/bottom-sheet) require a dev build. Use for initial scaffolding only. |
| Expo Dev Build (`expo-dev-client`) | Full-featured development build with custom native modules | Required once @gorhom/bottom-sheet is added. `eas build --profile development` or `npx expo run:ios` locally. |
| Expo EAS CLI | Build and submit | `npm install -g eas-cli` |
| Reactotron or TanStack Query Devtools (Expo plugin) | Debug query state on device | TanStack Query Devtools plugin is now available for Expo — useful for inspecting cache during development |
| TypeScript | 5.x | Same tsconfig as web app (strict mode) | Extend the web tsconfig or create a sibling tsconfig — paths need updating since it's a new repo |

---

## Installation

```bash
# Bootstrap new Expo project with SDK 52
npx create-expo-app@latest balance-tracker-ios --template blank-typescript

# Supabase
npx expo install @supabase/supabase-js react-native-url-polyfill expo-sqlite

# Navigation
npx expo install expo-router react-native-safe-area-context react-native-screens
npx expo install react-native-gesture-handler@~2.22.0 react-native-reanimated@~3.16.7

# Supabase storage (already included in expo-sqlite)

# UI and styling
npm install nativewind
npx expo install tailwindcss

# Forms
npm install react-hook-form zod @hookform/resolvers

# Server state
npm install @tanstack/react-query

# i18n
npm install i18next react-i18next
npx expo install expo-localization

# PDF and file handling
npx expo install expo-print expo-sharing expo-file-system

# Haptics and system
npx expo install expo-haptics expo-status-bar expo-constants expo-updates

# Bottom sheet
npm install @gorhom/bottom-sheet

# Dev
npm install -D @types/react @types/react-native
npx expo install expo-dev-client
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Expo SDK 52 | Expo SDK 53/54/55 | Use SDK 53+ once `@supabase/supabase-js` resolves the Metro ES module `ws/stream` issue upstream. Monitor [supabase-js #1400](https://github.com/supabase/supabase-js/issues/1400). Upgrade path is straightforward. |
| expo-print (HTML→PDF) | @react-pdf/renderer | @react-pdf/renderer does not work in React Native (it requires browser APIs). Only viable if you move PDF generation to a server (Edge Function), which is out of scope per PROJECT.md. |
| expo-sqlite localStorage polyfill | @react-native-async-storage/async-storage | AsyncStorage works and is simpler to reason about. The risk: Supabase sessions exceed 2048 bytes, which will cause failures if expo-secure-store is used for session storage. The expo-sqlite polyfill approach is what Supabase officially recommends as of 2025 — no size limit. |
| expo-sqlite localStorage polyfill | expo-secure-store + MMKV hybrid | More secure (keychain-backed encryption), but complex setup. Use this only if you later add biometric auth or need keychain-backed session security. For v2.0, the simpler expo-sqlite approach is sufficient. |
| NativeWind v4 | Tamagui | Tamagui is slightly more performant but requires learning a new component abstraction. NativeWind shares syntax with Tailwind CSS already used in the web app — this is the deciding factor. |
| NativeWind v4 | Gluestack UI v3 | Gluestack adds better accessibility primitives. Viable alternative — use if accessibility is a primary concern from the start. Adds more package surface area. |
| Expo Router | React Navigation (standalone) | React Navigation standalone gives more granular control but loses file-based routing. Expo Router is built on React Navigation v7 — you can use any React Navigation API within it. No reason to drop Expo Router. |
| react-hook-form + zod | Formik + yup | Formik is older and slower. The codebase already uses react-hook-form + zod on the web; porting is near-trivial. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@react-pdf/renderer` in React Native | Requires browser APIs (`window`, `document`, Canvas). Will error at runtime in React Native's JS environment. | `expo-print` with HTML string template |
| `html2canvas` + jsPDF in React Native | Same problem as above — both libraries require DOM access. Not installable in RN. | `expo-print` |
| `expo-secure-store` alone for Supabase session | 2048-byte size limit; Supabase sessions are larger. Will throw in SDK 35+. | `expo-sqlite/localStorage/install` polyfill |
| `@react-native-async-storage/async-storage` for Supabase session | Not cryptographically secure; also not the official 2025 recommended approach. Fine for non-sensitive preference caching. | `expo-sqlite/localStorage/install` polyfill for session; AsyncStorage only for UI preferences (theme, language bootstrap) |
| Expo SDK 53+ (as of February 2026) | Known Supabase compatibility regression — `ws/stream` Node module error on Metro with default ES module resolution. Workaround exists (disable `unstable_enablePackageExports` in metro.config.js) but is fragile for a fresh project. | Expo SDK 52 until the upstream issue is resolved |
| Zustand / Redux / Jotai | All overkill. This app's global state is: auth session + user settings. Both fit in React Context + React Query. Adding a dedicated state manager adds complexity with no benefit. | React Context for auth/settings, TanStack Query for all server state |
| Expo Go for development of this app | @gorhom/bottom-sheet and other modules with native code cannot run in Expo Go. | `expo-dev-client` development build |
| Class-based React components | Not used anywhere in the web app. Not the RN 2025 standard. | Functional components + hooks throughout |

---

## Version Compatibility Matrix

| Package | SDK 52 Compatible Version | Notes |
|---------|--------------------------|-------|
| expo | ~52.0.0 | Ships RN 0.76, iOS 15.1 min |
| react-native | 0.76.x | New Architecture by default |
| @supabase/supabase-js | 2.x | SDK 52 confirmed compatible. SDK 53+ needs metro workaround. |
| react-native-reanimated | ~3.16.7 | 3.16.1 does not support RN 0.77; 3.16.7+ required for SDK 52 with RN 0.77 patch |
| react-native-gesture-handler | ~2.22.0 | Tested with SDK 52 + RN 0.76/0.77 |
| expo-router | ~4.0.0 | Uses React Navigation v7 |
| nativewind | 4.x | v4.1 (Dec 2025) — CSS variables, dark mode, container queries |
| @gorhom/bottom-sheet | ~5.x | v5 required for New Architecture (RN 0.76+) |
| @tanstack/react-query | 5.x | React Native first-class support confirmed |
| expo-print | ~13.x | Active maintenance confirmed (last published 3 months ago as of research date) |

---

## Stack Patterns by Variant

**If Arabic is the active language:**
- `I18nManager.forceRTL(true)` must be set before app renders
- Use `Start`/`End` logical properties in all StyleSheet objects
- Expo Router's Stack header automatically mirrors for RTL
- expo-print HTML template: set `<html dir="rtl">` and `direction: rtl` in body CSS

**If Advanced Mode is inactive:**
- Clients tab and Invoices screens are not shown (conditional tab rendering)
- All hooks for clients/invoices are never mounted — no unnecessary Supabase queries
- Mode state comes from `user_settings.mode` column, same DB column as web app

**If building a development build (required for @gorhom/bottom-sheet):**
```bash
npx expo run:ios        # local Xcode build (requires macOS + Xcode 15+)
# OR
eas build --profile development --platform ios   # cloud build, no local Xcode needed
```

---

## Sources

- [Expo SDK 52 Changelog](https://expo.dev/changelog/2024-11-12-sdk-52) — RN version, iOS min, New Architecture default — HIGH confidence
- [Expo SDK 53 Changelog](https://expo.dev/changelog/sdk-53) — Supabase ES module incompatibility documented — HIGH confidence
- [supabase-js issue #1400](https://github.com/supabase/supabase-js/issues/1400) — `ws/stream` error on SDK 53 — HIGH confidence (active GitHub issue)
- [supabase-js issue #1403](https://github.com/supabase/supabase-js/issues/1403) — same issue confirmed — HIGH confidence
- [Supabase Expo quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) — expo-sqlite localStorage polyfill, install commands — HIGH confidence
- [Expo print docs](https://docs.expo.dev/versions/latest/sdk/print/) — printToFileAsync API, iOS WKWebView limitation — HIGH confidence
- [Expo Submit iOS docs](https://docs.expo.dev/submit/ios/) — EAS Submit workflow, App Store requirements — HIGH confidence
- [React Native I18nManager docs](https://reactnative.dev/docs/i18nmanager) — forceRTL, requires restart — HIGH confidence
- [NativeWind dark mode docs](https://www.nativewind.dev/docs/core-concepts/dark-mode) — colorScheme API, Expo app.json config — HIGH confidence
- [TanStack Query React Native docs](https://tanstack.com/query/latest/docs/framework/react/react-native) — first-class support confirmed — HIGH confidence
- [react-native-reanimated SDK 52 version](https://expo.dev/changelog/2025-01-21-react-native-0.77) — ~3.16.7 required — HIGH confidence
- [Expo Router introduction](https://docs.expo.dev/router/introduction/) — navigation patterns — HIGH confidence
- [GeekyAnts RTL + Expo guide](https://geekyants.com/blog/implementing-rtl-right-to-left-in-react-native-expo---a-step-by-step-guide) — I18nManager + Updates.reloadAsync pattern — MEDIUM confidence (community source, consistent with official docs)
- [expo-print invoice guide (Jan 2026)](https://anytechie.medium.com/how-to-use-expo-print-complete-guide-to-printing-in-react-native-apps-173fa435dadf) — confirms expo-print remains the current recommendation — MEDIUM confidence (community)

---

*Stack research for: Balance Tracker iOS (React Native port of existing Supabase PWA)*
*Researched: 2026-02-26*
