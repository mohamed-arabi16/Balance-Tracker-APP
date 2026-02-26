# Coding Conventions

**Analysis Date:** 2026-02-22

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `ProtectedRoute.tsx`, `DateFilterSelector.tsx`)
- Pages: PascalCase (e.g., `Dashboard.tsx`, `SignIn.tsx`)
- Utilities/Lib functions: camelCase (e.g., `currency.ts`, `finance.ts`, `insights.ts`)
- Tests: FileName.test.ts or FileName.spec.tsx (co-located with implementation)
- Contexts: PascalCase ending in Context (e.g., `AuthContext.tsx`, `CurrencyContext.tsx`)

**Functions:**
- Regular functions: camelCase (e.g., `convertAmount`, `buildFinancialInsights`, `ensureProfileAndSettings`)
- React components: PascalCase (e.g., `AuthProvider`, `CurrencyProvider`, `ProtectedRoute`)
- Custom hooks: camelCase starting with `use` (e.g., `useAuth`, `useCurrency`, `useUserSettings`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_USER_SETTINGS`, `SHORT_TERM_DEBT_DAYS`)

**Variables:**
- State variables: camelCase (e.g., `selectedMonth`, `isLoading`, `user`)
- Boolean flags: prefix with `is`, `has`, or `can` (e.g., `isLoading`, `autoConvert`, `exchangeRateStale`)
- Context values: camelCase (e.g., `currency`, `exchangeRate`, `user`)

**Types and Interfaces:**
- Interfaces: PascalCase (e.g., `AuthContextType`, `ConvertAmountInput`, `UserSettings`)
- Type aliases: PascalCase (e.g., `Currency = 'USD' | 'TRY'`, `DebtType = "short" | "long"`)
- Generic parameters: PascalCase single letters (e.g., `<T>`)
- Props interfaces: ComponentNameProps (e.g., `AuthProviderProps`, `ProtectedRouteProps`)

## Code Style

**Formatting:**
- No dedicated Prettier config - uses ESLint with TypeScript integration
- Single quotes preferred in actual code, double quotes acceptable
- Semicolons required at end of statements
- 2-space indentation implicit in most files

**Linting:**
- Tool: ESLint 9.32.0 with TypeScript plugin
- Config: `eslint.config.js` (flat config format)
- Disabled rules: `@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-unused-expressions`
- Enforced: React refresh exports check, React hooks rules
- Browser globals enabled for DOM APIs

**TypeScript Settings:**
- Target: ES2020
- Module: ESNext
- Strict mode disabled (noImplicitAny, strict checks off)
- Path alias: `@/*` maps to `./src/*`
- JSX: react-jsx (automatic runtime)

## Import Organization

**Order:**
1. React and React DOM imports
2. Third-party library imports (react-router-dom, zod, date-fns, etc.)
3. Internal type/interface imports from integrations or lib
4. Internal component/context/hook imports using `@/` alias
5. Relative imports as fallback only
6. Side effect imports (CSS, i18n setup)

**Path Aliases:**
- `@/*` resolves to `./src/*` - always use this for internal imports
- Never use relative paths like `../` in application code

**Examples from codebase:**
```typescript
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { trackEvent } from '@/lib/analytics';

export const useAuth = () => { ... };
```

## Error Handling

**Patterns:**
- **Context/Hook validation:** Throw Error with descriptive message when hook used outside provider
  - Example: `throw new Error('useAuth must be used within an AuthProvider')`
- **Supabase errors:** Check `.error` property after query, throw `Error(error.message)` if present
- **Async errors:** Try-catch blocks in event handlers, with fallback UI updates in catch
- **Console errors:** Use `console.error()` for diagnostic logging when exceptions are caught/handled
- **Validation:** Early returns and condition checks prevent invalid state

**Error recovery:**
- On auth errors: fall back to minimal user object with getFallbackName()
- On DB errors: log with trackEvent() for analytics, continue with default values
- On fetch errors: return fallback/cached data with `source: 'fallback'` indicator

## Logging

**Framework:** Native `console` methods (no logging library)

**Patterns:**
- Log level: console.error() for failures and diagnostic warnings
- Analytics: Use `trackEvent()` from `@/lib/analytics` for user action tracking
- Location: Error logging in catch blocks, analytics in success/failure paths
- Example locations: `src/contexts/AuthContext.tsx`, `src/hooks/useUserSettings.ts`

## Comments

**When to Comment:**
- Explain *why*, not *what* (code shows what it does)
- Flag important caveats or non-obvious behavior
- Document workarounds or temporary fixes
- Explain trade-offs or decisions

**Examples from codebase:**
- `// Keep sign-out flow resilient if service worker APIs are unavailable.`
- `// If profile creation fails, we should probably handle this, maybe delete the user`
- `// This sets the cookie to keep the sidebar state.` (explains state management choice)

**JSDoc/TSDoc:**
- Not systematically used across codebase
- Only export statements have informal comments (e.g., `// automatically generated`)

## Function Design

**Size:** Functions are generally compact (5-30 lines)
- Utility functions in `lib/` are 10-20 lines
- Hooks in `hooks/` are 30-50 lines
- Context providers are 50+ lines due to setup

**Parameters:**
- Use named object parameters for functions with 2+ arguments
- Example: `updateUserSettings({ userId, updates })`
- Destructure in function signature for clarity

**Return Values:**
- Async functions explicitly return Promise<T>
- Custom hooks return object with state and methods: `{ data, isLoading, error, mutate }`
- Provider components return JSX.Element

## Module Design

**Exports:**
- Named exports for utilities and functions: `export const functionName = (...) => {}`
- Default export for React components (pages)
- Type exports for interfaces: `export interface TypeName {}`
- Type aliases: `export type Currency = '...'`

**Barrel Files:**
- Contexts export both Provider component and custom hook
- Components package exports individual component with test file co-located

**Organization:**
- `src/lib/` contains pure functions and utilities (no React dependencies)
- `src/hooks/` contains React hooks (use other hooks internally)
- `src/contexts/` contains context providers and hooks
- `src/components/` contains React components (can use hooks/contexts)
- `src/pages/` contains page components (lazy-loaded in App.tsx)
- `src/integrations/` contains external service clients

## Async/Await Patterns

**Async functions:**
- Used in contexts and hooks for initialization
- Example: `const user = await ensureProfileAndSettings(session.user)`
- Error handling with try-catch or `.catch()` chains

**Mutations and queries:**
- TanStack Query used for data fetching
- Example: `useMutation({ mutationFn: async (...) => {...}, onMutate, onError, onSuccess })`
- Optimistic updates via `onMutate` setting query data directly

## Type Safety

**Database types:**
- Generated from Supabase schema: `Database['public']['Tables'][tableName]['Row']`
- Example: `type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"]`
- Used for type-safe queries and state

**Generic functions:**
- Type-safe utility functions with generics
- Example: `sumInDisplayCurrency<T>` with `getAmount: (item: T) => number`

---

*Convention analysis: 2026-02-22*
