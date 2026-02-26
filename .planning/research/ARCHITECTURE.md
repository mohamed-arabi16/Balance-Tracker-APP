# Architecture Research: React Native (Expo) iOS Port

**Domain:** Mobile personal finance app — React Native port from existing React web app
**Researched:** 2026-02-26
**Confidence:** HIGH (verified via Expo official docs, Supabase official docs, React Native official docs, TanStack Query docs)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    React Native (Expo) App                        │
├──────────────────────────────────────────────────────────────────┤
│  Expo Router (File-Based)                                         │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────────┐   │
│  │ (auth)/    │  │ (tabs)/     │  │ (advanced)/              │   │
│  │ sign-in    │  │ dashboard   │  │ clients/[id]             │   │
│  │ sign-up    │  │ income      │  │ invoices/[id]            │   │
│  │            │  │ expenses    │  │ invoices/new             │   │
│  │            │  │ debts       │  └──────────────────────────┘   │
│  │            │  │ assets      │                                  │
│  │            │  │ settings    │                                  │
│  └────────────┘  └─────────────┘                                  │
├──────────────────────────────────────────────────────────────────┤
│  Provider Layer (Context — PORTED from web, thin adapters)        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐   │
│  │ Auth     │ │ Theme    │ │ Mode     │ │Currency│ │Date    │   │
│  │ Context  │ │ Context  │ │ Context  │ │Context │ │Context │   │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ └────────┘   │
├──────────────────────────────────────────────────────────────────┤
│  Business Logic Layer (REUSED — hooks + lib functions)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐   │
│  │useIncomes│ │useExpense│ │useClients│ │useDebt │ │useAsset│   │
│  │useInvoi- │ │useUser-  │ │useFilter-│ │useExch-│ │        │   │
│  │  ces     │ │ Settings │ │  edData  │ │ ange   │ │        │   │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ └────────┘   │
│  TanStack React Query (same API, RN-specific config only)         │
├──────────────────────────────────────────────────────────────────┤
│  Data Layer                                                        │
│  ┌──────────────────────────────┐  ┌───────────────────────────┐  │
│  │ Supabase Client (RN adapter) │  │ AsyncStorage + SecureStore│  │
│  │ - expo-secure-store for auth │  │ (no localStorage)         │  │
│  │ - AppState for token refresh │  └───────────────────────────┘  │
│  │ - react-native-url-polyfill  │                                  │
│  └──────────────────────────────┘                                  │
├──────────────────────────────────────────────────────────────────┤
│  External Backend (UNCHANGED — same Supabase project)             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ PostgreSQL DB│  │  Supabase    │  │  Edge Functions        │  │
│  │ (same schema)│  │  Auth (JWT)  │  │  (metal-prices, etc.)  │  │
│  └──────────────┘  └──────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Expo Router file tree | Navigation and deep linking | Files in `src/app/` define screens; `_layout.tsx` configures navigators |
| `(auth)` route group | Auth screens outside the tab bar | Stack navigator, no tab bar, redirects on auth success |
| `(tabs)` route group | Main app screens with bottom tab bar | Bottom tab navigator, each tab is its own stack |
| Stack.Protected | Auth guard — RN equivalent of ProtectedRoute | Expo Router built-in guard based on session state |
| Context providers | Global state (auth, theme, mode, currency, date) | Thin adapters over the ported web contexts |
| Custom hooks (useIncomes, etc.) | All server state and mutations | PORTED from web — same logic, same React Query |
| Supabase RN client | Auth, DB reads/writes, Edge Functions | `@supabase/supabase-js` with `expo-secure-store` adapter |
| expo-print + expo-sharing | PDF generation + native share sheet | Replaces `@react-pdf/renderer` from the web |
| i18next + react-i18next | Multilingual text and RTL switching | PORTED from web; `I18nManager.allowRTL()` for native layout |
| AsyncStorage | Non-sensitive local state (theme, currency cache) | `@react-native-async-storage/async-storage` |
| expo-secure-store | Sensitive storage (Supabase session tokens) | iOS Keychain-backed secure storage |

---

## Reuse vs. Rebuild Decision Map

This is the most important architectural decision for the port.

### REUSE: Port directly with minimal changes

| Layer | What | Change Required |
|-------|------|-----------------|
| TypeScript types | `Income`, `Expense`, `Debt`, `Asset`, `Client`, `Invoice`, all DB types from `integrations/supabase/types.ts` | None — copy unchanged |
| Query keys | `queryKeys.ts` | None — copy unchanged |
| Business logic lib | `lib/currency.ts`, `lib/finance.ts`, `lib/debt.ts`, `lib/insights.ts`, `lib/netWorth.ts`, `lib/locale.ts` | None — pure functions, no DOM/CSS |
| All custom hooks | `useIncomes`, `useExpenses`, `useDebts`, `useAssets`, `useClients`, `useInvoices`, `useUserSettings`, `useExchangeRate`, `useAssetPrices`, `useFilteredData`, `useRecentActivity`, `useLogActivity` | Minor: remove web-only imports (e.g., `trackEvent` from `lib/analytics.ts` if analytics not ported); swap `useAuth` to consume RN-compatible AuthContext |
| Context logic | `ModeContext`, `CurrencyContext`, `DateContext` — the state logic and interfaces | Minor: persistence via AsyncStorage instead of localStorage for CurrencyContext's cached rate |
| i18n translation strings | The entire `resources` object in `src/i18n/index.ts` (all `en` and `ar` translation keys) | None — copy the translation object wholesale |
| Supabase DB types | `src/integrations/supabase/types.ts` | None — same Supabase project |

### REBUILD: Must be written fresh for native

| Layer | What | Why | Native Replacement |
|-------|------|-----|--------------------|
| UI components | Everything in `src/components/ui/` (Shadcn), `src/components/layout/`, `src/components/invoice/`, `src/components/advanced/` | All use DOM elements and Tailwind CSS | React Native core components + NativeWind v4 for styling |
| All page/screen files | Every file in `src/pages/` | Use HTML, `<div>`, DOM events, `useNavigate()` from react-router-dom | Expo Router screen files with `View`, `Text`, `Pressable`, `ScrollView` |
| Navigation | `react-router-dom` with `BrowserRouter`, `Routes`, `Route`, `AdvancedRoute` guard | DOM-based routing | Expo Router file-based routing with `Stack.Protected` |
| Supabase client init | `src/integrations/supabase/client.ts` — uses `localStorage` as auth storage | `localStorage` does not exist in React Native | Re-create with `expo-secure-store` adapter + `AppState` refresh |
| Auth context | `AuthContext.tsx` — session logic is compatible but web-specific details differ | `AppState` handling, no URL-based auth callback on mobile | Re-create with same interface; add `AppState` listener for token auto-refresh |
| Theme context | `ThemeContext.tsx` — uses `document.documentElement.classList` for dark mode | No DOM in React Native | Re-create; use Appearance API + NativeWind dark mode class |
| PDF export | `@react-pdf/renderer` with `dynamic import()` | Does not run in React Native JS environment | `expo-print` (HTML → PDF) + `expo-sharing` (native share sheet) |
| i18n setup | `i18next` init in `src/i18n/index.ts` — the setup glue (not the string resources) | RTL requires `I18nManager.allowRTL()` call on native | Re-create init file; add `I18nManager.allowRTL(true)` in Arabic branch |
| CSS/Tailwind classes | All className strings | No CSS engine in React Native | NativeWind `className` props (compile-time transform to StyleSheet) |
| Toast notifications | `sonner` / Shadcn Sonner | DOM-based | `react-native-toast-message` or similar |

---

## Recommended Project Structure

```
balance-tracker-mobile/          # New standalone Expo project
├── app.json                     # Expo app config
├── eas.json                     # EAS Build profiles (development/preview/production)
├── tsconfig.json
├── babel.config.js              # Required for NativeWind v4
├── metro.config.js              # Required for NativeWind v4
│
└── src/
    ├── app/                     # Expo Router — file = route
    │   ├── _layout.tsx          # Root layout: providers + Stack.Protected auth guard
    │   ├── (auth)/
    │   │   ├── _layout.tsx      # Stack navigator, no tab bar
    │   │   ├── sign-in.tsx
    │   │   └── sign-up.tsx
    │   └── (tabs)/
    │       ├── _layout.tsx      # Bottom tab navigator (iOS tab bar)
    │       ├── index.tsx        # Dashboard tab
    │       ├── income.tsx
    │       ├── expenses.tsx
    │       ├── debts.tsx
    │       ├── assets.tsx
    │       ├── settings.tsx
    │       └── advanced/        # Advanced mode screens (stack within tabs)
    │           ├── index.tsx    # Advanced Dashboard
    │           ├── clients/
    │           │   ├── index.tsx
    │           │   ├── new.tsx
    │           │   ├── [id].tsx
    │           │   └── [id]/edit.tsx
    │           └── invoices/
    │               ├── index.tsx
    │               ├── new.tsx
    │               ├── [id].tsx
    │               └── [id]/edit.tsx
    │
    ├── components/              # REBUILT: native UI components
    │   ├── ui/                  # Design system primitives (Button, Card, Input, etc.)
    │   ├── layout/              # Tab bar, header, safe area wrappers
    │   ├── forms/               # Income form, Expense form, etc.
    │   ├── advanced/            # Client/Invoice-specific components
    │   └── shared/              # DateFilterSelector, modals, badges
    │
    ├── hooks/                   # PORTED: same logic as web
    │   ├── useIncomes.ts        # Port directly — same React Query shape
    │   ├── useExpenses.ts
    │   ├── useDebts.ts
    │   ├── useAssets.ts
    │   ├── useClients.ts
    │   ├── useInvoices.ts
    │   ├── useUserSettings.ts
    │   ├── useExchangeRate.ts
    │   ├── useAssetPrices.ts
    │   ├── useFilteredData.ts
    │   ├── useRecentActivity.ts
    │   └── useLogActivity.ts
    │
    ├── contexts/                # PARTIALLY PORTED (logic) + REBUILT (adapters)
    │   ├── AuthContext.tsx      # Re-built: AppState + SecureStore
    │   ├── ThemeContext.tsx     # Re-built: Appearance API + NativeWind
    │   ├── ModeContext.tsx      # Port: same logic; persistence via user_settings
    │   ├── CurrencyContext.tsx  # Port: swap localStorage cache for AsyncStorage
    │   └── DateContext.tsx      # Port: same, no changes needed
    │
    ├── lib/                     # PORTED: pure functions, zero changes
    │   ├── currency.ts
    │   ├── finance.ts
    │   ├── debt.ts
    │   ├── insights.ts
    │   ├── netWorth.ts
    │   ├── locale.ts
    │   ├── queryKeys.ts
    │   └── supabaseClient.ts    # Re-built: RN-specific init
    │
    ├── i18n/
    │   └── index.ts             # REBUILT init; translation resources PORTED
    │
    ├── integrations/
    │   └── supabase/
    │       ├── client.ts        # REBUILT for RN
    │       └── types.ts         # PORTED — identical copy from web
    │
    └── assets/                  # App icons, splash screens
```

### Structure Rationale

- **`src/app/`:** Expo Router convention — every file is a route. Groups `(auth)` and `(tabs)` use parentheses to prevent their names from appearing in URL paths. Advanced mode screens nest inside `(tabs)/advanced/` rather than a separate group because they use the same tab bar chrome.
- **`src/hooks/`:** Direct port of web hooks. No path aliases needed — Expo supports `tsconfig.json` path aliases identically.
- **`src/lib/`:** Pure TypeScript functions — no DOM, no React Native APIs. Copied unchanged.
- **`src/integrations/supabase/types.ts`:** The generated Supabase types file is identical between web and mobile because both target the same Supabase project. Copy it verbatim.
- **Standalone repo (not monorepo):** See Monorepo Decision below.

---

## Monorepo vs. Separate Repo Decision

**Decision: Separate repo (new standalone Expo project).**

**Rationale:**

Monorepos for React + React Native code sharing work when you use a universal renderer like react-native-web. This project is not doing that — it is building two separate UI layers (Shadcn web UI and native React Native UI). The only shared code is hooks, types, and lib functions — which are simple file copies, not packages that need live synchronization.

The costs of a monorepo (Turborepo/Yarn Workspaces setup complexity, Metro bundler configuration for workspace packages, potential duplicate React instance issues) outweigh the benefit for a two-person or solo project where the shared layer is stable and not changing frequently.

**When to reconsider monorepo:** If you need to ship bug fixes to shared business logic simultaneously to both web and mobile (e.g., a currency conversion bug), a monorepo makes that atomic. At this project's scale, manual copy-paste of the `hooks/` and `lib/` changes to both repos is manageable.

**Practical setup:** Start the React Native project with `npx create-expo-app --template` and immediately copy in the portable layers (hooks, lib, types, translation resources) before writing any UI.

---

## Architectural Patterns

### Pattern 1: Expo Router Stack.Protected for Auth Guard

**What:** Expo Router v3+ provides `Stack.Protected` which conditionally shows or hides an entire route group based on a boolean guard. It is the native equivalent of the web's `<ProtectedRoute>` component.

**When to use:** Replace the web's `ProtectedRoute` component and `AdvancedRoute` component entirely with this pattern.

**Example:**

```typescript
// src/app/_layout.tsx
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const { isAdvanced } = useMode();

  if (loading) return <SplashScreen />;

  return (
    <Stack>
      {/* Always accessible */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />

      {/* Protected — only visible when authenticated */}
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Advanced mode guard */}
      <Stack.Protected guard={!!session && isAdvanced}>
        <Stack.Screen name="(tabs)/advanced" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
```

**Trade-offs:** Expo Router automatically handles redirect to `(auth)` when `guard` is false. No manual `<Navigate>` calls needed. The downside is that route groups must be structured to match guard boundaries.

### Pattern 2: Supabase Client with SecureStore + AppState

**What:** The web Supabase client uses `localStorage` for session persistence. React Native has no `localStorage`. Use `expo-secure-store` as the storage adapter and `AppState` to pause/resume token auto-refresh when the app backgrounds.

**When to use:** The only place this pattern applies is `src/integrations/supabase/client.ts`. All hooks continue to import `supabase` from this file — they are unaware of the storage change.

**Example:**

```typescript
// src/integrations/supabase/client.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import type { Database } from './types';

const ExpoSecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,   // false for native; no URL-based auth callbacks
    },
  }
);

// Pause token refresh when app is in background
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

**Trade-offs:** SecureStore on iOS uses the Keychain (encrypted, sandboxed per-app). This is more secure than `localStorage` on web. The tradeoff is that SecureStore has a 2KB value size limit per item on some iOS versions — Supabase session tokens are within this limit, but large JWT payloads would not be.

### Pattern 3: TanStack React Query with RN Focus/Online Managers

**What:** React Query on web uses window focus events to trigger refetches. React Native has no `window` — it uses `AppState` for focus and `NetInfo` for connectivity. Two one-time configurations wire these up at app startup.

**When to use:** Configure once in `src/app/_layout.tsx` or a dedicated `QueryClientProvider` setup file. All hooks (`useQuery`, `useMutation`) then work identically to web.

**Example:**

```typescript
// src/lib/queryClient.ts
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Wire up focus management
if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (state) => {
      handleFocus(state === 'active');
    });
    return () => subscription.remove();
  });
}

// Wire up online/offline detection
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — same as web
    },
  },
});
```

**Trade-offs:** Without this, React Query won't refetch on app foreground (returning from background) and won't pause queries when offline. These are critical for a finance app where data freshness matters.

### Pattern 4: expo-print for Invoice PDF Generation

**What:** The web app uses `@react-pdf/renderer` which is a virtual DOM-based PDF renderer — it does not run in React Native. On iOS, `expo-print` generates a PDF from an HTML string (rendered by WKWebView headlessly) and saves to the cache directory. `expo-sharing` then presents the native iOS share sheet (save to Files, AirDrop, email attachment, etc.).

**When to use:** Replace the web's `InvoiceDetail.tsx` PDF export button with this native equivalent.

**Example:**

```typescript
// Inside InvoiceDetailScreen.tsx
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const exportInvoicePDF = async (invoice: Invoice, client: Client) => {
  const html = generateInvoiceHTML(invoice, client); // Pure function → HTML string

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Invoice ${invoice.invoice_number}`,
    UTI: 'com.adobe.pdf',           // iOS-specific UTI
  });
};
```

**Trade-offs:** `expo-print` renders HTML via WKWebView, so it supports CSS (including RTL layout for Arabic invoices). However, it cannot load local file assets (images) via file paths — images must be base64-encoded and inlined into the HTML string. This is relevant if the invoice ever includes a user logo. The web's approach used React component rendering; the native approach uses string-based HTML templating, which is less type-safe but simpler.

### Pattern 5: NativeWind v4 for Styling

**What:** NativeWind v4 compiles Tailwind utility class strings (`className="text-lg font-bold"`) into React Native `StyleSheet` objects at build time. This lets you use Tailwind syntax in React Native components without writing `StyleSheet.create()` by hand.

**When to use:** The primary styling approach for all UI components. Enables dark mode via `className="dark:bg-gray-900"` with Expo's `Appearance` API integration.

**Example:**

```typescript
// NativeWind component
import { View, Text, Pressable } from 'react-native';

function IncomeCard({ income }: { income: Income }) {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm">
      <Text className="text-base font-semibold text-gray-900 dark:text-white">
        {income.title}
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {formatCurrency(income.amount, income.currency)}
      </Text>
    </View>
  );
}
```

**Trade-offs:** NativeWind v4 is a significant improvement over v2/v3 but requires Babel and Metro configuration. It does not support all Tailwind classes (e.g., `grid`, `flex-wrap` behaves differently). Some web Shadcn component patterns won't translate directly — each UI primitive must be hand-built for native.

### Pattern 6: i18next with RTL Layout Switching

**What:** The web app's i18n setup uses the same `i18next` library. The translation resources (all `en` and `ar` key-value pairs) can be ported verbatim. The difference on native is that RTL layout requires calling `I18nManager.allowRTL(true)` at app startup and applying it based on selected language.

**When to use:** During app initialization and whenever the user switches language in Settings.

**Important constraint:** `I18nManager.allowRTL()` changes take effect on next app restart. On iOS, you cannot flip RTL at runtime without restarting the app. The UX pattern is: change language → show "Restart required" alert → user taps OK → app restarts. This is a known React Native limitation, verified in official docs.

**Example:**

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';

// PORTED: translation resources copied verbatim from web
import { resources } from './resources'; // en + ar strings

const savedLanguage = await AsyncStorage.getItem('app_language');
const deviceLocale = Localization.getLocales()[0].languageCode;
const language = savedLanguage ?? deviceLocale ?? 'en';

// Apply RTL at startup
I18nManager.allowRTL(language === 'ar');

i18n.use(initReactI18next).init({
  resources,
  lng: language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

---

## Data Flow

### Request Flow

```
User Action (Pressable tap)
    ↓
Screen Component (e.g., income.tsx)
    ↓
Custom Hook (e.g., useAddIncome) → useMutation()
    ↓
fetchFn → supabase.from('incomes').insert(...)
    ↓
Supabase JS Client → HTTPS → Supabase API (unchanged backend)
    ↓
RLS validates user_id = auth.uid()
    ↓
Response ← PostgreSQL DB
    ↓
React Query cache updated → queryClient.invalidateQueries(['incomes', userId])
    ↓
All screens subscribed to that query re-render automatically
```

### Auth Flow (Mobile-Specific Difference)

```
App Launch
    ↓
_layout.tsx mounts → AuthContext checks SecureStore for cached session
    ↓
supabase.auth.getSession() → validates JWT against Supabase
    ↓
  session valid?
  YES: Stack.Protected guard = true → show (tabs)
  NO:  Stack.Protected guard = false → show (auth) screens
    ↓
AppState listener active → foreground → supabase.auth.startAutoRefresh()
AppState listener active → background → supabase.auth.stopAutoRefresh()
```

### State Management Strategy

```
┌───────────────────────────────────────────────────────────┐
│ Server State: TanStack React Query                         │
│   All Supabase data (incomes, expenses, etc.)             │
│   Cached in QueryClient, invalidated on mutation          │
├───────────────────────────────────────────────────────────┤
│ Global UI State: React Context                            │
│   Auth (session), Theme, Mode, Currency, Date             │
│   Same pattern as web — no Zustand needed                 │
├───────────────────────────────────────────────────────────┤
│ Local Screen State: useState / useReducer                 │
│   Form fields, modal open/closed, selected items          │
│   Never lifted above the screen that owns it              │
├───────────────────────────────────────────────────────────┤
│ Persistent Local State: AsyncStorage                      │
│   Language preference, currency exchange rate cache       │
│   Non-sensitive only                                      │
├───────────────────────────────────────────────────────────┤
│ Secure Persistent State: expo-secure-store                │
│   Supabase session tokens (JWT)                           │
│   Managed entirely by Supabase JS client                  │
└───────────────────────────────────────────────────────────┘
```

---

## Build Order

Dependencies between components determine the correct build sequence. Each phase must complete before work blocked on it can begin.

### Phase 0: Project Bootstrap (no features)

Must happen first — establishes the foundation everything else builds on.

1. `npx create-expo-app balance-tracker-mobile --template` with TypeScript
2. Install core dependencies: Expo Router, NativeWind v4, TanStack Query, Supabase JS, expo-secure-store, AsyncStorage, react-native-url-polyfill, expo-localization, i18next, react-i18next, @react-native-community/netinfo
3. Configure NativeWind (babel.config.js + metro.config.js + global.css)
4. Configure EAS Build (`eas.json` with development/preview/production profiles)
5. Copy portable layers from web project: `hooks/`, `lib/` (pure functions), `integrations/supabase/types.ts`, `i18n/resources` (translation strings)
6. Write `src/integrations/supabase/client.ts` — the RN-specific Supabase init
7. Configure React Query: `queryClient.ts` with AppState focus manager + NetInfo online manager
8. Set up i18n init with RTL support

### Phase 1: Auth Shell

Must come before any screen that checks authentication.

1. `AuthContext.tsx` — wraps Supabase auth, exposes session + loading state, handles AppState token refresh
2. Root `_layout.tsx` — assembles all providers, implements `Stack.Protected` auth guard
3. `(auth)/_layout.tsx` + `sign-in.tsx` + `sign-up.tsx` screens — native UI equivalents of web SignIn/SignUp pages
4. Verify: launching the app with no session lands on sign-in; signing in lands on (tabs); signing out returns to (auth)

### Phase 2: Navigation Shell + Tab Bar

Must come after Phase 1 (auth context required) and before any feature screens.

1. `(tabs)/_layout.tsx` — bottom tab bar with correct iOS HIG patterns (icons, labels, colors)
2. ThemeContext — Appearance API integration, NativeWind dark mode
3. ModeContext — port from web, persists to `user_settings.app_mode` via useUserSettings hook
4. Stub screens for each tab (Dashboard, Income, Expenses, Debts, Assets, Settings) — empty Views that prove navigation works
5. Verify: all tabs reachable, tab bar renders correctly on iOS, dark mode switches properly

### Phase 3: Simple Mode Screens

Must come after Phase 2 (navigation shell). Build in this order (most critical first):

1. **Dashboard screen** — net worth calculation, income/expense summary cards; depends on useIncomes, useExpenses, useDebts, useAssets
2. **Income screen** — list + add/edit/delete modal; depends on useIncomes
3. **Expenses screen** — list + add/edit/delete modal; depends on useExpenses
4. **Debts screen** — list + debt history modal; depends on useDebts
5. **Assets screen** + **EditAssetScreen** — list + edit; depends on useAssets, useAssetPrices
6. **Settings screen** — theme toggle, currency selector, language selector, mode toggle

Each screen requires: a native UI component tree, NativeWind styling, form components (TextInput, Picker, DateTimePicker), and connection to the ported hook.

### Phase 4: Advanced Mode Screens

Must come after Phase 3 (hooks already proven, QueryClient configured). The `Stack.Protected guard={isAdvanced}` in `_layout.tsx` prevents access until enabled in Settings.

1. Advanced Dashboard screen — compose RevenuePerClientWidget, OutstandingInvoicesWidget using cached hook data
2. Clients list + new/edit screens — useClients hook already ported; build native UI
3. Client detail screen — transaction history, linked invoices
4. Invoices list + new/edit screens — useInvoices hook already ported; line item editor
5. Invoice detail screen — view, status updates

### Phase 5: PDF Export + App Store Polish

Must come after Phase 4 (invoice UI complete). No functional dependencies — this is additive.

1. Implement `exportInvoicePDF()` using expo-print + expo-sharing on InvoiceDetail screen
2. RTL layout verification for Arabic — test all screens with language set to Arabic
3. App icon + splash screen setup in `app.json`
4. EAS Build configuration for App Store submission
5. Privacy manifest (required by Apple as of 2024 for apps using certain APIs)
6. `eas submit` workflow to TestFlight, then App Store

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `supabase.auth.*` — same API as web | Storage adapter changes to SecureStore; same JWT, same RLS |
| Supabase DB | `supabase.from('table').*` — identical to web hooks | No changes to queries or mutations once client is initialized correctly |
| Supabase Edge Functions | `supabase.functions.invoke('metal-prices')` — identical to web | Works in RN without any changes |
| expo-print | `Print.printToFileAsync({ html })` | Replaces @react-pdf/renderer; HTML template in pure TS |
| expo-sharing | `Sharing.shareAsync(uri)` | iOS share sheet — user saves to Files, AirDrop, email, etc. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Screens ↔ Hooks | Direct import + React Query cache | Hooks are isolated from UI — portable pattern works |
| Hooks ↔ Supabase client | Import from `@/integrations/supabase/client` | Single client instance per app, same pattern as web |
| Contexts ↔ Screens | React Context + custom `use*` hooks | Same pattern as web; no prop drilling |
| i18n ↔ Screens | `useTranslation()` hook from react-i18next | Same API as web — translation keys unchanged |
| NativeWind ↔ Components | `className` prop | Compiled at build time; no runtime CSS parsing |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Importing Web UI Components into React Native

**What people do:** Try to import Shadcn components or HTML-dependent components into the RN codebase, hoping they will work.

**Why it's wrong:** Shadcn components render HTML elements (`<div>`, `<button>`, etc.) which do not exist in React Native. The build will fail with "Cannot read properties of undefined (reading 'createElement')".

**Do this instead:** Accept that all UI is a rebuild. The hooks and lib functions are the reusable layer. UI is always native-specific.

### Anti-Pattern 2: Using localStorage in the Supabase Client

**What people do:** Copy the web's `client.ts` directly, keep `storage: localStorage`.

**Why it's wrong:** `localStorage` is a browser API. React Native's JS environment does not have it. The app will crash immediately on launch with "localStorage is not defined".

**Do this instead:** Use the `ExpoSecureStoreAdapter` pattern shown in Pattern 2 above. This is a one-line change at initialization — all hooks remain identical.

### Anti-Pattern 3: Calling I18nManager.forceRTL() in Production

**What people do:** Call `I18nManager.forceRTL(true)` when the user switches language to Arabic, expecting RTL to flip immediately.

**Why it's wrong:** `forceRTL()` is documented as a development/testing tool. It requires a full app restart to take effect. In production, calling it without restarting creates partially RTL layouts that are visually broken.

**Do this instead:** Call `I18nManager.allowRTL(true)` at app startup (before the first render) based on the persisted language preference, then prompt for restart when the user changes language at runtime.

### Anti-Pattern 4: Separate QueryClient Instances for Auth and Feature Queries

**What people do:** Create a second QueryClient for authenticated queries to "isolate" them.

**Why it's wrong:** React Query's cache invalidation relies on a single QueryClient. Multiple instances cannot invalidate each other's caches, leading to stale data after mutations.

**Do this instead:** One QueryClient for the entire app, initialized once in `_layout.tsx`. Clear the cache on sign-out by calling `queryClient.clear()`.

### Anti-Pattern 5: Monorepo with Metro + Webpack Shared Packages Without Proper Config

**What people do:** Set up a monorepo with a `packages/shared` folder, reference it from both the web (Vite) and mobile (Expo/Metro) apps, without configuring Metro's `watchFolders`.

**Why it's wrong:** Metro bundler (used by Expo) does not watch files outside its project root by default. Shared packages in a monorepo are silently not watched, causing stale builds or "module not found" errors.

**Do this instead:** For this project, use a separate repo with manual file synchronization. If a monorepo becomes necessary later, configure `watchFolders` and `extraNodeModules` in `metro.config.js`, and ensure there is only one `react` and `react-native` installation across the workspace.

---

## Scalability Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Single Supabase project, no changes needed. RN app talks directly to same DB as web users. |
| 1k–10k users | No architecture changes needed. Supabase handles this tier with default connection pooling (PgBouncer). React Query caching reduces DB reads. |
| 10k+ users | Supabase compute upgrade; consider read replicas for the asset price Edge Function. RN client is unaffected — all scaling is backend-side. |

**First bottleneck at scale:** The `metal-prices` Edge Function (called by `useAssetPrices`) makes external API calls to a metals price provider. Under high concurrency, this may hit rate limits. Solution: cache at the Edge Function level with a TTL, not in the client.

---

## Sources

- Expo Router authentication docs: https://docs.expo.dev/router/advanced/authentication/ (HIGH confidence — official docs)
- Expo Router core concepts: https://docs.expo.dev/router/basics/core-concepts/ (HIGH confidence — official docs)
- Expo Router tab navigation: https://docs.expo.dev/router/advanced/tabs/ (HIGH confidence — official docs)
- Supabase Auth with React Native: https://supabase.com/docs/guides/auth/quickstarts/react-native (HIGH confidence — official docs)
- Using Supabase with Expo: https://docs.expo.dev/guides/using-supabase/ (HIGH confidence — official docs)
- React Native I18nManager (RTL): https://reactnative.dev/docs/i18nmanager (HIGH confidence — official docs)
- expo-print documentation: https://docs.expo.dev/versions/latest/sdk/print/ (HIGH confidence — official docs)
- Expo New Architecture (SDK 55 mandatory): https://docs.expo.dev/guides/new-architecture/ (HIGH confidence — official docs)
- TanStack Query React Native docs: https://tanstack.com/query/latest/docs/framework/react/react-native (HIGH confidence — official docs, verified via search)
- NativeWind v4: https://www.nativewind.dev/docs/getting-started/installation (MEDIUM confidence — official site, version details verified)
- expo-print HTML-to-PDF pattern: https://anytechie.medium.com/how-to-use-expo-print-complete-guide-to-printing-in-react-native-apps-173fa435dadf (MEDIUM confidence — aligns with official expo-print docs)
- Monorepo code sharing patterns: Multiple sources including https://nx.dev/blog/share-code-between-react-web-react-native-mobile-with-nx (MEDIUM confidence — confirmed by multiple independent sources)

---

*Architecture research for: React Native (Expo) iOS port of Balance Tracker web app*
*Researched: 2026-02-26*
