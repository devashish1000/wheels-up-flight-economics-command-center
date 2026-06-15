# Wheels Up Flight Economics Command Center

A Vercel-ready static SaaS MVP that demonstrates a finance + operations command center for a private aviation operator.

## What It Proves

- Base and region adjusted-contribution reporting.
- Sales-channel economics across member app/web, member services, Delta referral, corporate desk, broker/partner network, and group/cargo desk.
- Aircraft and mission economics with variable flight cost, FBO/handling, partner selling cost, and recommendations.
- Rolling 104-week forecasts with scenario controls.
- Modeled evidence operating action queue.
- Send-ready weekly flight economics summary.
- CSV validation and export workflows.
- Optional guided onboarding tour for first-time reviewers.

## Important Disclosure

The app uses sample modeled operating data for a Wheels Up application prototype. It is not actual Wheels Up data and does not use private company systems.

## Run Locally

This project has no package manager or build step.

```bash
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173
```

## Test

Use the bundled Codex Node runtime if system Node is unavailable:

```bash
/Users/dev/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tests/calculations.test.mjs
```

Expected output:

```text
calculation smoke tests passed
```

## Deploy To Vercel

This is a static project. Deploy the repository root to Vercel. If the Vercel CLI is authenticated:

```bash
vercel --prod
```

If using the Vercel web UI, import the repo and keep the default static settings. There is no build command and no output directory.

## Files

- `index.html` - app entry point.
- `src/app.js` - navigation, state, views, interactions.
- `src/data.js` - deterministic sample private aviation operating data.
- `src/calculations.js` - finance formulas, variance bridge, forecasts.
- `src/charts.js` - dependency-free SVG charts.
- `src/csv.js` - CSV parsing, validation, downloads.
- `src/export.js` - weekly summary and export helpers.
- `src/styles.css` - Wheels Up-aligned internal SaaS design system.
- `samples/` - example CSV templates.
- `assets/` - design reference and synthetic aviation imagery.
