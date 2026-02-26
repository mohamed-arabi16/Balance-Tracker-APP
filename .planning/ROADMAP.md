# Roadmap: Balance Tracker

## Milestones

- ✅ **v1.0 Advanced Mode MVP** — Phases 1–5 (shipped 2026-02-25)
- ✅ **v1.1 Advanced Dashboard** — Phase 6 (shipped 2026-02-25)

## Phases

<details>
<summary>✅ v1.0 Advanced Mode MVP (Phases 1–5) — SHIPPED 2026-02-25</summary>

- [x] **Phase 1: Database & Type Foundation** — 3/3 plans — completed 2026-02-23
- [x] **Phase 2: Mode Infrastructure** — 4/4 plans — completed 2026-02-24
- [x] **Phase 3: Client Management** — 3/3 plans — completed 2026-02-24
- [x] **Phase 4: Transaction-Client Linking** — 4/4 plans — completed 2026-02-25
- [x] **Phase 5: Invoices & PDF Export** — 7/7 plans — completed 2026-02-25

Full phase details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### ✅ v1.1 Advanced Dashboard — SHIPPED 2026-02-25

- [x] **Phase 6: Advanced Dashboard** — Revenue per client widget, outstanding invoices panel (Requirements: DASH-01, DASH-02) (completed 2026-02-25)

### Phase 6: Advanced Dashboard
**Goal**: Users in Advanced mode have a dedicated dashboard at /advanced showing revenue per client and outstanding invoices — giving a complete financial picture of their freelance business at a glance
**Depends on**: Phase 5
**Requirements**: DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. The Advanced Dashboard at /advanced shows each client with the total amount received from paid invoices — the totals reflect the user's selected currency
  2. The Advanced Dashboard shows an outstanding invoices panel listing every Sent and Overdue invoice with the amount owed, and a total outstanding amount
  3. The existing Dashboard.tsx at /dashboard is not modified — Simple mode users see the identical dashboard they always had
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Add i18n keys + implement AdvancedDashboard with Revenue per Client and Outstanding Invoices widgets
- [x] 06-02-PLAN.md — Human verification of Advanced Dashboard end-to-end in browser

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database & Type Foundation | v1.0 | 3/3 | Complete | 2026-02-23 |
| 2. Mode Infrastructure | v1.0 | 4/4 | Complete | 2026-02-24 |
| 3. Client Management | v1.0 | 3/3 | Complete | 2026-02-24 |
| 4. Transaction-Client Linking | v1.0 | 4/4 | Complete | 2026-02-25 |
| 5. Invoices & PDF Export | v1.0 | 7/7 | Complete | 2026-02-25 |
| 6. Advanced Dashboard | v1.1 | 2/2 | Complete | 2026-02-25 |
