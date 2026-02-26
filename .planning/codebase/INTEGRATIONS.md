# External Integrations

**Analysis Date:** 2026-02-22

## APIs & External Services

**Asset Pricing APIs:**
- CoinGecko (free tier) - Cryptocurrency prices (Bitcoin, Ethereum, Cardano in USD)
  - SDK/Client: Native `fetch()` in `src/hooks/useAssetPrices.ts`
  - Endpoint: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano&vs_currencies=usd`
  - Cache: 5-minute stale time, 5-minute refetch interval

- Metal Price API (metalpriceapi.com) - Precious metal prices (gold XAU, silver XAG in USD)
  - SDK/Client: Supabase Edge Function wrapper at `supabase/functions/metal-prices/index.ts`
  - Auth: `METALPRICEAPI_API_KEY` env var passed to Deno function
  - Endpoint: Supabase function at `https://{projectId}.supabase.co/functions/v1/metal-prices`
  - Purpose: Aggregates metal prices via `https://api.metalpriceapi.com/v1/latest?api_key={key}&base=USD&currencies=EUR,XAU,XAG`
  - Note: Optional integration, graceful fallback if unavailable

**Currency Exchange Rates:**
- exchangerate-api.com (inferred from service worker PUBLIC_API_HOSTS list)
  - SDK/Client: Native `fetch()` via TanStack React Query
  - Used in: `src/hooks/useExchangeRate.ts`
  - Caching: Service worker caches GET requests to this API
  - Purpose: Real-time exchange rate conversion for multi-currency support

**Analytics & Monitoring:**
- Custom Analytics Endpoint (optional, via `VITE_ANALYTICS_ENDPOINT` env var)
  - Implementation: `src/lib/analytics.ts`
  - Send method: `navigator.sendBeacon()` with fallback to `fetch()`
  - Payload: JSON with event name, timestamp, correlationId, properties
  - Fire-and-forget: Errors silently ignored to not impact user experience
  - Usage: Auth events, page views, profile recovery, settings recovery

## Data Storage

**Databases:**
- Supabase PostgreSQL (managed)
  - Connection: Via REST API at `VITE_SUPABASE_URL` (env var `https://{project}.supabase.co`)
  - Client: @supabase/supabase-js 2.97.0
  - Auth: Public anon key in `VITE_SUPABASE_PUBLISHABLE_KEY`
  - Type safety: Auto-generated TypeScript types in `src/integrations/supabase/types.ts`
  - Persistence: localStorage for session tokens (configured in `src/integrations/supabase/client.ts`)

  **Tables:**
  - `profiles` - User profiles with name
  - `user_settings` - Per-user configuration (net worth calculation method, etc.)
  - `assets` - Tracked assets (crypto, metals, stocks with auto_update flag)
  - `debts` - Debts/receivables with amount history tracking
  - `debt_amount_history` - Historical debt amount changes with notes
  - `expenses` - Expense records with categorization
  - `incomes` - Income records with categorization
  - Plus supporting tables for audit logs, activity tracking

  **Migrations:** Located in `supabase/migrations/` with timestamps:
  - Database initialization, RLS policies, indexes
  - Recent: Net worth calculation config, receivables flag

**File Storage:**
- Local filesystem only (browser-based data export as CSV)
- No cloud file storage integration (Supabase Storage not used)

**Caching:**
- Browser localStorage: Session management, correlation IDs, theme/locale preferences
- Service Worker cache (named caches in `public/sw.js`):
  - `bt-static-v1` - App shell (HTML, icons, manifest)
  - `bt-runtime-v1` - Runtime assets (JS, CSS, images) with LRU eviction
  - `bt-api-v1` - API responses from Supabase and public APIs with LRU eviction
  - Max entries: 80 for runtime, 120 for API cache
- TanStack React Query: In-memory query cache with 5-minute stale times

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (managed)
  - Implementation: `src/contexts/AuthContext.tsx`
  - Methods: Email/password signup and signin via `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`
  - Session: Persisted to localStorage with auto-refresh enabled
  - User metadata: Stored in Supabase auth user_metadata (name field)
  - Profile fallback: If profile/settings don't exist, auto-created on login
  - Hooks: `useAuth()` context hook for accessing user, login, register, logout functions
  - Event tracking: Auth success/failure/recovery tracked to analytics

**JWT Handling:**
- Supabase auto-refresh tokens every 60 seconds (default)
- Refresh tokens stored in localStorage
- Auth state change listener refreshes user profile on re-auth

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, or similar)
- Errors logged to browser console in development

**Logs:**
- Browser console.log/console.error in development mode
- Analytics events track key user actions and errors via `trackEvent()`
- Supabase logs available in dashboard (not client-accessible)

**Observability Gaps:**
- No performance monitoring (Web Vitals, custom metrics)
- No distributed tracing
- No server-side error tracking

## CI/CD & Deployment

**Hosting:**
- Static hosting (Vite SPA to `dist/` directory)
- Likely Vercel, Netlify, or similar (based on Lovable integration and `.lovable/` directory)
- Service worker enables offline-first architecture

**CI Pipeline:**
- Local quality gates: `npm run quality:ci` runs:
  - Lint (`npm run lint`)
  - Type check (`npm run typecheck`)
  - Tests (`npm run test`)
  - Build (`npm run build`)
  - Bundle budget check (`npm run check:bundle`)
  - Security baseline (`npm run audit:baseline`)
- No detected GitHub Actions or CI/CD config (check `.github/` for workflows)

**Build Output:**
- JavaScript code splitting: 4 vendor chunks (react, data, i18n, ui)
- Bundle size target: 650KB warning limit
- Source maps: Generated for debugging

## Environment Configuration

**Required env vars:**
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-anon-key
```

**Optional env vars:**
```
VITE_METALPRICEAPI_API_KEY=your-metalpriceapi-key
VITE_ANALYTICS_ENDPOINT=https://your-analytics-backend.com/events
```

**Secrets location:**
- `.env` file in project root (not committed, matches `.env.example`)
- Supabase project ID hardcoded in metal-prices function config
- Service role key must NEVER be in frontend env files (documented in README)

**Build-time:**
- TypeScript types generated from Supabase schema
- Vite inlines `import.meta.env.VITE_*` variables at build time
- Missing env vars trigger startup error in `src/main.tsx`

## Webhooks & Callbacks

**Incoming:**
- None detected (Supabase auth has OAuth callback support but not explicitly configured)

**Outgoing:**
- Custom analytics endpoint (if configured via `VITE_ANALYTICS_ENDPOINT`)
  - POST JSON payload on page views, auth events, UI interactions
  - Persisted via navigator.sendBeacon() for reliability
- Service worker registers for page views via PageViewTracker component

## External Service Dependencies

**Third-Party Risks:**
- CoinGecko free tier: Rate limits (~10-50 calls/min), no SLA
- Metal Price API: Requires paid subscription for reliable access
- Supabase: Managed service, outage could make app non-functional
- Exchange rate API: Free tier with potential rate limits

**Fallback Strategies:**
- Asset prices: Hardcoded fallback values in `useAssetPrices` if both APIs fail
  - Fallback gold: $2300/oz, silver: $28/oz
- Exchange rates: Offline cached rates or manual entry
- Supabase auth: User data cached in profile/settings tables with recovery logic

---

*Integration audit: 2026-02-22*
