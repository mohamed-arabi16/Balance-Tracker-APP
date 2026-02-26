# Release Smoke Checklist

Last updated: February 20, 2026

## Pre-Deploy

- [ ] `npm run quality:ci` passes locally (lint, typecheck, tests, build, bundle budget, security baseline).
- [ ] Migration plan reviewed:
  - [ ] New migrations are ordered and tested on a staging database.
  - [ ] Rollback SQL is prepared for each migration.
- [ ] Environment contract validated:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] Optional keys (`VITE_METALPRICEAPI_API_KEY`, `VITE_ANALYTICS_ENDPOINT`) reviewed.

## Post-Deploy (Within 15 Minutes)

- [ ] App loads without startup config error screen.
- [ ] Sign-in and sign-out flow works.
- [ ] Dashboard renders totals and insights.
- [ ] Assets page:
  - [ ] External price status badges render (`source`, `last updated`, `staleness`, `confidence`).
  - [ ] Manual price refresh button works.
- [ ] Settings changes persist across hard refresh.

## Provider Health Checks

- [ ] Exchange-rate fallback banner displays only when provider is stale/unavailable.
- [ ] Asset-price fallback warning is non-blocking and user can continue.

## Rollback Trigger Criteria

- [ ] Authentication unavailable for more than 5 minutes.
- [ ] Data writes fail on incomes/expenses/debts/assets for more than 5% of requests.
- [ ] Runtime JS error rate spikes above normal baseline for more than 10 minutes.

## Ownership

- Release owner: Engineering on-call
- Data owner: Supabase owner
- Incident commander: Engineering lead on duty
