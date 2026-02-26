# Codebase Concerns

**Analysis Date:** 2026-02-22

## Tech Debt

**Dead Code in useDebts Hook:**
- Issue: Unreachable code after early return statement in `addDebt` function
- Files: `src/hooks/useDebts.ts` (lines 89-92)
- Impact: Lines 91-92 are never executed after the refetch returns, creating confusion about the actual return value. This redundant code increases maintenance burden.
- Fix approach: Remove the unreachable lines 91-92 that duplicate the return at line 89

**Large Page Components (>500 lines):**
- Issue: Multiple page components exceed recommended size limits causing reduced maintainability
- Files:
  - `src/pages/Debts.tsx` (550 lines)
  - `src/pages/Income.tsx` (495 lines)
  - `src/pages/Expenses.tsx` (434 lines)
  - `src/pages/Assets.tsx` (400 lines)
- Impact: Difficult to test, understand, and modify. Multiple responsibilities mixed in single components
- Fix approach: Extract form components to separate files (AddDebtForm, EditDebtForm, etc. already exist but still housed in main page files), break down table rendering into dedicated components, separate business logic into custom hooks

**@typescript-eslint/no-explicit-any Usage:**
- Issue: Generic type constraints use `any` type in multiple places
- Files:
  - `src/hooks/useFilteredData.ts` (lines 4-5, 29-30)
- Impact: Loss of type safety, potential runtime errors not caught at compile time
- Fix approach: Replace with proper generic constraints using Record<string, unknown> or more specific type bounds

**Missing Error Recovery in Registration Flow:**
- Issue: Profile or settings creation failures during sign-up don't trigger user cleanup
- Files: `src/contexts/AuthContext.tsx` (lines 187-205)
- Impact: Orphaned auth users in Supabase if database operations fail after signup. No automatic cleanup mechanism exists.
- Fix approach: Implement transaction-like behavior or create admin cleanup job. Add user deletion on profile/settings creation failure.

## Known Bugs

**Potential Infinite Loop in AuthContext:**
- Symptoms: Auth state listeners may trigger multiple times during initialization
- Files: `src/contexts/AuthContext.tsx` (lines 132-147)
- Trigger: Fast navigation between pages during auth bootstrap, or rapid connection state changes
- Workaround: Currently relies on cleanup handler to prevent memory leaks, but state could update multiple times unnecessarily
- Mitigation: Add a flag to prevent re-triggering ensureProfileAndSettings if it's already in progress

**Date Filtering Edge Case with Null Due Dates:**
- Symptoms: Debts with null due_date values may be filtered inconsistently
- Files: `src/hooks/useFilteredData.ts` (line 16), `src/pages/Debts.tsx` (line 127)
- Trigger: Filtering debts by month when some debts have null due_date
- Workaround: Component still displays data but filtering behavior unclear for null values
- Fix approach: Explicitly define null-date handling strategy and document it

**Exchange Rate Fallback Values Hardcoded:**
- Symptoms: Currency conversion silently fails to old rates without user awareness
- Files: `src/hooks/useAssetPrices.ts` (lines 19-20)
- Trigger: Network outage or API failure
- Workaround: User sees warning "unavailable" but rates continue being used
- Fix approach: Store rates locally with timestamp validation, prevent stale rates from being used without explicit user consent

## Security Considerations

**Service Worker Cache Clearing Called Twice in Logout:**
- Risk: Potential race condition if two clearApiCacheInServiceWorker calls execute concurrently
- Files: `src/contexts/AuthContext.tsx` (lines 212-218)
- Current mitigation: None - fire-and-forget implementation
- Recommendations:
  - Call clearApiCacheInServiceWorker once before logout
  - Only call after logout completes
  - Add error handling if clearing fails

**Analytics Endpoint Unvalidated:**
- Risk: VITE_ANALYTICS_ENDPOINT env var is used without validation. Could be exploited to send data to attacker-controlled endpoint.
- Files: `src/lib/analytics.ts` (line 35)
- Current mitigation: Only fires if endpoint is defined; fire-and-forget approach limits exposure
- Recommendations:
  - Validate endpoint is HTTPS and from trusted domain
  - Add event payload sanitization before sending
  - Log all analytics endpoint failures for monitoring

**No CSRF Protection on Mutations:**
- Risk: Form submissions (add/edit debt, expense, income) lack CSRF tokens
- Files: All mutation hooks in `src/hooks/` - useAddDebt, useUpdateDebt, useAddExpense, etc.
- Current mitigation: Supabase auth tokens provide some protection
- Recommendations:
  - Verify Supabase handles CSRF automatically
  - Document this assumption
  - Add explicit request ID tracking to prevent duplicate submissions

**Password Input Not Cleared After Login Failure:**
- Risk: Unsuccessful login attempts leave credentials in form state
- Files: `src/pages/SignIn.tsx` (not fully examined but sign-in flow doesn't clear inputs)
- Current mitigation: React Hook Form manages state but doesn't auto-clear on error
- Recommendations: Clear password field on login error, add explicit form reset

## Performance Bottlenecks

**Multiple Fetch Calls on Asset Prices Each Refresh:**
- Problem: useAssetPrices makes independent requests to CoinGecko and Supabase Edge Function
- Files: `src/hooks/useAssetPrices.ts` (lines 40-76)
- Cause: Sequential try-catch blocks issue separate fetch calls regardless of first one's success
- Impact: Slower initial asset load, higher bandwidth usage, potential rate limiting
- Improvement path:
  - Parallelize requests with Promise.all
  - Cache results more aggressively (current gcTime is good)
  - Implement exponential backoff for failures

**Dashboard Renders All Hooks Regardless of Data Display:**
- Problem: Dashboard queries all data (incomes, expenses, debts, assets, activities) even if not all tabs are visible
- Files: `src/pages/Dashboard.tsx` (lines 59-63)
- Cause: useIncomes, useExpenses, useDebts, useAssets all fetch immediately on mount
- Impact: Initial page load slower with larger datasets; unnecessary network requests
- Improvement path:
  - Implement lazy loading for tab content
  - Only fetch data for visible tabs
  - Use suspense boundaries per section

**No Pagination on Data Tables:**
- Problem: All expenses, income, debts loaded into memory at once
- Files: `src/pages/Expenses.tsx`, `src/pages/Income.tsx`, `src/pages/Debts.tsx`
- Cause: Data filtering happens client-side on full dataset
- Impact: Memory issues with thousands of records, slower renders
- Improvement path:
  - Implement server-side pagination in Supabase queries
  - Add virtual scrolling for large tables
  - Implement infinite scroll pattern

**Inefficient Date Filtering Logic:**
- Problem: String splitting and date parsing happens on every filter operation
- Files: `src/hooks/useFilteredData.ts` (lines 14-19)
- Cause: Date comparison re-computes on every render even with useMemo
- Impact: Performance degrades with large datasets
- Improvement path:
  - Preprocess date formats on data fetch
  - Use date range indexes in Supabase
  - Implement query-level filtering instead of client-side

## Fragile Areas

**AuthContext Bootstrap Process:**
- Files: `src/contexts/AuthContext.tsx` (lines 47-90, 112-152)
- Why fragile: Multiple async operations without proper transaction semantics. Profile/settings creation can partially succeed, leaving inconsistent state.
- Safe modification:
  - Add rollback logic if any step fails
  - Test all failure paths explicitly (profile exists but settings missing, vice versa)
  - Consider using Supabase transactions
- Test coverage: Only bootstrap tests cover happy path in `src/contexts/AuthContext.bootstrap.test.ts`; error paths untested

**Debt Payment Recording:**
- Files: `src/pages/Debts.tsx` (lines 425-522), `src/hooks/useDebts.ts` (lines 133-170)
- Why fragile: Payment amount validation happens client-side; could be bypassed to record invalid payments. Multiple updates required (amount, status, history).
- Safe modification:
  - Never trust client amount calculations
  - Add server-side validation in Supabase RPC
  - Verify payment doesn't exceed remaining debt amount
- Test coverage: No unit tests for MakePaymentForm validation logic

**Currency Conversion:**
- Files: `src/contexts/CurrencyContext.tsx` (lines 92-100), `src/lib/currency.ts`
- Why fragile: Falls back to 0 exchange rate silently if rates unavailable. Calculations could be mathematically wrong without user awareness.
- Safe modification:
  - Warn user when using fallback rates
  - Prevent transactions when rates are stale
  - Add rate freshness check before allowing critical operations
- Test coverage: `src/lib/currency.test.ts` exists but edge cases (0 rate, missing rates) may be incomplete

**i18n Configuration:**
- Files: `src/i18n/index.ts` (680 lines)
- Why fragile: Massive single translation object is error-prone. Missing translations fall back silently to keys.
- Safe modification:
  - Split translations into separate files by domain
  - Add translation completion checker
  - Test for missing keys in all locales
- Test coverage: No tests for i18n configuration or missing translation detection

## Scaling Limits

**Supabase Query Limits:**
- Current capacity: Fetching all debts/incomes/expenses/assets for a user without pagination
- Limit: Breaks when user has >5000 records in a single table
- Scaling path:
  - Implement pagination with limit/offset
  - Add server-side filtering for date ranges
  - Create materialized views for common queries (monthly totals)

**Real-time Subscription Not Implemented:**
- Current capacity: Manual refetch only; data can become stale if edited from another tab
- Limit: Multi-device editing creates data inconsistency issues
- Scaling path:
  - Add Supabase real-time subscriptions
  - Implement optimistic updates
  - Add conflict resolution strategy

**Asset Price API Rate Limits:**
- Current capacity: CoinGecko free tier allows ~50 calls/minute
- Limit: Hitting limits if multiple users refresh simultaneously
- Scaling path:
  - Implement shared cache (Redis or Supabase Edge Function cache)
  - Add client-side rate limiting
  - Use batch endpoints where available

## Dependencies at Risk

**Lovable-tagger Dependency:**
- Risk: Unknown/unmaintained package in dependencies
- Files: `package.json` (line 59: `"lovable-tagger": "^1.1.13"`)
- Impact: Security vulnerabilities in unmaintained packages, potential supply chain attack vector
- Migration plan: Audit usage of lovable-tagger, potentially replace with maintained alternative or inline functionality

**React Router v6.26.2:**
- Risk: Version is not latest; may have security fixes in newer versions
- Files: `package.json` (line 68: `"react-router-dom": "^6.26.2"`)
- Impact: Potential security/routing bugs
- Migration plan: Verify latest version compatibility, upgrade to 6.27+ or latest

**ESLint Configuration Uses RC Version:**
- Risk: eslint-plugin-react-hooks is RC (release candidate)
- Files: `package.json` (line 88: `"eslint-plugin-react-hooks": "^5.1.0-rc.0"`)
- Impact: Unstable linting rules, potential false positives
- Migration plan: Wait for stable release or revert to latest stable

## Missing Critical Features

**No Offline Mode Validation:**
- Problem: PWA claims offline support but data operations aren't fully tested offline
- Blocks: Cannot reliably use app without network connection for operations
- Files: Service worker configuration, no offline transaction handling visible
- Priority: High - users may lose data if offline operations aren't properly queued

**No Undo/Redo Functionality:**
- Problem: Financial data deletions are permanent with no recovery option
- Blocks: Users cannot recover accidentally deleted records
- Files: All pages with delete operations (Debts, Expenses, Income, Assets)
- Priority: High - data loss risk

**No Audit Trail for Financial Records:**
- Problem: Who modified what and when is not tracked for debts/expenses
- Blocks: Cannot detect unauthorized modifications or track compliance
- Files: Database schema, no audit_log table visible
- Priority: Medium - important for financial tracking transparency

**Missing Two-Factor Authentication:**
- Problem: Only email/password authentication available
- Blocks: Account takeover risk, no second factor protection
- Files: `src/pages/SignIn.tsx`, `src/contexts/AuthContext.tsx`
- Priority: Medium - security risk for financial data

## Test Coverage Gaps

**Page Components Largely Untested:**
- What's not tested: All form submissions, validation logic, error states in Expenses, Income, Debts, Assets pages
- Files: `src/pages/Expenses.tsx`, `src/pages/Income.tsx`, `src/pages/Debts.tsx`, `src/pages/Assets.tsx`
- Risk: UI bugs and validation issues reach production undetected
- Priority: High - these are critical user-facing features

**Hook Error Handling Not Tested:**
- What's not tested: Failure scenarios in useDebts, useExpenses, useIncomes, useAssets
- Files: `src/hooks/*.ts` (only AuthContext bootstrap has tests)
- Risk: Silent failures, network errors create bad user experience
- Priority: High - data operations are critical

**Context Cleanup Not Tested:**
- What's not tested: Memory leaks, subscription cleanup in auth/currency/theme contexts
- Files: All contexts in `src/contexts/`
- Risk: Memory leaks in long-running SPA sessions
- Priority: Medium - affects long-term app stability

**CSV Export Not Tested:**
- What's not tested: CSV generation, special character escaping, data formatting
- Files: `src/pages/Settings.tsx` (lines 105-175)
- Risk: Corrupted or incomplete exports for users with special characters in data
- Priority: Medium - data integrity issue

**No E2E Tests:**
- What's not tested: Full user workflows (sign up → add debt → make payment → view history)
- Files: No E2E test framework configured
- Risk: Integration bugs between features go undetected
- Priority: High - integration testing is critical for financial app

## Observation: Hardcoded Fallback Values

**Currency Exchange Rates:**
- Hardcoded fallback rates for gold/silver in `src/hooks/useAssetPrices.ts`
- Files: Lines 19-20
- Risk: If APIs are down for days, users see stale prices without knowing it
- Recommendation: Add timestamp to fallback and warn if older than 24 hours

---

*Concerns audit: 2026-02-22*
