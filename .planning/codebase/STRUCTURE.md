# Codebase Structure

**Analysis Date:** 2026-02-22

## Directory Layout

```
Balance-Tracker/
├── src/                        # Main source code
│   ├── App.tsx                # Root app component with routing and provider setup
│   ├── main.tsx               # Application entry point, env validation, service worker registration
│   ├── index.css              # Global styles
│   ├── pages/                 # Page components (route-based)
│   ├── components/            # Reusable UI components
│   ├── contexts/              # React Context providers for global state
│   ├── hooks/                 # Custom React hooks for data and logic
│   ├── lib/                   # Utility functions and helpers
│   ├── integrations/          # External service integrations (Supabase)
│   ├── i18n/                  # Internationalization configuration
│   └── test/                  # Test setup and utilities
├── database/                  # Database schemas and migrations
├── supabase/                  # Supabase project configuration
├── public/                    # Static assets
├── dist/                      # Build output (generated)
├── docs/                      # Project documentation
├── .planning/                 # GSD planning documents
├── package.json               # Project dependencies and scripts
├── tsconfig.app.json          # TypeScript configuration
├── vite.config.ts             # Vite build configuration (if exists)
├── tailwind.config.ts         # Tailwind CSS configuration
└── README.md                  # Project overview
```

## Directory Purposes

**src/pages:**
- Purpose: Route-level page components, one per route
- Contains: Page-specific logic, form components, data coordination
- Key files: `Dashboard.tsx`, `Income.tsx`, `Expenses.tsx`, `Debts.tsx`, `Assets.tsx`, `Settings.tsx`, `SignIn.tsx`, `SignUp.tsx`
- Pattern: Each page imports hooks for data, contexts for global state, UI components for rendering

**src/components:**
- Purpose: Reusable UI components
- Contains: Layout components, modals, custom form components, specialized UI (FinancialCard, DateFilterSelector)
- Key files: `layout/` (AppLayout, Sidebar, TopNavbar), `ui/` (shadcn components), ProtectedRoute, PageViewTracker
- Subdirectories:
  - `layout/`: Layout structure components
  - `ui/`: Unstyled/styled UI primitives (Button, Card, Dialog, etc.)

**src/contexts:**
- Purpose: React Context providers for global application state
- Contains: Auth state, theme, currency preferences, date filtering
- Key files: `AuthContext.tsx`, `ThemeContext.tsx`, `CurrencyContext.tsx`, `DateContext.tsx`
- Pattern: Each context exports provider component and custom hook

**src/hooks:**
- Purpose: Custom hooks for data fetching, mutations, and business logic
- Contains: React Query hooks, form logic, data transformation
- Key files: `useAssets.ts`, `useIncomes.ts`, `useExpenses.ts`, `useDebts.ts`, `useUserSettings.ts`, etc.
- Pattern: Data hooks use React Query (useQuery/useMutation), return loading/error states

**src/lib:**
- Purpose: Shared utility functions and helpers
- Contains: Financial calculations, formatting, analytics, environment config
- Key files:
  - `finance.ts`: Currency conversion, amount calculations
  - `debt.ts`: Debt-specific logic
  - `currency.ts`: Currency formatting and validation
  - `analytics.ts`: Event tracking
  - `insights.ts`: Financial insights generation
  - `netWorth.ts`: Net worth calculation logic
  - `env.ts`: Environment variable validation
  - `pwa/`: Progressive Web App utilities
- Pattern: Pure functions, no React dependencies

**src/integrations:**
- Purpose: External service integration (Supabase)
- Contains: API client configuration, type definitions
- Key files: `supabase/client.ts` (Supabase client), `supabase/types.ts` (generated types)
- Pattern: Single source of truth for external service clients

**src/i18n:**
- Purpose: Internationalization and localization
- Contains: i18next configuration, translation resources
- Key files: `index.ts` (main i18n config)
- Pattern: Configured for English and Arabic with RTL support

**src/test:**
- Purpose: Test setup and utilities
- Contains: Test configuration, mocks, fixtures
- Key files: `setup.ts` (vitest setup)

**database:**
- Purpose: Database schema and migrations
- Contains: SQL schema definitions, trigger functions, RLS policies
- Key files: `schema.sql` (main schema), `update_income_history.sql`, `update_debt_amount.sql`

**public:**
- Purpose: Static assets served directly
- Contains: Icons, manifest files for PWA
- Key files: `icons/` directory for app icons

**docs:**
- Purpose: Project documentation
- Contains: Operational guides, security docs
- Subdirectories: `operations/`, `security/`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Application bootstrap, env validation, service worker registration
- `src/App.tsx`: Provider hierarchy, routing setup, lazy loading
- `index.html`: HTML root document with app mount point

**Authentication & Authorization:**
- `src/contexts/AuthContext.tsx`: Auth state, login/logout logic
- `src/integrations/supabase/client.ts`: Supabase client with auth config
- `src/components/ProtectedRoute.tsx`: Route protection wrapper

**Configuration:**
- `src/lib/env.ts`: Environment variable validation and retrieval
- `.env.example`: Environment variables template
- `tsconfig.app.json`: TypeScript compiler options
- `tailwind.config.ts`: Tailwind CSS configuration

**Core Logic:**
- `src/hooks/useAssets.ts`: Asset CRUD operations and queries
- `src/hooks/useIncomes.ts`: Income CRUD operations
- `src/hooks/useExpenses.ts`: Expense CRUD operations
- `src/hooks/useDebts.ts`: Debt CRUD operations
- `src/hooks/useUserSettings.ts`: User preferences management
- `src/lib/finance.ts`: Financial calculations
- `src/lib/insights.ts`: Financial insights and analysis

**Styling:**
- `src/index.css`: Global styles and Tailwind imports
- `tailwind.config.ts`: Tailwind theme configuration
- `src/components/ui/`: Shadcn component library (CSS modules)

**Testing:**
- `src/hooks/useAssets.test.ts`: Hook unit tests
- `src/lib/finance.test.ts`: Utility function tests
- `src/contexts/AuthContext.bootstrap.test.ts`: Auth context tests
- `src/test/setup.ts`: Vitest configuration

## Naming Conventions

**Files:**
- Pages: PascalCase (e.g., `Dashboard.tsx`, `SignIn.tsx`)
- Components: PascalCase (e.g., `AppLayout.tsx`, `FinancialCard.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useAssets.ts`, `useExchangeRate.ts`)
- Utilities/Helpers: camelCase (e.g., `finance.ts`, `analytics.ts`)
- Tests: Same name as source file with `.test` or `.spec` suffix

**Directories:**
- Component directories: PascalCase (e.g., `components/layout/`, `components/ui/`)
- Utility/hook directories: lowercase (e.g., `hooks/`, `lib/`, `contexts/`)

**TypeScript Types:**
- Interfaces: PascalCase with `I` prefix (e.g., `IAsset`) or no prefix (e.g., `Asset`)
- Enums: PascalCase (e.g., `CurrencyCode`, `DebtStatus`)
- Type aliases: PascalCase (e.g., `FinancialData`, `UserSettings`)

**React Components:**
- Functional components: PascalCase (e.g., `Dashboard`, `AppLayout`)
- Props interfaces: ComponentName + `Props` (e.g., `DashboardProps`, `AppLayoutProps`)

## Where to Add New Code

**New Feature (e.g., new financial record type):**
- Primary code: `src/pages/NewFeature.tsx` (page) + `src/hooks/useNewFeature.ts` (logic)
- Database: Add table to `database/schema.sql` with RLS policies
- Supabase types: Regenerate `src/integrations/supabase/types.ts`
- Tests: `src/hooks/useNewFeature.test.ts`

**New Component/Module:**
- UI Component: `src/components/` or `src/components/ui/` if primitive
- Feature Component: `src/components/FeatureName.tsx` with corresponding styling
- Layout Component: `src/components/layout/ComponentName.tsx`

**Utilities:**
- Financial logic: `src/lib/finance.ts` (or new file if large, e.g., `src/lib/newDomain.ts`)
- Hooks (UI logic): `src/hooks/` directory
- Shared helpers: Add to existing utility files or create new file in `src/lib/`

**Context/Global State:**
- New context: Create `src/contexts/NewContext.tsx`
- Export: Custom hook (`useNewContext()`) and Provider component
- Wrap in App.tsx provider hierarchy

**Tests:**
- Unit tests: Colocated with source (e.g., `useAssets.ts` → `useAssets.test.ts`)
- Setup: Use `src/test/setup.ts` configuration
- Run: `npm run test` or `npm run test:watch`

## Special Directories

**dist/:**
- Purpose: Build output
- Generated: Yes (via `npm run build`)
- Committed: No (in .gitignore)
- Contains: Compiled JavaScript, CSS, asset bundles

**.planning/codebase/:**
- Purpose: GSD planning documents
- Generated: Yes (by GSD mapping tools)
- Committed: Yes
- Contains: Architecture.md, Structure.md, Conventions.md, Testing.md, Concerns.md, Stack.md, Integrations.md

**supabase/:**
- Purpose: Supabase project configuration
- Contains: Migration files, edge function implementations
- Subdirectories: `functions/` (edge functions), `migrations/` (database migrations)

**.github/workflows/:**
- Purpose: CI/CD pipeline definitions
- Contains: GitHub Actions workflow files
- Pattern: Quality checks, build, deploy tasks

---

*Structure analysis: 2026-02-22*
