# AGENTS.md

Operational guide for AI agents contributing to this repository.

## 1) Mission and Priorities

Build and maintain a reliable personal finance frontend with safe defaults.

When tradeoffs appear, prioritize in this order:

1. Correctness and data integrity
2. Security and secret hygiene
3. User-facing stability (no regressions)
4. Maintainability and readability
5. Delivery speed

## 2) Current Stack (Source of Truth)

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- React Router v6
- Supabase client integration
- ESLint

Note: Vitest/RTL are recommended but not yet wired into `package.json` scripts in this repo.

## 3) Repository Map

Use this layout when deciding where code belongs:

```text
.
├── src/
│   ├── components/
│   │   ├── layout/          # App shell primitives (sidebar, navbar, layout)
│   │   └── ui/              # shadcn-based reusable presentational components
│   ├── contexts/            # Global providers (auth, currency, date, theme)
│   ├── hooks/               # Data and behavior hooks (Supabase-backed included)
│   ├── integrations/        # External integration glue (Supabase client/types)
│   ├── lib/                 # Utilities, env parsing, shared clients/helpers
│   ├── pages/               # Route-level screens
│   ├── i18n/                # Localization setup
│   └── main.tsx             # App bootstrap
├── public/                  # Static assets
├── supabase/                # Supabase configs/migrations (if present)
└── docs/                    # Project documentation
```

## 4) Required Workflow for Every Change

1. Understand scope first.
   - Read the relevant page/component/hook chain end-to-end.
   - Identify side effects (auth, navigation, currency/date filters, API calls).
2. Make the smallest safe change.
   - Avoid broad refactors unless requested.
   - Preserve public interfaces unless you intentionally migrate all callers.
3. Verify locally.
   - Run `npm run lint`.
   - Run `npm run build`.
   - If a command fails because of existing unrelated issues, report it clearly.
4. Summarize with evidence.
   - List changed files.
   - Describe behavior impact and risk.
   - Report verification command results.

## 5) Coding Standards

### TypeScript

- Use explicit types for exported functions, component props, and hook return values.
- Avoid `any`; if unavoidable, isolate it and explain with a short comment.
- Prefer `unknown` over `any` at external boundaries.
- Validate external or environment-derived values before use.

### React Components

- Use function components and hooks.
- Keep components focused; move data logic into hooks when it grows.
- Keep render paths deterministic; avoid hidden mutable module state.
- Use `PascalCase.tsx` for components and pages.

### Hooks and Data Access

- Keep async data access in hooks, not deeply embedded in UI components.
- Maintain clear loading/error/empty states for user-facing async data.
- Handle race conditions and stale updates in effects.
- Reuse existing hooks before creating new ones.

### Styling and UI

- Use Tailwind utilities and existing design tokens/patterns.
- Reuse components from `src/components/ui/` before introducing new primitives.
- Ensure responsive behavior on common mobile and desktop breakpoints.
- Preserve accessibility: labels, keyboard support, focus visibility, semantic HTML.

### File and Naming Discipline

- Keep feature-related logic colocated where practical.
- Use descriptive names (`useFilteredExpenses`, not `useData2`).
- Remove dead code and stale imports in touched files.

## 6) Security and Secrets

- Never expose service credentials in frontend code or env files.
- Do not place `SUPABASE_SERVICE_ROLE` in any client-side environment file.
- Read client env vars through existing env utilities (`src/lib/env.ts`) when possible.
- Avoid logging sensitive payloads (tokens, personally identifiable financial data).

## 7) Financial Domain Guardrails

- Treat monetary values carefully:
  - Avoid lossy parsing and inconsistent rounding.
  - Keep currency conversion logic centralized and explicit.
- Preserve chronological correctness in date filtering and history views.
- Do not silently drop failed writes/updates; surface actionable feedback.

## 8) Testing and Verification Policy

Minimum required before merging:

```bash
npm run lint
npm run build
```

When adding non-trivial logic, also do at least one of:

- Add/update automated tests (if test harness is present for that area).
- Provide a short manual QA checklist in the change summary.

Manual QA should cover:

- Happy path
- Empty/loading/error states
- Auth-gated behavior (when relevant)
- Mobile layout sanity

## 9) Git and PR Hygiene

- Branch names should be descriptive: `feature/<topic>` or `fix/<topic>`.
- Keep commits focused and atomic.
- PR descriptions should include:
  - What changed
  - Why it changed
  - Risks and rollback notes
  - Verification evidence (lint/build/test/manual QA)

## 10) Definition of Done

A task is done only when all are true:

- Requested behavior is implemented.
- No obvious regressions introduced in affected flows.
- Lint and build pass, or failures are documented as pre-existing/unrelated.
- Documentation is updated when behavior or setup changes.
- User-facing errors are understandable and actionable.

## 11) Anti-Patterns to Avoid

- Large rewrites when a targeted fix is enough
- Duplicating similar hooks/components instead of reusing/extending
- Mixing business logic deeply inside presentational components
- Silent `catch` blocks that hide failures
- Introducing new dependencies for small solvable problems

## 12) Quick Commands

```bash
# install
npm install

# develop
npm run dev

# quality gates
npm run lint
npm run build

# preview production build
npm run preview
```
