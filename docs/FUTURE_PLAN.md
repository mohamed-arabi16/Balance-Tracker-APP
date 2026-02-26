# Next-Level Plan: Freelancer Growth Engine (Aggressive Scope)

## Summary
Transform Balance Tracker from a transaction logger into a freelancer cashflow copilot focused on activation, retention, and referral-ready value.
This plan is optimized for your chosen direction: Growth Features + Aggressive scope + Solo Freelancers.

It builds on current strengths in `/Users/mohamedkhair/Coding/Balance-Tracker/src/pages/Dashboard.tsx`, `/Users/mohamedkhair/Coding/Balance-Tracker/src/pages/Income.tsx`, `/Users/mohamedkhair/Coding/Balance-Tracker/src/pages/Expenses.tsx`, `/Users/mohamedkhair/Coding/Balance-Tracker/src/pages/Debts.tsx`, and `/Users/mohamedkhair/Coding/Balance-Tracker/src/pages/Assets.tsx`, while addressing immediate blockers (test failure and env inconsistency).

## Phase Plan (10 weeks)

## Phase 0 (Week 1): Baseline Integrity for Fast Growth
- Fix failing test in `/Users/mohamedkhair/Coding/Balance-Tracker/src/hooks/useAssetPrices.test.ts` to match current fallback behavior.
- Resolve env contract drift around Supabase pricing endpoint usage in `/Users/mohamedkhair/Coding/Balance-Tracker/src/hooks/useAssetPrices.ts` and env declarations in `/Users/mohamedkhair/Coding/Balance-Tracker/src/vite-env.d.ts`, `/Users/mohamedkhair/Coding/Balance-Tracker/.env.example`, and `/Users/mohamedkhair/Coding/Balance-Tracker/README.md`.
- Convert non-atomic update paths in `/Users/mohamedkhair/Coding/Balance-Tracker/src/hooks/useIncomes.ts` and `/Users/mohamedkhair/Coding/Balance-Tracker/src/hooks/useDebts.ts` into single RPC-backed transactions.
- Acceptance: `npm run lint`, `npm run test`, `npm run build` all pass; no partial-write behavior in income/debt history flows.

## Phase 1 (Weeks 2-4): Activation Engine (Clients + Invoices + Onboarding)
- Add `clients` and `invoices` domain with Supabase migrations and RLS.
- Add routes `/clients` and `/invoices` plus hooks `useClients` and `useInvoices`.
- Connect invoices to existing incomes: invoice status changes drive expected/received income updates.
- Add first-run onboarding wizard in app shell to ensure users complete first value actions.
- Onboarding completion criteria: add first client, first invoice, first expense, and one goal.
- Acceptance: new user reaches "first insight" dashboard state in one guided flow.

## Phase 2 (Weeks 5-7): Retention Engine (Recurring + Forecast + Goals)
- Add `recurring_rules` table and scheduled server process (Edge Function + cron) to auto-generate recurring income/expense/debt entries.
- Add `/planner` route with 90-day cashflow forecast and scenario controls.
- Add `goals` table for tax buffer, emergency fund, and monthly revenue targets.
- Show "runway risk" and "upcoming cash crunch" warnings on dashboard with clear actions.
- Acceptance: planner projections update when invoices or recurring rules change.

## Phase 3 (Weeks 8-10): Growth Loops (Alerts + Digest + Sharing)
- Add in-app `alerts` center for overdue invoices, runway drops, and missed targets.
- Add weekly digest card powered by event + financial snapshot logic.
- Add one-click shareable monthly summary export (CSV remains; add polished report view export).
- Instrument funnel events and retention metrics through `/Users/mohamedkhair/Coding/Balance-Tracker/src/lib/analytics.ts`.
- Acceptance: measurable activation and retention funnel is visible from analytics events.

## Important API / Interface / Type Additions

## Supabase tables (new)
- `clients`: `id`, `user_id`, `name`, `email`, `payment_terms_days`, `default_currency`, `created_at`.
- `invoices`: `id`, `user_id`, `client_id`, `title`, `amount`, `currency`, `issue_date`, `due_date`, `status`, `linked_income_id`, `notes`, `created_at`.
- `recurring_rules`: `id`, `user_id`, `entity_type`, `template_payload`, `interval_unit`, `interval_value`, `start_date`, `next_run_at`, `is_active`, `last_run_at`.
- `goals`: `id`, `user_id`, `goal_type`, `target_amount`, `currency`, `target_date`, `created_at`.
- `alerts`: `id`, `user_id`, `alert_type`, `status`, `payload`, `created_at`, `dismissed_at`.
- `onboarding_progress`: `user_id`, `step`, `completed_at`.

## Supabase functions/RPC (new)
- `upsert_invoice_with_income(payload)` for atomic invoice-income consistency.
- `record_income_payment(payload)` for partial/full payment history integrity.
- `process_recurring_rules(run_at)` for idempotent recurring generation.
- `compute_cashflow_forecast(user_id, horizon_days)` for planner output.

## Frontend contracts (new)
- New hooks in `/Users/mohamedkhair/Coding/Balance-Tracker/src/hooks/`: `useClients.ts`, `useInvoices.ts`, `useRecurringRules.ts`, `useGoals.ts`, `useAlerts.ts`, `useCashflowForecast.ts`.
- New pages in `/Users/mohamedkhair/Coding/Balance-Tracker/src/pages/`: `Clients.tsx`, `Invoices.tsx`, `Planner.tsx`.
- Expand analytics event taxonomy with stable event names: `onboarding_step_completed`, `invoice_created`, `invoice_marked_paid`, `recurring_generated`, `forecast_viewed`, `alert_resolved`.

## Test Cases and Scenarios

## Unit
- Forecast math with mixed currency, missing rates, and negative cashflow.
- Recurring schedule boundary behavior for month-end and timezone shift.
- Invoice status transitions and linked income consistency.
- Goal progress computation under partial data.

## Integration
- Invoice create -> income expected -> partial payment -> paid -> history row correctness.
- Recurring generation idempotency when job runs twice.
- Onboarding resume behavior after refresh/logout.
- Alerts creation/dismissal lifecycle.

## E2E (Playwright)
- New user onboarding path to first dashboard insight.
- Freelancer core loop: create client, issue invoice, log expense, inspect runway.
- Mobile layout sanity for dashboard, invoices, planner, settings.

## Acceptance Gates
- `npm run lint`, `npm run test`, `npm run build` pass.
- No failing critical-path tests.
- Migration rollback SQL available for each new migration.

## Rollout and Monitoring
- Feature flags in `user_settings` for: invoices, recurring engine, planner, alerts.
- Rollout order: internal users -> 10% users -> 50% -> 100%.
- Track activation metric: "completed onboarding + created first invoice within 24h".
- Track retention metric: D7 return rate and weekly active users.
- Track reliability metric: write error rate and recurring job failure rate.
- Add incident checks for new recurring/invoice RPCs in `/Users/mohamedkhair/Coding/Balance-Tracker/docs/operations/INCIDENT_RUNBOOK.md`.

## Assumptions and Defaults
- Single-user accounts remain the scope; no multi-user household/team permissions in this cycle.
- USD/TRY remain the only supported currencies in this cycle.
- Notifications are in-app first; external email/push is deferred.
- Existing PWA/offline behavior remains, but new growth features prioritize online reliability.
- App remains Supabase-backed with React Query and current frontend architecture.
