# Dependency Waivers

Last updated: February 20, 2026

## Open waivers

### DEV-001: ESLint toolchain transitive vulnerabilities (`minimatch`, `ajv`)

- Status: Active (temporary)
- Scope: Development tooling only (`eslint`, `@eslint/config-array`, `@eslint/eslintrc`, `typescript-eslint`)
- Audit impact:
  - `minimatch` high severity (ReDoS advisory)
  - `ajv` moderate severity (ReDoS advisory)
- Reason:
  - `npm audit` reports fixes only via `eslint@10`.
  - Current lint plugin chain (`eslint-plugin-react-hooks`) does not declare ESLint 10 compatibility.
  - Forcing ESLint 10 now would be a breaking toolchain upgrade and risks blocking CI/dev workflows.
- Risk assessment:
  - No direct production runtime exposure (tooling dependency).
  - Residual risk accepted temporarily while enforcing lockfile hygiene and controlled CI execution.
- Mitigations in place:
  - Non-breaking `npm audit fix` applied.
  - `sucrase` patch update applied to remove vulnerable `glob` transitive chain.
  - Dependencies pinned via lockfile and reviewed in CI.
- Required follow-up:
  1. Re-evaluate weekly for ESLint 10 compatibility in plugin chain.
  2. Upgrade lint stack once plugin compatibility is available.
  3. Remove this waiver immediately after upgrade and re-run `npm audit --audit-level=high`.

### DEV-002: Vite/esbuild advisory (`esbuild <= 0.24.2`)

- Status: Active (temporary)
- Scope: Build/dev tooling (`vite@5.x`)
- Audit impact:
  - `esbuild` moderate severity advisory
- Reason:
  - `npm audit` indicates fix path via `vite@7`, a major upgrade requiring a controlled migration.
- Risk assessment:
  - Primarily impacts local/dev server threat model.
  - Not directly reachable in production static asset runtime.
- Mitigations in place:
  - Use trusted local development environments.
  - Avoid exposing development server to untrusted networks.
- Required follow-up:
  1. Plan Vite 7 migration in a dedicated branch.
  2. Run compatibility checks with current plugins (`@vitejs/plugin-react-swc`, lint/build scripts).
  3. Remove waiver after successful upgrade and verification.
