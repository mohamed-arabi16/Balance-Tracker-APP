# Technology Stack

**Analysis Date:** 2026-02-22

## Languages

**Primary:**
- TypeScript 5.5.3 - All source code, type-safe React components and utilities
- JavaScript (ES Module) - Bundled by Vite, used in service worker (`public/sw.js`)
- HTML5 - Entry point and PWA manifest integration
- CSS (via Tailwind) - Styling

**Secondary:**
- SQL (PostgreSQL) - Supabase database schemas in `supabase/migrations/`
- Deno TypeScript - Supabase Edge Functions in `supabase/functions/metal-prices/index.ts`

## Runtime

**Environment:**
- Node.js (no specific version pinned, inferred from package.json support)
- Browser (modern ES2020+, Service Worker API support required)
- Deno (for Supabase Edge Functions runtime)

**Package Manager:**
- npm (with `package-lock.json`)
- Lockfile: Present (`package-lock.json` 296MB, `bun.lockb` 198MB for optional bun support)

## Frameworks

**Core:**
- React 18.3.1 - UI framework, component-based architecture
- React Router DOM 6.26.2 - Client-side routing in `src/pages/`
- Vite 5.4.1 - Build tool, dev server, code splitting

**State Management & Data:**
- TanStack React Query 5.56.2 - Server state, caching, synchronization via hooks in `src/hooks/`
- React Context API - Local state (Auth, Theme, Currency, Date) in `src/contexts/`
- React Hook Form 7.53.0 - Form state management with resolver validation
- Zod 3.23.8 - Schema validation for forms and data

**UI Component Library:**
- Radix UI (25+ components: accordion, alert-dialog, checkbox, dialog, dropdown-menu, etc.) - Unstyled, accessible primitives
- Shadcn/ui (built on Radix) - Pre-styled, composable components in `src/components/ui/`
- Lucide React 0.462.0 - Icon library (192+ icons)
- Embla Carousel React 8.3.0 - Carousel component
- Recharts 2.12.7 - Charts and data visualization

**Internationalization & Localization:**
- i18next 25.3.2 - Translation framework
- react-i18next 15.6.1 - React bindings for i18next
- Support for RTL (Arabic) and multiple languages

**Styling & Theme:**
- Tailwind CSS 3.4.11 - Utility-first CSS framework
- tailwindcss-animate 1.0.7 - Animation utilities
- tailwind-merge 2.5.2 - Merge Tailwind class conflicts
- PostCSS 8.4.47 - CSS preprocessing
- Autoprefixer 10.4.20 - Vendor prefix handling
- next-themes 0.3.0 - Theme switching (light/dark mode)

**Other UI/UX:**
- cmdk 1.0.0 - Command menu component
- input-otp 1.2.4 - OTP input field
- sonner 1.5.0 - Toast notifications
- react-day-picker 8.10.1 - Date picker component
- date-fns 3.6.0 - Date manipulation utilities
- vaul 0.9.3 - Drawer component
- react-resizable-panels 2.1.3 - Resizable layout panels
- class-variance-authority 0.7.1 - Component variant management

**Testing:**
- Vitest 3.2.4 - Unit/integration test runner
- @vitest/coverage-v8 3.2.4 - Code coverage reporting
- @testing-library/react 16.3.0 - Component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers for assertions
- jsdom 26.1.0 - Simulated DOM environment

**Build & Development:**
- @vitejs/plugin-react-swc 3.5.0 - SWC compiler for faster builds
- lovable-tagger 1.1.13 - Component tagging for Lovable AI integration

**Code Quality:**
- ESLint 9.32.0 - Linting with plugins:
  - @eslint/js - ESLint core rules
  - eslint-plugin-react-hooks - React hooks rules
  - eslint-plugin-react-refresh - React refresh rules
  - typescript-eslint 8.0.1 - TypeScript-specific rules
- TypeScript 5.5.3 - Static type checking (no emit)

**Type Support:**
- @types/react 18.3.3
- @types/react-dom 18.3.0
- @types/node 22.5.5

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.97.0 - Database and auth SDK, core backend integration in `src/integrations/supabase/client.ts`
- @tanstack/react-query 5.56.2 - Essential for server state and API caching via custom hooks
- react-hook-form 7.53.0 - Form handling across all input pages
- zod 3.23.8 - Runtime schema validation for user inputs

**Infrastructure:**
- Radix UI collection (25 packages) - Low-level accessible components
- Tailwind CSS + plugins - Complete styling system
- i18next ecosystem - Multilingual support with RTL capability
- date-fns 3.6.0 - Date calculations for financial records

## Configuration

**Environment:**
- Vite environment variables via `import.meta.env` (VITE_* prefix in client code)
- Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Optional: `VITE_METALPRICEAPI_API_KEY`, `VITE_ANALYTICS_ENDPOINT`
- Validation at startup in `src/lib/env.ts` with `getMissingClientEnvKeys()`
- `.env.example` provided for reference

**Build:**
- `vite.config.ts` - Build configuration with:
  - Path alias: `@/*` maps to `./src/*`
  - Code splitting: Separate chunks for react, data, i18n, UI vendor libs
  - SWC compilation via @vitejs/plugin-react-swc
  - Port 8080 for dev server
  - Chunk size warning limit: 650KB
- `tsconfig.json` and `tsconfig.app.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind customization
- `postcss.config.js` - PostCSS pipeline
- `components.json` - Shadcn/ui component aliases
- `.eslintrc.js` - ESLint rules
- `eslint.config.js` - Newer ESLint flat config

**Dev Tools:**
- `scripts/check-bundle-budget.mjs` - Bundle size validation
- `scripts/security-baseline-check.mjs` - Dependency security audit

## Platform Requirements

**Development:**
- Node.js (recommended 18+, no explicit version constraint)
- npm (package manager, v8+)
- Modern browser with Service Worker support
- Git (for version control)

**Production:**
- Static hosting (Vite outputs SPA to `dist/`)
- CDN-compatible (all assets served from `/dist`)
- Modern browsers (ES2020+)
- Service Worker support (PWA capabilities)
- HTTPS recommended (for secure Supabase auth and service workers)

**Database:**
- Supabase PostgreSQL instance
- Access via VITE_SUPABASE_URL (REST API over HTTPS)

**Edge Functions:**
- Supabase Edge Functions runtime (Deno)
- `supabase/functions/metal-prices/` for metal price API aggregation

---

*Stack analysis: 2026-02-22*
