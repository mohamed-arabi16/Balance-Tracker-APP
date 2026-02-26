# Vite + React + Shadcn + TypeScript Starter

This is a starter template for a new project with Vite, React, Shadcn, and TypeScript.

## How to use

1.  **Clone the repository**

    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Run the development server**

    ```bash
    npm run dev
    ```

4.  **Build for production**

    ```bash
    npm run build
    ```

## Technologies used

*   Vite
*   React
*   Shadcn
*   TypeScript
*   Tailwind CSS

## Environment variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Optional:

- `VITE_METALPRICEAPI_API_KEY`
- `VITE_ANALYTICS_ENDPOINT`

The app now fails fast at startup if required variables are missing and renders
an explicit configuration error screen.

Never place `SUPABASE_SERVICE_ROLE` in frontend env files.

## Progressive Web App (PWA)

PWA entry files must live in `public/` so Vite and Lovable copy them directly to
`dist/` during build/export.

Current PWA public assets:

- `public/manifest.json`
- `public/sw.js`
- `public/offline.html`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/apple-touch-icon.png`

Validation tip: after `npm run build`, confirm the same files exist in `dist/`.

## Security checks

Run a production-focused dependency audit:

```bash
npm run audit:prod
```

For full dependency tree visibility (including dev tooling):

```bash
npm run audit:high
```

Any residual dev-only findings should be tracked in
`docs/security/DEPENDENCY_WAIVERS.md` with mitigation and follow-up.

## Quality gates

Run all production-readiness gates locally:

```bash
npm run quality:ci
```

## Operations runbooks

- Release smoke checklist: `docs/operations/RELEASE_SMOKE_CHECKLIST.md`
- Incident runbook: `docs/operations/INCIDENT_RUNBOOK.md`

## License

This project is licensed under the MIT License.
