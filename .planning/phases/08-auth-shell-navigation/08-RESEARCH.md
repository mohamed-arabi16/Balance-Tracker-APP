# Phase 8: Auth Shell + Navigation — Research

**Researched:** 2026-02-26
**Domain:** Expo Router authentication, Supabase auth, React Native tab navigation, SF Symbols
**Confidence:** HIGH

---

## Summary

Phase 8 wires the authentication shell around the existing Phase 7 infrastructure. The Supabase client is already built with session persistence via expo-sqlite localStorage polyfill, and the AuthContext stub is already in place — Phase 8 replaces the stub with a real implementation. The root layout already has i18n initialization, ThemeProvider, SafeAreaProvider, and QueryClientProvider stacked; AuthProvider slots directly into that tree.

Expo Router SDK 54 (installed as the project's current version) supports `Stack.Protected` with a `guard` prop for client-side auth protection. This is the correct and current pattern — the older `useSegments + useRouter().replace()` redirect approach still works but is the legacy alternative; `Stack.Protected` is cleaner and handles auth state changes automatically, including deep link redirects. For the tab bar, the standard `Tabs` component from `expo-router` with `tabBarIcon` using `SymbolView` from `expo-symbols` achieves native SF Symbols on iOS — this is available in Expo Go for iOS.

The two plans outlined in ROADMAP.md are correct: Plan 1 builds real AuthContext + auth screens (sign-in, sign-up, forgot password), Plan 2 builds the root auth guard, the 5-tab layout, and stub screens per tab.

**Primary recommendation:** Use `Stack.Protected guard={!!session}` at the root layout level, with `AuthProvider` wrapping the app. `onAuthStateChange` in AuthContext drives session state, replacing the placeholder stub from Phase 7.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up with email and password | `supabase.auth.signUp({ email, password })` — confirmed in supabase-js docs |
| AUTH-02 | User can log in and stay logged in across app restarts (session persisted via expo-sqlite) | `supabase.auth.signInWithPassword()` + expo-sqlite localStorage polyfill already configured in Phase 7 client; `onAuthStateChange` keeps session in state |
| AUTH-03 | User can log out from Settings | `supabase.auth.signOut()` + AuthContext `signOut()` method |
| AUTH-04 | User can reset password via email link | `supabase.auth.resetPasswordForEmail(email)` — confirmed in supabase-js docs |
| AUTH-05 | Unauthenticated users are redirected to login screen | `Stack.Protected guard={!!session}` in root `_layout.tsx` — confirmed in Expo Router docs |
| FOUND-04 | Tab bar navigation with 5 sections (Dashboard, Transactions, Debts, Assets, More) using SF Symbols icons | `Tabs` component with `tabBarIcon` using `SymbolView` from `expo-symbols` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-router` | ~6.0.23 (already installed) | `Stack.Protected` auth guard, `Tabs` layout | File-system routing; built-in auth patterns |
| `@supabase/supabase-js` | ^2.97.0 (already installed) | `signUp`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, `onAuthStateChange` | Already configured in Phase 7 |
| `expo-symbols` | (install needed) | `SymbolView` for native SF Symbols in tab bar icons | Native iOS symbols, included in Expo Go |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | ^5.90.21 (already installed) | Invalidate queries on sign-out | Already in queryClient; call `queryClient.clear()` on sign-out |
| `expo-haptics` | already installed | Haptic on successful sign-in/sign-out | Use `haptics.onSave()` on success, `haptics.onError()` on auth error |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Stack.Protected` | `useSegments + useRouter().replace()` redirect | Legacy approach, more imperative, fragile with deep links; `Stack.Protected` is the current Expo-recommended pattern |
| `expo-symbols` (SymbolView) | `@expo/vector-icons` (Ionicons) | Ionicons look like web icons; SymbolView renders true native SF Symbols matching iOS system UI |
| `expo-symbols` (SymbolView) | `NativeTabs` from `expo-router/unstable-native-tabs` | NativeTabs is unstable (beta); standard `Tabs` with SymbolView in `tabBarIcon` is stable |

**Installation (only expo-symbols is new):**
```bash
npx expo install expo-symbols
```

---

## Architecture Patterns

### Recommended Project Structure
```
app/
├── _layout.tsx              # Root: providers + Stack.Protected auth gate
├── (auth)/
│   ├── _layout.tsx          # Auth stack (no tab bar)
│   ├── sign-in.tsx          # Login screen
│   ├── sign-up.tsx          # Registration screen
│   └── forgot-password.tsx  # Password reset request screen
└── (tabs)/
    ├── _layout.tsx          # Tab bar (5 tabs)
    ├── index.tsx            # Dashboard tab (stub for Phase 10)
    ├── transactions/
    │   └── index.tsx        # Transactions tab (stub for Phase 9)
    ├── debts/
    │   └── index.tsx        # Debts tab (stub for Phase 9)
    ├── assets/
    │   └── index.tsx        # Assets tab (stub for Phase 9)
    └── settings.tsx         # Settings / More tab (log out lives here)

src/contexts/
└── AuthContext.tsx          # Replace stub — real Supabase auth
```

### Pattern 1: Stack.Protected Auth Guard (Root Layout)

**What:** Wraps authenticated and unauthenticated route groups in `Stack.Protected` with inverse guards. When `session` is truthy, the `(tabs)` group is accessible and `(auth)` is hidden; when `session` is null, the reverse is true. Auth state changes trigger automatic redirect — no imperative `router.replace()` needed.

**When to use:** At the root `_layout.tsx` level, always. This is the single source of truth for authentication routing.

**Example:**
```typescript
// Source: https://docs.expo.dev/router/advanced/protected/
// app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootNavigator() {
  const { session, isLoading } = useAuth();

  // While loading, show nothing (splash screen handles this)
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth screens — accessible when NOT logged in */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* App shell — accessible when logged in */}
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
      <PrivacyOverlay />
    </SafeAreaProvider>
  );
}
```

### Pattern 2: Real AuthContext (replacing Phase 7 stub)

**What:** Replaces the Phase 7 no-op AuthContext stub with real Supabase auth. Subscribes to `onAuthStateChange` for session state, exposes `signIn`, `signUp`, `signOut`, and `resetPassword` methods. Initializes by calling `supabase.auth.getSession()` on mount.

**When to use:** Phase 8 Plan 1 — first task is replacing the stub before building auth screens.

**Example:**
```typescript
// Source: https://context7.com/supabase/supabase-js/llms.txt
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hydrate from persisted session (expo-sqlite localStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear(); // Clear cached user data on logout
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      isLoading,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### Pattern 3: 5-Tab Layout with SF Symbols

**What:** The `(tabs)/_layout.tsx` defines the tab bar. Each `Tabs.Screen` receives a `tabBarIcon` function that returns a `SymbolView` component using SF Symbol names. The `color` parameter from the icon function carries the active/inactive tint automatically.

**When to use:** Phase 8 Plan 2, after the auth guard is established.

**Example:**
```typescript
// Source: https://docs.expo.dev/router/advanced/tabs/ + https://docs.expo.dev/versions/latest/sdk/symbols/
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',     // iOS system blue
        tabBarInactiveTintColor: '#8E8E93',   // iOS system gray
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <SymbolView name="house.fill" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }) => (
            <SymbolView name="list.bullet" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: 'Debts',
          tabBarIcon: ({ color }) => (
            <SymbolView name="creditcard.fill" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Assets',
          tabBarIcon: ({ color }) => (
            <SymbolView name="chart.bar.fill" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <SymbolView name="ellipsis.circle.fill" tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**SF Symbol names for this app (verified by category):**
| Tab | SF Symbol | Rationale |
|-----|-----------|-----------|
| Dashboard | `house.fill` | Standard iOS home/dashboard |
| Transactions | `list.bullet` | List view |
| Debts | `creditcard.fill` | Credit/debt |
| Assets | `chart.bar.fill` | Financial chart |
| More/Settings | `ellipsis.circle.fill` | "More" pattern (used by iOS App Store, Maps) |

### Pattern 4: Auth Screens (Sign-in, Sign-up, Forgot Password)

**What:** Three screens inside `(auth)/` group. Stack layout with no tab bar. Each uses `FormScreen` (already built in Phase 7) for keyboard avoidance. Auth form fields use controlled React state with `useState`.

**Sign-in screen key requirements:**
- Email + password fields
- "Sign in" button → calls `signIn()` from `useAuth()`
- Link to sign-up screen
- Link to forgot-password screen
- Error display on failure
- `haptics.onSave()` on success, `haptics.onError()` on failure

**Sign-up screen key requirements:**
- Email + password + confirm password fields
- "Create Account" button → calls `signUp()` from `useAuth()`
- Supabase email confirmation: after `signUp()` success, show "Check your email" message (Supabase sends confirmation email by default)
- Link back to sign-in

**Forgot-password screen key requirements:**
- Email field only
- "Send Reset Link" button → calls `resetPassword()` from `useAuth()`
- Success state showing "Email sent" message
- Back navigation to sign-in

**Example (sign-in screen pattern):**
```typescript
// app/(auth)/sign-in.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Link } from 'expo-router';
import { FormScreen } from '@/components/layout/FormScreen';
import { useAuth } from '@/contexts/AuthContext';
import { haptics } from '@/lib/haptics';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      haptics.onError();
      Alert.alert('Sign in failed', error.message);
    } else {
      haptics.onSave();
      // Navigation is automatic via Stack.Protected
    }
    setLoading(false);
  };

  return (
    <FormScreen>
      {/* form fields */}
    </FormScreen>
  );
}
```

### Pattern 5: Settings Tab — Sign Out

**What:** The Settings/More tab is where sign-out lives (per AUTH-03 requirement). A "Sign Out" button in Settings calls `signOut()` from `useAuth()`. After sign-out, `onAuthStateChange` sets `session` to null, `Stack.Protected` re-evaluates, and the user is automatically navigated to `(auth)/sign-in`. No manual navigation needed.

**Pattern:**
```typescript
// In settings.tsx
const { signOut } = useAuth();

const handleSignOut = async () => {
  haptics.onDelete();
  await signOut();
  // Stack.Protected handles the redirect automatically
};
```

### Anti-Patterns to Avoid

- **Using `useRouter().replace('/(auth)/sign-in')` for redirect:** Stack.Protected handles this automatically. Manual redirects fight the guard and can cause flash or redirect loops.
- **Loading Supabase `getUser()` on every render for auth check:** Only call `getSession()` once on mount in AuthContext. Use the local `session` state for all auth checks throughout the app.
- **Calling `queryClient.clear()` inside `onAuthStateChange`:** This causes a query invalidation loop because clearing triggers component re-renders which re-subscribe. Call `queryClient.clear()` only in the explicit `signOut()` function.
- **Showing tab bar for unauthenticated users:** `(tabs)` group is inside `Stack.Protected guard={!!session}` — unauthenticated users never see the tab bar. Do not conditionally hide tabs inside the tab layout.
- **Not unsubscribing from `onAuthStateChange`:** Always return `() => subscription.unsubscribe()` from the `useEffect` cleanup or you get memory leaks and duplicate state updates.
- **Using `expo-secure-store` for session storage:** The Phase 7 decision stands — expo-secure-store has a 2KB per-item limit; Supabase sessions exceed it. The expo-sqlite localStorage polyfill is already configured and handles this.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth redirect on session change | Custom `useEffect` + `router.replace()` | `Stack.Protected guard={!!session}` | Guard re-evaluates on every auth state change automatically; hand-rolled redirects miss edge cases (deep links, back navigation) |
| Session persistence | AsyncStorage wrapper for tokens | expo-sqlite localStorage polyfill (already configured) | Already handles serialization, no size limit, officially supported by Supabase |
| Password validation | Custom regex validation | Simple `password.length >= 6` check + Supabase server validation | Supabase rejects weak passwords server-side; client validation is just UX feedback |
| Auth error messages | Map Supabase error codes | Pass `error.message` from Supabase directly | Supabase error messages are user-readable ("Invalid login credentials", etc.) |

**Key insight:** `Stack.Protected` eliminates an entire category of session-sync bugs. Every manual redirect solution eventually has a race condition or back-navigation escape — the guard is evaluated before the screen renders.

---

## Common Pitfalls

### Pitfall 1: Flash of Unauthenticated Content

**What goes wrong:** The app renders briefly in an unauthenticated state before `getSession()` resolves, showing the sign-in screen to a logged-in user or (worse) the tab bar to an unauthenticated user.

**Why it happens:** `isLoading` starts as `true` but the guard `!!session` evaluates to `false` before the initial session is hydrated from storage.

**How to avoid:** In `RootNavigator`, return `null` while `isLoading` is true. The splash screen (already set up in `_layout.tsx` via `SplashScreen.preventAutoHideAsync()`) remains visible during this window. Hide the splash screen ONLY after `isLoading` becomes false — move `SplashScreen.hideAsync()` into `AuthContext` after `getSession()` resolves, OR keep it in `_layout.tsx` and pass an `onReady` callback.

**Warning signs:** User briefly sees sign-in screen on app launch even though already logged in.

### Pitfall 2: Supabase Email Confirmation Requiring Extra Sign-in Step

**What goes wrong:** After `signUp()` succeeds, Supabase returns a session if email confirmation is disabled. But if email confirmation IS enabled (Supabase default), `signUp()` returns `{ user, session: null }` — the user must confirm before they get a session.

**Why it happens:** Supabase projects enable email confirmation by default.

**How to avoid:** Check the Supabase dashboard setting "Confirm email" under Authentication > Providers > Email. For the app's dev phase, either: (a) disable email confirmation in the Supabase dashboard, or (b) detect `session === null` after `signUp()` and show "Check your email to confirm your account" UI state before attempting to navigate.

**Warning signs:** Sign-up appears to succeed but user is not logged in and `Stack.Protected` does not navigate to tabs.

### Pitfall 3: `expo-symbols` SymbolView Requires iOS

**What goes wrong:** `SymbolView` renders nothing on Android/web. Since this project is iOS-only for v2.0, this is acceptable — but the import must still not crash on non-iOS platforms.

**Why it happens:** SF Symbols are an Apple-exclusive technology. `expo-symbols` gracefully renders nothing on Android, but calling it still works.

**How to avoid:** Since the project targets iOS only (app.json has no android adaptive icon logic that would run), this is a non-issue for v2.0. Document that Android support in v2.x would need fallback icons (Ionicons or MaterialIcons per SF Symbol name).

**Warning signs:** Nothing — it silently renders nothing on non-iOS. Only becomes visible if Android is added.

### Pitfall 4: SplashScreen Hide Timing

**What goes wrong:** SplashScreen.hideAsync() was moved to `_layout.tsx` in Phase 7 after `initI18n()`. Phase 8 adds `isLoading` from AuthContext. If the splash is hidden after i18n but before auth resolves, there is a brief flash of the auth decision being made.

**Why it happens:** i18n resolves first (synchronous once loaded), auth resolves second (network call to Supabase or storage read).

**How to avoid:** The `_layout.tsx` currently hides splash after `initI18n()`. The `RootNavigator` returns `null` while `isLoading` is true — the screen renders nothing during the gap, but the splash is already gone. This is acceptable UX (blank white screen for ~100ms). An alternative is to delay `SplashScreen.hideAsync()` until both `i18nReady` AND `!isLoading` are true by moving the hide call into `RootNavigator`.

**Warning signs:** Brief white flash between splash hide and tab bar/auth screen appearing on cold start.

### Pitfall 5: `(auth)` Layout Missing `headerShown: false`

**What goes wrong:** A navigation header appears on auth screens with a back arrow pointing into the app.

**Why it happens:** The root Stack shows headers by default.

**How to avoid:** Set `<Stack screenOptions={{ headerShown: false }}>` in `app/(auth)/_layout.tsx` AND in `app/_layout.tsx`'s root Stack. Alternatively use a `Stack.Screen` with `options={{ headerShown: false }}` for the `(auth)` group.

**Warning signs:** Header bar appears on sign-in screen with back arrow to nowhere.

### Pitfall 6: `queryClient.clear()` on Sign-Out Required

**What goes wrong:** After sign-out, stale query cache from the previous user's session remains in memory. If user A signs out and user B signs in on the same device, user B briefly sees user A's data while React Query refetches.

**Why it happens:** TanStack Query's `queryClient` cache persists across auth state changes unless explicitly cleared.

**How to avoid:** `queryClient.clear()` is already called in the `signOut()` implementation pattern above. Ensure this is part of the `signOut()` function in AuthContext, not in an `onAuthStateChange` listener.

---

## Code Examples

Verified patterns from official sources:

### Supabase: Full Auth Method Reference
```typescript
// Source: https://context7.com/supabase/supabase-js/llms.txt

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});
// data.session is null if email confirmation required
// data.user is populated immediately

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
// data.session is the active session

// Sign out
const { error } = await supabase.auth.signOut();
// scope: 'local' (default) — signs out current device only

// Password reset (sends email)
const { error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  // redirectTo is optional for native apps — Supabase handles the email link
);

// Get current session (called once on auth init)
const { data: { session } } = await supabase.auth.getSession();

// Subscribe to auth state changes
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    // event: SIGNED_IN | SIGNED_OUT | TOKEN_REFRESHED | PASSWORD_RECOVERY | etc.
    setSession(session);
  }
);
return () => subscription.unsubscribe();
```

### Expo Router: Stack.Protected with Tabs
```typescript
// Source: https://docs.expo.dev/router/advanced/protected/
// Tabs.Protected works identically to Stack.Protected:
<Tabs>
  <Tabs.Protected guard={isLoggedIn}>
    <Tabs.Screen name="private" options={{ tabBarLabel: 'Private' }} />
  </Tabs.Protected>
</Tabs>

// For this app: entire (tabs) group is guarded at the Stack level in _layout.tsx
// Individual tab screens do NOT need Tabs.Protected
```

### expo-symbols: SymbolView in tabBarIcon
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/symbols/
import { SymbolView } from 'expo-symbols';

// In Tabs.Screen options:
tabBarIcon: ({ color }) => (
  <SymbolView
    name="house.fill"      // SF Symbol name
    tintColor={color}      // active/inactive color handled by Tabs
    size={24}              // consistent size across all tabs
    type="monochrome"      // single-color for tab bar (matches iOS system behavior)
  />
)
```

### Splash Screen Coordination Pattern
```typescript
// Coordinating i18n (existing) + auth (Phase 8) before hiding splash
// Option: Move SplashScreen.hideAsync() from _layout.tsx to RootNavigator

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const [splashHidden, setSplashHidden] = useState(false);

  useEffect(() => {
    if (!isLoading && !splashHidden) {
      SplashScreen.hideAsync().catch(() => {});
      setSplashHidden(true);
    }
  }, [isLoading, splashHidden]);

  if (isLoading) return null;
  // ... Stack.Protected logic
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useSegments + useRouter().replace()` redirect | `Stack.Protected guard={condition}` | Expo Router SDK 53+ | Eliminates redirect race conditions and deep link escape bugs |
| `expo-secure-store` for Supabase sessions | `expo-sqlite/localStorage/install` polyfill | Supabase RN guide update ~2024 | Removes 2KB size limit that breaks on large sessions |
| `useSegments` to detect `(auth)` vs `(tabs)` | File-system group conventions + `Stack.Protected` | Expo Router v3+ | Auth logic in layout files, not in `useEffect` watchers |

**Deprecated/outdated:**
- `expo-secure-store` as Supabase session storage: 2KB limit exceeded by Supabase JWT tokens; replaced by expo-sqlite polyfill (already done in Phase 7)
- `useSegments + useRouter` pattern: still works but is the legacy approach; `Stack.Protected` is the current Expo official recommendation

---

## Phase 8 Build Sequence (Recommended Plan Split)

The ROADMAP.md Plan split is correct. Here is the precise sequencing with file ownership:

**Plan 08-01: Real AuthContext + auth screens**
1. Replace stub `src/contexts/AuthContext.tsx` with real Supabase auth (getSession, onAuthStateChange, signIn, signUp, signOut, resetPassword)
2. Install `expo-symbols` package
3. Create `app/(auth)/_layout.tsx` — Stack with headerShown: false
4. Create `app/(auth)/sign-in.tsx` — email/password form, link to sign-up and forgot-password
5. Create `app/(auth)/sign-up.tsx` — email/password/confirm form, "check email" success state
6. Create `app/(auth)/forgot-password.tsx` — email form, "email sent" success state
7. Verify: TypeScript zero errors, all auth methods callable

**Plan 08-02: Root auth guard + tab navigation + stub screens**
1. Update `app/_layout.tsx` — add `AuthProvider`, wire `RootNavigator` with `Stack.Protected`, move `SplashScreen.hideAsync()` to after auth resolves
2. Create `app/(tabs)/_layout.tsx` — 5-tab Tabs layout with SymbolView icons
3. Create `app/(tabs)/index.tsx` — Dashboard stub with SafeScreen + placeholder text
4. Create `app/(tabs)/transactions/index.tsx` — Transactions stub
5. Create `app/(tabs)/debts/index.tsx` — Debts stub
6. Create `app/(tabs)/assets/index.tsx` — Assets stub
7. Create `app/(tabs)/settings.tsx` — Settings stub with sign-out button (functional)
8. Verify all 5 Phase 8 success criteria on physical device

---

## Open Questions

1. **Email confirmation enabled or disabled in Supabase project?**
   - What we know: Supabase enables email confirmation by default. Phase 7 did not configure this.
   - What's unclear: Whether the existing Supabase project has email confirmation on or off.
   - Recommendation: In `sign-up.tsx`, always handle `session === null` after `signUp()` with a "check your email" state — this works whether confirmation is on or off. When off, `onAuthStateChange` fires SIGNED_IN immediately and the guard redirects to tabs. When on, user sees the message and must confirm before the guard fires.

2. **Password reset deep link handling on iOS**
   - What we know: `resetPasswordForEmail()` sends an email with a link. In web apps, the link redirects to a URL. In native apps, the link must redirect to the app via deep link (the `scheme` in `app.json`).
   - What's unclear: Whether the Supabase project has the deep link URL configured. For Phase 8, the reset email can redirect to the web Supabase-hosted auth page — the user resets via browser, then signs in again in the app. Full in-app deep link handling is a Phase 12 concern.
   - Recommendation: For Phase 8, use `supabase.auth.resetPasswordForEmail(email)` without `redirectTo`. Supabase will send a link that opens in the browser for password reset. Document this as a Phase 12 improvement.

3. **SplashScreen timing coordination**
   - What we know: Phase 7 moved `SplashScreen.hideAsync()` into `_layout.tsx` after `initI18n()`. Auth resolution now also needs to happen before showing content.
   - What's unclear: Whether the i18n gate + auth gate can be coordinated cleanly or if a brief flash is acceptable.
   - Recommendation: Move `SplashScreen.hideAsync()` into `RootNavigator` so it fires after both `i18nReady` (already gating render in `_layout.tsx`) and `!isLoading` (from AuthContext). This eliminates any flash.

---

## Sources

### Primary (HIGH confidence)
- `/supabase/supabase-js` (Context7) — `signUp`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, `onAuthStateChange`, `getSession` API
- `https://docs.expo.dev/router/advanced/protected/` — `Stack.Protected guard` pattern, auto-redirect on auth state change, `Tabs.Protected` syntax
- `https://docs.expo.dev/router/advanced/authentication/` — `SessionProvider` + `SplashScreenController` pattern, SDK 53+ requirement
- `https://docs.expo.dev/versions/latest/sdk/symbols/` — `SymbolView` component, `tintColor`, `name`, `size`, `type` props
- `https://docs.expo.dev/router/advanced/tabs/` — `Tabs` component, `tabBarIcon`, `tabBarActiveTintColor`, `href: null` to hide tabs
- Phase 7 SUMMARY files (07-01, 07-02, 07-03) — established patterns, decisions, provider stack

### Secondary (MEDIUM confidence)
- `https://expo.dev/blog/simplifying-auth-flows-with-protected-routes` — confirmed `Stack.Protected` as current recommended pattern (verified against official docs)
- WebSearch results confirming `Tabs.Protected` extends to tab navigators (identical `Stack.Protected` syntax)

### Tertiary (LOW confidence)
- SF Symbol name choices (house.fill, list.bullet, creditcard.fill, chart.bar.fill, ellipsis.circle.fill) — based on Apple HIG conventions; exact names may need verification against Apple SF Symbols app

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in project or trivially installable; APIs verified via Context7 and official docs
- Architecture: HIGH — `Stack.Protected` pattern verified against official Expo docs; AuthContext pattern verified against Supabase docs
- Pitfalls: HIGH for auth pitfalls (common, documented); MEDIUM for SF Symbol names (convention-based, not API-verified)
- Tab SF Symbol names: MEDIUM — standard iOS symbol names for these categories are well-known but not verified against the complete SF Symbols catalog

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — Expo Router and Supabase APIs are stable)
