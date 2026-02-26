# Phase 2: Mode Infrastructure - Research

**Researched:** 2026-02-23
**Domain:** React Context, route guarding, user settings persistence, sidebar extension
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MODE-01 | User can toggle between Simple and Advanced mode with a single button click from anywhere in the app | ModeContext.setMode() called from Sidebar toggle; isAdvanced derived boolean eliminates scattered checks |
| MODE-02 | User can set a default mode preference (Simple or Advanced) in the Settings page | Settings.tsx Card pattern + updateSettings({ app_mode }) call via useUserSettings mutation |
| MODE-03 | Accessing advanced routes (/clients, /invoices, /advanced) while in Simple mode redirects user to dashboard | AdvancedRoute guard mirrors ProtectedRoute exactly; wraps lazy-loaded route elements |
| MODE-04 | App opens in the user's last active mode on page refresh (mode persisted to user_settings) | app_mode column already in user_settings (Phase 1 complete); ModeContext reads settings on mount and syncs via useEffect |
</phase_requirements>

---

## Summary

Phase 2 builds the mode switching infrastructure that all subsequent advanced-mode phases depend on. The deliverables are: `ModeContext` + `useMode()` hook, `ModeProvider` insertion into `App.tsx`, `AdvancedRoute` guard component, an additive advanced section in `Sidebar.tsx`, a mode-toggle Card in `Settings.tsx`, and a `src/lib/queryKeys.ts` factory for future cache management.

Every pattern needed already exists in the codebase. `ModeContext` follows `ThemeContext` almost exactly: initialize local state from `useUserSettings()`, sync on settings load via `useEffect`, mutate via `updateSettings()` with built-in optimistic rollback. `AdvancedRoute` is a four-line component identical in structure to `ProtectedRoute`. The Sidebar's `sidebarItems` static array must be moved inside the component function so it can read `isAdvanced` from context — the existing rendering loop is unchanged. The Settings card follows the Switch + Label + `persistSettings()` pattern used for every other toggle in `Settings.tsx`.

**Primary recommendation:** Copy `ThemeContext.tsx` as the structural template for `ModeContext.tsx`. Copy `ProtectedRoute.tsx` as the structural template for `AdvancedRoute.tsx`. Move `sidebarItems` inside `Sidebar` component body, add advanced items below a `<Separator />` when `isAdvanced` is true. Do not add localStorage for mode — there is no visual flash risk to justify the complexity.

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Role in This Phase |
|---------|---------|---------|-------------------|
| React | 18.x | Context API, hooks, lazy() | ModeContext, AdvancedRoute |
| react-router-dom | 6.x | Navigate, Route, lazy routes | AdvancedRoute redirect, route registration |
| @tanstack/react-query | 5.x | Query cache, optimistic updates | Already used inside useUserSettings |
| @supabase/supabase-js | 2.x | DB persistence | Via existing updateSettings mutation |
| shadcn/ui Switch | (in repo) | Mode toggle UI in Settings and Sidebar | Same component used in Settings.tsx |
| shadcn/ui Separator | (in repo) | Visual divider above advanced nav section | |
| lucide-react | (in repo) | Icons for advanced nav items (BarChart3, Users, FileText) | |

**Installation:** No new packages. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
  contexts/
    ModeContext.tsx              # NEW — AppMode state, ModeProvider, useMode()
  components/
    AdvancedRoute.tsx            # NEW — Mode guard (mirrors ProtectedRoute)
  lib/
    queryKeys.ts                 # NEW — Query key factory for cache management
```

**Modified files:**
- `src/App.tsx` — Insert `<ModeProvider>`, add 6 advanced lazy imports, add 6 AdvancedRoute-wrapped routes
- `src/components/layout/Sidebar.tsx` — Move sidebarItems inside component, add advanced section
- `src/pages/Settings.tsx` — Add Mode Preference card (new Card section)

---

### Pattern 1: ModeContext — ThemeContext Mirror

**What:** React context providing `mode`, `setMode()`, `isAdvanced`, and `isUpdating`.

**Exact structure to follow:** `src/contexts/ThemeContext.tsx`

Key observations from reading `ThemeContext.tsx`:
- `useState` initialized via a function (supports localStorage bootstrap for theme)
- `useUserSettings()` called inside the provider — same approach for mode
- `useEffect` watches `settings?.theme` to sync DB value into local state
- `setTheme` uses `useCallback` and calls `updateSettings()` inline — not via a separate handler
- No `isUpdating` exposed by ThemeContext, but `useUserSettings` already returns `isUpdating` from `mutation.isPending` — ModeContext should expose it since the Sidebar toggle should be disabled during in-flight mutations

**Implementation:**

```typescript
// src/contexts/ModeContext.tsx
// Source: mirrors ThemeContext.tsx structure exactly

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';

type AppMode = 'simple' | 'advanced';

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isAdvanced: boolean;
  isUpdating: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};

export const ModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode>('simple');
  const { settings, updateSettings, isUpdating } = useUserSettings();

  // Sync from DB when settings load (same pattern as ThemeContext syncing settings?.theme)
  useEffect(() => {
    const nextMode = settings?.app_mode;
    if (nextMode !== 'simple' && nextMode !== 'advanced') return;
    setModeState((prev) => (prev === nextMode ? prev : nextMode));
  }, [settings?.app_mode]);

  const setMode = useCallback(
    (nextMode: AppMode) => {
      setModeState(nextMode);
      void updateSettings({ app_mode: nextMode }).catch((error) => {
        console.error('Failed to persist mode preference:', error.message);
      });
    },
    [updateSettings],
  );

  return (
    <ModeContext.Provider value={{ mode, setMode, isAdvanced: mode === 'advanced', isUpdating }}>
      {children}
    </ModeContext.Provider>
  );
};
```

**No localStorage bootstrap needed.** ThemeContext uses localStorage to prevent a flash of wrong theme before settings load. Mode does not have this risk: starting in Simple mode briefly while settings load is acceptable (no visual flash — the UI looks identical until advanced items appear). Confirmed by ARCHITECTURE.md research: "Do not add localStorage for mode."

---

### Pattern 2: AdvancedRoute — ProtectedRoute Mirror

**What:** A route guard that redirects to `/` when not in Advanced mode.

**Exact structure to follow:** `src/components/ProtectedRoute.tsx`

From reading `ProtectedRoute.tsx`:
- Checks `isLoading` state before redirecting (to avoid redirect during auth bootstrap)
- Returns `<Navigate to="/signin" replace />` if not authenticated
- Returns `<>{children}</>` if authenticated

`AdvancedRoute` does not need a loading state — mode is known immediately from local state (even before DB loads, the default is `'simple'`, which is the correct safe default). No spinner needed.

```typescript
// src/components/AdvancedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useMode } from '@/contexts/ModeContext';

interface AdvancedRouteProps {
  children: React.ReactNode;
}

export function AdvancedRoute({ children }: AdvancedRouteProps) {
  const { isAdvanced } = useMode();
  if (!isAdvanced) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

---

### Pattern 3: App.tsx Provider Chain Insertion

**Current chain** (from reading `src/App.tsx`):
```
QueryClientProvider
  AuthProvider
    ThemeProvider
      CurrencyProvider
        DateProvider
          TooltipProvider
```

**After Phase 2** — insert `ModeProvider` after `ThemeProvider`, before `CurrencyProvider`:
```
QueryClientProvider
  AuthProvider
    ThemeProvider
      ModeProvider          ← NEW
        CurrencyProvider
          DateProvider
            TooltipProvider
```

Rationale: ModeProvider calls `useUserSettings()` internally. `useUserSettings()` calls `useAuth()`. Therefore ModeProvider must be inside AuthProvider. ThemeProvider has the same dependency and is already positioned correctly. ModeProvider does not depend on currency, but CurrencyProvider components in Advanced mode will need `useMode()` — so ModeProvider must be outside CurrencyProvider.

**New lazy imports** (added alongside existing ones):
```typescript
// Advanced mode pages — lazy-loaded, not yet linked to real routes in this phase
// (routes for client/invoice pages are added in Phase 3/5 respectively)
const AdvancedDashboard = lazy(() => import('./pages/advanced/AdvancedDashboard'));
```

**New routes** (inside the protected `Routes` block):
```tsx
<Route path="/advanced" element={<AdvancedRoute><AdvancedDashboard /></AdvancedRoute>} />
// /clients, /invoices routes added in Phase 3 and Phase 5
```

Note: In Phase 2, only the `/advanced` stub route and `AdvancedDashboard` placeholder page are created. The `/clients` and `/invoices` routes come in Phase 3. The `AdvancedRoute` guard is registered now so Phase 3 can reference it immediately.

---

### Pattern 4: Sidebar Advanced Section

**Current state** (from reading `Sidebar.tsx`):
- `sidebarItems` is a module-level const array — it cannot read context
- The nav renders by mapping over `sidebarItems`
- Already uses `useLocation()` and `useTranslation()` — pattern established for hooks inside the component

**Required change:**
1. Move `sidebarItems` inside the `Sidebar` function body (it becomes a `const` inside the function, re-computed on each render — acceptable since array construction is trivial)
2. Add `useMode()` call inside `Sidebar`
3. After the existing nav items, conditionally render a `<Separator />` and the advanced items

```tsx
// Inside Sidebar component body — source: Sidebar.tsx structure
import { Separator } from '@/components/ui/separator';
import { useMode } from '@/contexts/ModeContext';
import { BarChart3, Users, FileText } from 'lucide-react';

export function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const { isAdvanced, setMode, isUpdating } = useMode(); // NEW

  const sidebarItems = [ /* ...existing items... */ ]; // moved inside

  const advancedItems = [
    { titleKey: 'nav.advanced.dashboard', href: '/advanced', icon: BarChart3 },
    { titleKey: 'nav.clients',            href: '/clients',  icon: Users },
    { titleKey: 'nav.invoices',           href: '/invoices', icon: FileText },
  ];

  // ... existing JSX ...

  // Inside <nav>, after the existing sidebarItems.map():
  {isAdvanced && (
    <>
      <Separator className="my-2" />
      {advancedItems.map((item) => { /* same rendering pattern as existing items */ })}
    </>
  )}

  // Mode toggle button in sidebar footer area or nav bottom:
  <Button
    variant="ghost"
    size="sm"
    disabled={isUpdating}
    onClick={() => setMode(isAdvanced ? 'simple' : 'advanced')}
    className="w-full justify-start gap-3 h-10"
  >
    {/* Toggle icon + label */}
    {isAdvanced ? t('mode.switchToSimple') : t('mode.switchToAdvanced')}
  </Button>
}
```

**Regression prevention:** The existing `sidebarItems` array content is identical — only its location changes (from module scope to function scope). The rendering loop and active-link logic are untouched. Simple mode users see exactly the same sidebar they do today.

---

### Pattern 5: Settings Page — Mode Preference Card

**Current structure** (from reading `Settings.tsx`):
- Each setting area is a `<Card>` with `<CardHeader>` + `<CardContent>`
- Switches use the `persistSettings()` helper: `void persistSettings({ field: value }, t('settings.someSaved'))`
- Controls are disabled via `controlsDisabled` when `isSettingsLoading || isUpdating`
- Settings page imports `useUserSettings` already — mode toggle reads `settings?.app_mode` from the same hook

**New Card (added as last card before Data Export, or as its own section):**

```tsx
// src/pages/Settings.tsx — new import
import { useMode } from '@/contexts/ModeContext';

// Inside Settings component
const { mode, setMode } = useMode();

// New Card JSX:
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Layers className="h-5 w-5" /> {/* Layers icon from lucide-react */}
      {t('settings.modeTitle')}
    </CardTitle>
    <CardDescription>
      {t('settings.modeDescription')}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <Label htmlFor="app-mode">{t('settings.modeLabel')}</Label>
      <Select
        value={mode}
        onValueChange={(value) => setMode(value as 'simple' | 'advanced')}
        disabled={controlsDisabled}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="simple">{t('settings.mode.simple')}</SelectItem>
          <SelectItem value="advanced">{t('settings.mode.advanced')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </CardContent>
</Card>
```

Note: `setMode` from `useMode()` is used directly (not `persistSettings()`) because `setMode` already calls `updateSettings()` with error handling inside `ModeContext`. Calling `persistSettings` would double-persist.

---

### Pattern 6: queryKeys.ts Factory

**Why now:** The research flags `src/lib/queryKeys.ts` as a Phase 2 must-have. Without a centralized key factory, later phases will each use ad-hoc string arrays for React Query keys, causing cache invalidation mismatches that are hard to debug.

**Current state:** Each hook uses its own inline key array: `['userSettings', user?.id]`, `['assets', user?.id]`, etc. No centralized factory exists.

**Implementation:**

```typescript
// src/lib/queryKeys.ts
// Centralized React Query key factory — prevents cache key string drift across hooks

export const queryKeys = {
  userSettings: (userId: string) => ['userSettings', userId] as const,
  assets:       (userId: string) => ['assets',       userId] as const,
  incomes:      (userId: string) => ['incomes',      userId] as const,
  expenses:     (userId: string) => ['expenses',     userId] as const,
  debts:        (userId: string) => ['debts',        userId] as const,
  // Advanced mode keys (added now, used in Phase 3+):
  clients:      (userId: string) => ['clients',      userId] as const,
  invoices:     (userId: string) => ['invoices',     userId] as const,
} as const;
```

**Migration note:** Existing hooks do not need to be refactored to use this factory in Phase 2. The factory is created now and all new hooks (useClients, useInvoices) in subsequent phases will use it from day one. Existing hooks may be migrated incrementally if desired but it is not required.

---

### Pattern 7: AdvancedDashboard Stub Page

Phase 2 creates a minimal stub page at `src/pages/advanced/AdvancedDashboard.tsx` to:
- Prove the routing and guard work end-to-end
- Allow developers to test mode switching immediately
- Follow the lazy-load requirement from day one

```tsx
// src/pages/advanced/AdvancedDashboard.tsx — Phase 2 stub
export default function AdvancedDashboard() {
  return (
    <div className="p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <h1 className="text-3xl font-bold text-foreground">Advanced Dashboard</h1>
      <p className="text-muted-foreground">Freelancer features coming in later phases.</p>
    </div>
  );
}
```

Full widget implementation is Phase 6's responsibility. The stub satisfies MODE-03 testing (navigating to `/advanced` in Simple mode redirects to `/`; in Advanced mode it renders the stub).

---

### Anti-Patterns to Avoid

- **Moving mode into useState local to Sidebar:** Mode must be global context so Settings, AdvancedRoute, and Sidebar all read the same value without prop drilling.
- **Calling updateSettings directly from the Sidebar toggle:** Call `setMode()` from ModeContext. It encapsulates optimistic update + rollback. Direct calls bypass rollback.
- **Adding localStorage for mode:** ThemeContext does this for theme because the DOM class toggle happens synchronously before React renders. Mode has no DOM-level effect on page load — the default `'simple'` state is safe to show briefly. Adding localStorage would duplicate state and create sync bugs.
- **Using mode inside ProtectedRoute:** AdvancedRoute is a separate component. Do not add a `mode` check into ProtectedRoute — it would entangle two orthogonal concerns (authentication vs. feature gating).
- **Changing existing sidebarItems rendering loop:** The existing `sidebarItems.map()` block in Sidebar must remain structurally identical. Only the array's location changes (module-scope → function-scope).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Optimistic update + rollback on mode persist | Custom state machine | `updateSettings()` from `useUserSettings` | Already has `onMutate`/`onError` rollback; battle-tested |
| Route guarding | Custom navigation logic | `<Navigate to="/" replace />` in AdvancedRoute | React Router's standard pattern; works with browser history correctly |
| Disabled state during mutation | Custom loading flag | `isUpdating` from `useUserSettings` | `mutation.isPending` is already returned; re-exposing it costs nothing |
| Icon selection | Custom SVG icons | `lucide-react` (already installed) | Consistent with all other nav icons in Sidebar |
| UI switch component | Custom toggle | Shadcn `<Switch />` (already in repo) | RTL-compatible, accessible, styled to match theme |

---

## Common Pitfalls

### Pitfall 1: Mode resets on browser refresh
**What goes wrong:** User switches to Advanced mode, refreshes page, lands back in Simple mode.
**Why it happens:** Local `useState('simple')` initializes before the `useUserSettings` query resolves. If the `useEffect` sync is missing or the key name is wrong, the DB value never overwrites the default.
**How to avoid:** The `useEffect` watching `settings?.app_mode` is the critical sync point. Verify the column name matches exactly: `settings?.app_mode` (snake_case), not `settings?.appMode`. The `DEFAULT_USER_SETTINGS` constant in `useUserSettings.ts` already has `app_mode: 'simple'` from Phase 1.
**Warning signs:** Mode always shows `'simple'` after refresh regardless of what was saved.

### Pitfall 2: Simple mode sidebar regression
**What goes wrong:** Moving `sidebarItems` inside the component function accidentally reorders, duplicates, or omits existing nav items.
**Why it happens:** Copy-paste error when restructuring the module-level const into a function-body const.
**How to avoid:** The existing `sidebarItems` array content must be byte-for-byte identical to the current module-level version. Only location changes. Compare before/after with a diff. The advanced items are a separate `advancedItems` array appended below a Separator.
**Warning signs:** Settings, Assets, or other simple nav items disappear or appear twice.

### Pitfall 3: AdvancedRoute redirects before mode loads from DB
**What goes wrong:** User in Advanced mode opens the app, briefly lands on `/advanced`, sees a flash redirect to `/`, then the mode loads and they're stranded on the dashboard.
**Why it happens:** `AdvancedRoute` reads `isAdvanced` which starts as `false` (from the `useState('simple')` initialization). If the component renders before the `useEffect` sync fires, it redirects.
**How to avoid:** The `useEffect` sync from `settings?.app_mode` runs synchronously after the React Query cache is populated. On a normal page load with a warm query cache, the settings are available nearly immediately. The brief `simple` initial state means there is a potential one-render redirect window on cold load.
**Resolution:** Accept this behavior for v1 — the redirect risk is extremely brief (sub-50ms) and only occurs on cold cache load after a fresh login. If it becomes noticeable, add `isLoading: query.isLoading` to the ModeContext value and return `null` (no redirect) in `AdvancedRoute` while loading. Do not add this complexity pre-emptively.
**Warning signs:** Users report being redirected away from Advanced routes unexpectedly on page load.

### Pitfall 4: setMode called while mutation is already in-flight
**What goes wrong:** User double-clicks the mode toggle; two concurrent `updateSettings({ app_mode })` mutations fire. The optimistic update from the first is overwritten by the second's `onMutate`, and the rollback from the first erroneously restores stale data.
**Why it happens:** `useUserSettings` uses `useMutation` which does not automatically deduplicate concurrent calls.
**How to avoid:** Disable the toggle UI during `isUpdating`. Both the Sidebar toggle button and the Settings Select should have `disabled={isUpdating}`. `useUserSettings` already returns `isUpdating: mutation.isPending`.
**Warning signs:** Mode appears to toggle twice, or reverts to previous state after double-click.

### Pitfall 5: Missing i18n keys for new strings
**What goes wrong:** Sidebar or Settings renders with missing translation keys, showing raw key strings to users (e.g., `"mode.switchToAdvanced"` appears as literal text).
**Why it happens:** New strings added to JSX without corresponding entries in both `en` and `ar` translation objects in `src/i18n/index.ts`.
**How to avoid:** Every new translation key added to `en.translation` must have a corresponding Arabic entry in `ar.translation`. This phase introduces approximately 8-12 new keys (mode toggle label, mode names, Settings card title/description). All must be bilingual.
**Warning signs:** Translation keys appear verbatim in the UI; console warnings from i18next about missing keys.

---

## Code Examples

### How useUserSettings mutation works (verified from source)

```typescript
// src/hooks/useUserSettings.ts — actual implementation
// The mutation has built-in optimistic update + rollback:
const mutation = useMutation({
  mutationFn: async (updates: UserSettingsUpdate) => {
    return updateUserSettings({ userId: user.id, updates });
  },
  onMutate: async (updates) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<UserSettingsRow>(queryKey) ?? null;
    if (previous) {
      queryClient.setQueryData<UserSettingsRow>(queryKey, { ...previous, ...updates });
    }
    return { previous };
  },
  onError: (_error, _updates, context) => {
    if (context?.previous) {
      queryClient.setQueryData(queryKey, context.previous);  // rollback
    }
  },
  onSuccess: (updatedSettings) => {
    queryClient.setQueryData(queryKey, updatedSettings);
  },
});
// Returns: { settings, isLoading, isUpdating, updateSettings }
```

ModeContext calls `updateSettings({ app_mode: nextMode })`. The optimistic update fires immediately (local state updates), then the DB write happens asynchronously. If it fails, the cache rolls back — and since ModeContext's `useEffect` watches `settings?.app_mode`, it will also roll back the local `mode` state when the cache reverts.

### How ThemeContext syncs from DB (verified from source)

```typescript
// src/contexts/ThemeContext.tsx — exact sync pattern to copy for ModeContext
useEffect(() => {
  const nextTheme = settings?.theme;
  if (!nextTheme || (nextTheme !== 'light' && nextTheme !== 'dark' && nextTheme !== 'system')) {
    return;
  }
  setThemeState((previousTheme) => (previousTheme === nextTheme ? previousTheme : nextTheme));
}, [settings?.theme]);
```

For ModeContext, simplify the guard (only two valid values):
```typescript
useEffect(() => {
  const nextMode = settings?.app_mode;
  if (nextMode !== 'simple' && nextMode !== 'advanced') return;
  setModeState((prev) => (prev === nextMode ? prev : nextMode));
}, [settings?.app_mode]);
```

### How Settings.tsx adds a new preference (verified from source)

```typescript
// Pattern from Settings.tsx — persistSettings helper
const persistSettings = async (updates: UserSettingsPatch, successMessage: string) => {
  try {
    await updateSettings(updates);
    trackEvent('settings_updated', updates);
    toast.success(successMessage);
  } catch (error) {
    toast.error(`Update failed: ${getErrorMessage(error)}`);
  }
};

// Usage for a Switch:
const handleIncludeLongTermChange = (enabled: boolean) => {
  void persistSettings({ include_long_term: enabled }, t('settings.debtPreferenceSaved'));
};
```

For the mode setting, use `setMode()` from `useMode()` directly (not `persistSettings`) because `ModeContext.setMode` already handles the update + error:
```typescript
const { mode, setMode } = useMode();
// In the Select onValueChange:
onValueChange={(value) => setMode(value as 'simple' | 'advanced')}
```

### How ProtectedRoute redirects (verified from source)

```typescript
// src/components/ProtectedRoute.tsx — exact pattern for AdvancedRoute
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}
```

AdvancedRoute omits the `isLoading` check — the `simple` default is the correct safe state during load:
```typescript
export function AdvancedRoute({ children }: AdvancedRouteProps) {
  const { isAdvanced } = useMode();
  if (!isAdvanced) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

### How Sidebar renders nav items (verified from source)

```typescript
// src/components/layout/Sidebar.tsx — existing rendering loop
{sidebarItems.map((item) => {
  const isActive = location.pathname === item.href;
  const Icon = item.icon;
  return (
    <Link key={item.href} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
      <Button
        variant={isActive ? "default" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 h-12 ...",
          isActive && "bg-gradient-primary ...",
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
        <span className={cn("...", collapsed && "opacity-0 w-0 overflow-hidden")}>
          {t(item.titleKey)}
        </span>
      </Button>
    </Link>
  );
})}
```

The advanced items section uses the exact same `map()` pattern with the same Button/Icon/span structure. Only the data (href, icon, titleKey) differs.

---

## i18n Keys Required

All new strings must be added to both `en.translation` and `ar.translation` in `src/i18n/index.ts`.

### English keys (new in Phase 2)

```
"nav.advanced.dashboard": "Advanced Dashboard"
"nav.clients": "Clients"
"nav.invoices": "Invoices"
"mode.switchToAdvanced": "Switch to Advanced"
"mode.switchToSimple": "Switch to Simple"
"settings.modeTitle": "Mode"
"settings.modeDescription": "Set your default mode. Advanced mode unlocks freelancer features."
"settings.modeLabel": "Default Mode"
"settings.mode.simple": "Simple"
"settings.mode.advanced": "Advanced"
"settings.modeSaved": "Mode preference saved."
```

### Arabic keys (matching — approximate, to be reviewed)

```
"nav.advanced.dashboard": "لوحة تحكم متقدمة"
"nav.clients": "العملاء"
"nav.invoices": "الفواتير"
"mode.switchToAdvanced": "التبديل إلى المتقدم"
"mode.switchToSimple": "التبديل إلى البسيط"
"settings.modeTitle": "الوضع"
"settings.modeDescription": "حدد وضعك الافتراضي. الوضع المتقدم يفتح ميزات المستقلين."
"settings.modeLabel": "الوضع الافتراضي"
"settings.mode.simple": "بسيط"
"settings.mode.advanced": "متقدم"
"settings.modeSaved": "تم حفظ تفضيل الوضع."
```

**Confidence:** MEDIUM for Arabic — these are functional translations. Financial/UI terminology should be reviewed by a native Arabic speaker before Phase 5 ships, but for infrastructure labels in Phase 2 the translations are straightforward.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Feature flags as environment variables | React Context for runtime user preference | Mode toggles per-session without redeploy |
| Route-level permission in each page | Dedicated guard component (AdvancedRoute) | Guard logic in one place, not scattered |
| Separate settings table for feature preferences | Single `user_settings` row with all prefs | Zero migration complexity; follows existing pattern |

---

## Open Questions

1. **Should the mode toggle button also appear in TopNavbar?**
   - What we know: Sidebar has a toggle, Settings has a Select. TopNavbar shows only the menu button on mobile.
   - What's unclear: Product decision — is a mode toggle button in the top bar needed for mobile UX?
   - Recommendation: Do not add TopNavbar toggle in Phase 2. Sidebar toggle is accessible on mobile via the slide-out sidebar. Revisit if user testing reveals a problem.

2. **AdvancedRoute redirect during cold-cache load**
   - What we know: Local state initializes to `'simple'`; DB value loads asynchronously.
   - What's unclear: Is the sub-50ms redirect flash noticeable to real users?
   - Recommendation: Ship without loading state guard. If issue is reported, add `isLoading` to ModeContext and null-render in AdvancedRoute during load.

3. **Should existing hooks be migrated to queryKeys.ts immediately?**
   - What we know: `queryKeys.ts` is created in this phase; existing hooks use inline arrays.
   - What's unclear: Whether the planner wants a migration task or defer-to-incremental approach.
   - Recommendation: Defer migration of existing hooks. New hooks in Phase 3+ use the factory from day one.

---

## Sources

### Primary (HIGH confidence)

- `src/contexts/ThemeContext.tsx` — Exact pattern for ModeContext (read directly from source)
- `src/components/ProtectedRoute.tsx` — Exact pattern for AdvancedRoute (read directly from source)
- `src/hooks/useUserSettings.ts` — Mutation internals, DEFAULT_USER_SETTINGS, app_mode field confirmed present
- `src/App.tsx` — Provider chain order, lazy import pattern, route nesting structure
- `src/components/layout/Sidebar.tsx` — sidebarItems structure, rendering loop, collapsed state
- `src/pages/Settings.tsx` — Card pattern, persistSettings helper, controlsDisabled pattern
- `src/i18n/index.ts` — Translation key naming convention, AR/EN structure
- `.planning/research/ARCHITECTURE.md` — Provider chain insertion point, ModeContext interface, AdvancedRoute pattern, no-localStorage decision
- `.planning/codebase/CONVENTIONS.md` — Naming conventions, import order, error handling patterns

### Secondary (MEDIUM confidence)

- `.planning/research/SUMMARY.md` — Phase 2 deliverables list, pitfall list
- `.planning/REQUIREMENTS.md` — MODE-01 through MODE-04 exact specifications

---

## Metadata

**Confidence breakdown:**
- ModeContext implementation: HIGH — pattern is a direct copy of ThemeContext with minor simplification
- AdvancedRoute implementation: HIGH — direct copy of ProtectedRoute with single check
- Provider chain insertion: HIGH — verified current chain from App.tsx source
- Sidebar extension: HIGH — verified sidebarItems structure from source; change is surgical
- Settings card: HIGH — verified persistSettings pattern from source; mode card is identical in structure
- queryKeys.ts: HIGH — factory pattern is standard React Query practice
- Arabic translations: MEDIUM — functional but not domain-reviewed
- AdvancedRoute cold-cache flash risk: MEDIUM — theoretical risk, no evidence it's perceptible

**Research date:** 2026-02-23
**Valid until:** 2026-05-23 (stable patterns — React Query, React Router, Supabase all stable)
