# Architecture

**Analysis Date:** 2026-02-22

## Pattern Overview

**Overall:** Layered Client-Server Architecture with Context-based State Management

**Key Characteristics:**
- React frontend with TypeScript and component-driven UI
- Context API for global state management (Auth, Theme, Currency, Date)
- React Query (TanStack Query) for server state and data synchronization
- Supabase backend for authentication, database, and real-time capabilities
- Separation between presentation layer (pages/components), business logic layer (hooks), and data access layer (integrations)
- Route-based code splitting with lazy loading for performance

## Layers

**Presentation Layer (UI):**
- Purpose: Render components and handle user interactions
- Location: `src/pages/`, `src/components/`
- Contains: Page components, UI components (buttons, cards, dialogs), layout components
- Depends on: Hooks, contexts, and UI libraries (shadcn, Radix UI, Lucide icons)
- Used by: React Router for rendering views

**Business Logic Layer (Hooks):**
- Purpose: Encapsulate domain logic and data management
- Location: `src/hooks/`
- Contains: Custom hooks for data fetching (`useAssets`, `useIncomes`, `useExpenses`, `useDebts`), mutations (`useAddIncome`, `useUpdateAsset`, etc.), utilities (`useFilteredData`, `useExchangeRate`)
- Depends on: Supabase client, React Query, authentication context
- Used by: Page components for data operations

**State Management Layer (Contexts):**
- Purpose: Provide global state and context values
- Location: `src/contexts/`
- Contains: AuthContext (user auth state), CurrencyContext (currency preferences), DateContext (date filtering), ThemeContext (light/dark mode)
- Depends on: Supabase for auth state, browser storage for persistence
- Used by: All components and hooks requiring global state

**Data Access Layer (Integrations):**
- Purpose: Handle external service communication
- Location: `src/integrations/supabase/`
- Contains: Supabase client instance (`client.ts`), type definitions (`types.ts`)
- Depends on: @supabase/supabase-js SDK
- Used by: Hooks and contexts for database/auth operations

**Utility Layer:**
- Purpose: Provide reusable helper functions
- Location: `src/lib/`
- Contains: Financial calculations (`finance.ts`, `debt.ts`, `currency.ts`), analytics (`analytics.ts`), insights (`insights.ts`), net worth calculations (`netWorth.ts`), environment utilities (`env.ts`), PWA support (`pwa/`)
- Depends on: None (no circular dependencies)
- Used by: Hooks, contexts, and components

**Internationalization Layer:**
- Purpose: Handle multilingual support and RTL
- Location: `src/i18n/`
- Contains: i18next configuration and translation resources
- Depends on: i18next, react-i18next
- Used by: Components and pages for localization

## Data Flow

**Authentication Flow:**

1. User navigates to app → `main.tsx` checks env vars
2. `App.tsx` renders with providers: `AuthProvider` → `ThemeProvider` → `CurrencyProvider` → `DateProvider`
3. `AuthProvider` (in `contexts/AuthContext.tsx`) calls `supabase.auth.getSession()` on mount
4. If session exists: fetches/creates profile and settings via `ensureProfileAndSettings()`
5. Sets user context and auth state
6. `ProtectedRoute` checks `useAuth()` context and gates access to protected pages

**Data Fetching Flow (Example: Assets):**

1. Page component (e.g., `pages/Assets.tsx`) calls `useAssets()` hook
2. `useAssets()` uses React Query with key `['assets', user?.id]`
3. Query function calls `fetchAssets()` which executes Supabase query
4. Supabase returns data with RLS policy check (user_id = auth.uid())
5. React Query caches result and provides loading/error states
6. Component renders data from `useAssets().data`

**Mutation Flow (Example: Add Income):**

1. User submits form in `Income.tsx` → calls `useAddIncome()` mutation
2. Form validation with Zod schema (`incomeSchema`)
3. `useAddIncome()` executes `addAsset()` function via Supabase
4. On success: invalidates `['incomes', user?.id]` query cache
5. Activity logging via `useLogActivity()` hook
6. Analytics event tracked via `trackEvent()`
7. Toast notification shows feedback
8. UI re-renders with fresh data from invalidated query

**Currency Conversion Flow:**

1. `useCurrency()` hook provides `convertCurrency()` and `formatCurrency()`
2. `convertCurrency()` uses exchange rates from `useExchangeRate()` hook
3. Exchange rates cached by React Query
4. If auto-convert enabled: automatic conversion on currency changes
5. User settings persist in `user_settings` table via `useUserSettings()`

**State Management:**

- **Auth State:** Managed by `AuthContext`, persisted via Supabase session
- **UI State:** Managed by component-level `useState` (e.g., modal open/close)
- **Global Preferences:** Stored in contexts (`CurrencyContext`, `ThemeContext`, `DateContext`)
- **Server State:** Managed by React Query with cache invalidation on mutations
- **User Settings:** Persisted in database, synced via `useUserSettings()` hook

## Key Abstractions

**Custom Hooks Pattern:**
- Purpose: Encapsulate reusable data logic and queries
- Examples: `useAssets()`, `useIncomes()`, `useDebts()`, `useAddIncome()`, `useUpdateExpense()`
- Pattern: Hook wraps React Query `useQuery()` or `useMutation()`, manages cache keys, handles authentication context

**Context Providers:**
- Purpose: Provide global state without prop drilling
- Examples: `AuthProvider`, `CurrencyProvider`, `ThemeProvider`, `DateProvider`
- Pattern: Create context, custom hook to access it (`useAuth()`, `useCurrency()`, etc.), Provider component wraps app

**Form Validation:**
- Purpose: Client-side validation with strong types
- Examples: `incomeSchema`, `expenseSchema` defined with Zod
- Pattern: Define schema → use with react-hook-form via `useForm<z.infer<typeof schema>>()` → form submission with validation

**Responsive Layout:**
- Purpose: Mobile-first UI with sidebar/topbar adaptation
- Examples: `AppLayout.tsx` with `Sidebar.tsx` and `TopNavbar.tsx`
- Pattern: Layout wraps main content, state controls mobile menu visibility

## Entry Points

**Application Entry (`src/main.tsx`):**
- Location: `src/main.tsx`
- Triggers: Browser loads app
- Responsibilities: Validate environment variables, register service worker, render React app to DOM

**Root Component (`src/App.tsx`):**
- Location: `src/App.tsx`
- Triggers: Rendered by main.tsx
- Responsibilities: Set up all provider context hierarchy, configure routing, lazy load page components, handle global suspense fallback

**Protected Routes (`src/components/ProtectedRoute.tsx`):**
- Location: `src/components/ProtectedRoute.tsx`
- Triggers: User attempts to access authenticated routes
- Responsibilities: Check auth context, redirect to login if not authenticated, render protected content if authenticated

**Page Routes:**
- Dashboard: `src/pages/Dashboard.tsx` - Financial overview with net worth, recent activity
- Income: `src/pages/Income.tsx` - Manage income entries with CRUD operations
- Expenses: `src/pages/Expenses.tsx` - Manage expense entries
- Debts: `src/pages/Debts.tsx` - Manage debts with payment tracking
- Assets: `src/pages/Assets.tsx` - Manage assets with auto-price updates
- Settings: `src/pages/Settings.tsx` - User preferences and configuration
- SignIn/SignUp: `src/pages/SignIn.tsx`, `src/pages/SignUp.tsx` - Authentication pages

## Error Handling

**Strategy:** Resilient fallbacks with user feedback via toast notifications and error states

**Patterns:**
- Auth errors: Fallback to fallback name if profile fetch fails, toast notification shows failure
- Query errors: React Query error state displayed in component, retry available
- Service Worker errors: Graceful degradation if SW unavailable
- Network errors: NetworkStatusBanner displays offline state, API cache used
- Form errors: Zod validation errors shown inline, field-level messages

## Cross-Cutting Concerns

**Logging:**
- Console logs for debugging
- Activity tracking via `useLogActivity()` - logs to `recent_activity` table
- Page view tracking via `PageViewTracker` component

**Validation:**
- Client-side: Zod schemas for forms (`incomeSchema`, `expenseSchema`, etc.)
- Server-side: Supabase RLS policies enforce user isolation
- Type safety: TypeScript with strict null checks

**Authentication:**
- Supabase Auth handles signup/login/logout
- AuthContext maintains session state
- ProtectedRoute gates access to authenticated pages
- RLS policies on all tables ensure user data isolation

**Analytics:**
- `trackEvent()` function logs events to external service (configured via env)
- Events: auth_sign_in_succeeded, asset_created, expense_deleted, etc.

---

*Architecture analysis: 2026-02-22*
