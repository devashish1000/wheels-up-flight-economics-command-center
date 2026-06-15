# Wheels Up Flight Economics Command Center

A Vercel-ready static SaaS MVP that demonstrates a finance + operations command center for a private aviation operator.

## What It Proves

- Public service-area and region adjusted-contribution reporting.
- Sales-channel economics across Wheels Up app + website, sales + service teams, Delta partnership booking, corporate membership, safety-vetted operator network, and Air Partner group/cargo desk.
- Aircraft and mission economics with variable flight cost, FBO/handling, partner selling cost, and recommendations.
- Rolling 104-week forecasts with scenario controls.
- Modeled evidence operating action queue.
- Send-ready weekly flight economics summary.
- CSV validation and export workflows.
- Optional guided onboarding tour for first-time reviewers.

## Important Disclosure

The app uses sample modeled operating data for a Wheels Up application prototype. It is not actual Wheels Up data and does not use private company systems.

Public-facing variables are aligned to Wheels Up public materials as of June 15, 2026: Signature Membership, global private charter, corporate membership / Custom Enterprise Solutions, Delta premium-commercial integration, Group Charter, Air Partner Cargo / Special Missions, published service-area categories, Phenom 300 series, Challenger 300 series, and public operating metrics such as Total Gross Bookings, Private Jet Gross Bookings, Live Flight Legs, Utility, Completion Rate, On-Time Performance, and Adjusted Contribution Margin.

## Public Sources Used

- Wheels Up Q1 2026 results: https://investors.wheelsup.com/news/news-details/2026/Wheels-Up-Announces-First-Quarter-Results-and-New-Delta-Led-Financing/default.aspx
- Wheels Up 2025 annual report: https://s27.q4cdn.com/682800059/files/doc_financials/2025/ar/2025-Wheels-Up-Experience-Inc-Annual-Report-to-Stockholders.pdf
- Wheels Up Signature Membership announcement: https://investors.wheelsup.com/news/news-details/2025/Wheels-Up-Launches-New-Membership-Portfolio/default.aspx
- Wheels Up service-area map: https://pages.wheelsup.com/rs/541-LAT-007/images/Wheels_Up_Service_Area_Map_v2024.pdf
- Wheels Up Delta commercial booking announcement: https://investors.wheelsup.com/news/news-details/2025/Wheels-Up-to-Launch-Industry-First-Self-Booking-of-Delta-Commercial-Flights-for-Members/default.aspx
- Wheels Up / Air Partner news and services: https://www.airpartner.com/en/about-us/news/

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
