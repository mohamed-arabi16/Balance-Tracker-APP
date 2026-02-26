---
phase: 03-client-management
plan: 01
subsystem: api
tags: [react-query, supabase, tanstack-query, i18n, react-i18next, hooks, crud]

# Dependency graph
requires:
  - phase: 01-database-type-foundation
    provides: clients table Row/Insert/Update types in Database type (src/integrations/supabase/types.ts)
  - phase: 02-mode-infrastructure
    provides: queryKeys factory with clients() key (src/lib/queryKeys.ts)
provides:
  - "useClients hook: fetch all clients ordered by name, user-scoped via RLS + enabled guard"
  - "useClient hook: fetch single client by id and user_id with PGRST116 not-found handling"
  - "useAddClient mutation: insert new client with user_id, invalidates list cache"
  - "useUpdateClient mutation: update by id+user_id with defensive updated_at timestamp, prefix invalidation"
  - "useDeleteClient mutation: delete by id+user_id, invalidates list cache"
  - "Client type: exported from Database['public']['Tables']['clients']['Row']"
  - "34 clients.* i18n keys in English translation"
  - "34 clients.* i18n keys in Arabic translation"
affects:
  - 03-client-management (plans 02, 03 depend on useClients for data and clients.* keys for display)
  - 04-transaction-linking (ClientSelector component will use useClients)
  - 05-invoices (invoice forms need client list via useClients)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "queryKeys factory pattern — all new hooks use queryKeys.clients(userId) instead of inline arrays"
    - "TanStack Query v5 compliance — no onSuccess in useQuery, only in useMutation"
    - "RLS double-check pattern — mutations filter by both id AND user_id for defense-in-depth"
    - "Prefix invalidation — invalidating queryKeys.clients(userId) automatically covers detail keys via prefix matching"
    - "Defensive updated_at — explicitly set updated_at in update payload (no moddatetime trigger assumed)"

key-files:
  created:
    - src/hooks/useClients.ts
  modified:
    - src/i18n/index.ts

key-decisions:
  - "No onSuccess in useQuery — TanStack Query v5 removed this API; onSuccess only in useMutation"
  - "Prefix invalidation for useUpdateClient — invalidating the list key also invalidates detail keys automatically"
  - "Defensive updated_at in useUpdateClient — included explicitly since STATE.md notes moddatetime trigger presence is an open question"
  - "Pre-existing build failure (lovable cloud-auth-js) is out of scope — confirmed identical error exists in git history before these changes"

patterns-established:
  - "queryKeys factory: new Phase 3+ hooks use queryKeys.{entity}(userId) exclusively"
  - "CRUD hook structure: fetchFn + useQuery/useMutation pair, enabled: !!user guard, invalidation in onSuccess"

requirements-completed: [CLNT-01, CLNT-02, CLNT-03, CLNT-04]

# Metrics
duration: 1min
completed: 2026-02-24
---

# Phase 3 Plan 01: Client CRUD Hooks and i18n Foundation Summary

**5 typed CRUD hooks for Supabase `clients` table using queryKeys factory and TanStack Query v5, plus 68 i18n keys (34 EN + 34 AR) covering all client UI surfaces**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-24T16:39:25Z
- **Completed:** 2026-02-24T16:40:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/hooks/useClients.ts` with all 5 exported CRUD hooks (useClients, useClient, useAddClient, useUpdateClient, useDeleteClient) and the exported Client type — first Phase 3+ hook using the queryKeys factory exclusively
- Added 34 English + 34 Arabic `clients.*` i18n keys covering all client UI surfaces: list page, form fields, empty state, detail view, delete confirmation, and toast notifications
- Established patterns for all subsequent Phase 3 hooks: queryKeys factory, RLS double-check on mutations, prefix invalidation, TanStack Query v5 compliance

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useClients.ts with all CRUD hooks** - `57332e2` (feat)
2. **Task 2: Add all clients.* i18n keys to EN and AR translations** - `027ed26` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/hooks/useClients.ts` — All 5 client CRUD hooks + Client type, using queryKeys factory, TanStack Query v5 compliant, RLS double-check on all mutations
- `src/i18n/index.ts` — Added 34 EN and 34 AR `clients.*` translation keys covering all client UI surfaces

## Decisions Made

- No onSuccess in useQuery — TanStack Query v5 removed this API; onSuccess only used in useMutation (per plan requirement)
- Prefix invalidation for useUpdateClient — invalidating `queryKeys.clients(userId)` automatically covers the detail key `[...queryKeys.clients(userId), clientId]` via prefix matching behavior in TanStack Query
- Defensive `updated_at` in useUpdateClient — explicitly set to `new Date().toISOString()` since STATE.md notes presence of moddatetime trigger is an open question; this is a no-op if the trigger exists, and a correctness fix if it doesn't
- Pre-existing build failure in `src/integrations/lovable/index.ts` (unresolvable `@lovable.dev/cloud-auth-js`) is pre-existing and out of scope — confirmed by `git stash` test showing identical failure before any changes

## Deviations from Plan

None - plan executed exactly as written. The build failure noted in verification is pre-existing (confirmed with git stash test) and unrelated to this plan's changes.

## Issues Encountered

`npm run build` fails with `@lovable.dev/cloud-auth-js` unresolvable from `src/integrations/lovable/index.ts`. This is a **pre-existing issue** that exists in the codebase before this plan's changes (verified via git stash). TypeScript (`npx tsc --noEmit`) passes with zero errors on all plan changes. The build issue is logged to deferred-items.md.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `useClients.ts` is ready for consumption by Phase 3 plans 02 (ClientList page) and 03 (ClientDetail page)
- All `clients.*` i18n keys are ready for use in any component via `useTranslation()`
- The queryKeys factory pattern is now established — Phase 3 plans 02 and 03 should import from `src/lib/queryKeys.ts`

## Self-Check: PASSED

- FOUND: src/hooks/useClients.ts
- FOUND: src/i18n/index.ts
- FOUND: .planning/phases/03-client-management/03-01-SUMMARY.md
- FOUND commit: 57332e2 (feat(03-01): create useClients.ts with all 5 CRUD hooks)
- FOUND commit: 027ed26 (feat(03-01): add all clients.* i18n keys to EN and AR translations)

---
*Phase: 03-client-management*
*Completed: 2026-02-24*
