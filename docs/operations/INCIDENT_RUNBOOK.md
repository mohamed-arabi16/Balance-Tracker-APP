# Incident Runbook

Last updated: February 20, 2026

## Severity Model

- `SEV-1`: Full outage (auth unavailable, app cannot load, data corruption risk).
- `SEV-2`: Major degradation (write failures, external provider failures affecting key flows).
- `SEV-3`: Partial degradation (non-critical UI regressions, stale data indicators active).

## Initial Response (First 10 Minutes)

1. Assign incident commander.
2. Capture scope:
   - impacted routes
   - impacted users
   - first detection time
3. Check release timeline and recent migrations.
4. Start incident log in the on-call channel.

## Playbooks

### Auth Outage

1. Verify Supabase auth status and project health.
2. Validate frontend env contract (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Test sign-in/sign-out manually.
4. If unresolved in 10 minutes, rollback to last known healthy release.

### Data Write Failures (incomes/expenses/debts/assets)

1. Confirm RLS and migration integrity.
2. Reproduce write path with one known user.
3. Check recent schema changes and trigger/RPC behavior.
4. Disable risky release and rollback migration if needed.

### External Provider Outage (rates/prices)

1. Validate fallback UX appears (warning banners, staleness badges).
2. Confirm core flows remain writable and non-blocking.
3. Temporarily disable auto-refresh if request volume is causing throttling.
4. Track provider recovery and clear incident after 2 successful refresh cycles.

## Communication Template

- Start:
  - "Investigating incident `<id>` affecting `<scope>`. Next update in 15 minutes."
- Update:
  - "Current status: `<status>`. Mitigation: `<action>`. ETA: `<eta>`."
- Resolve:
  - "Resolved incident `<id>`. Root cause: `<summary>`. Follow-up actions tracked in backlog."

## Postmortem Checklist

- [ ] Timeline completed with exact timestamps.
- [ ] Root cause and contributing factors documented.
- [ ] Detection gap and prevention actions defined.
- [ ] Test/monitoring gaps converted into tracked engineering tasks.
