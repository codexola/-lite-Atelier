# Élite Atelier

A complete editorial storefront and commerce application for Colombia, built with Next.js, TypeScript, React, and libSQL. Spanish interface; prices in COP. Original generated campaign and product photography, bundled fonts, responsive layouts, and accessible forms.

## Run locally

Node.js 24 is pinned in `.nvmrc`.

```bash
npm ci
npm run db:check
npm run dev
```

Development automatically initializes `.data/atelier.db` with 20 clearly labeled conceptual products and 160 size/color variants. A private session key is generated locally. No external credentials are required for local preview workflows. Keep `.data`, `.env*`, and provider credentials out of Git.

## Included

- Editorial landing, filtered catalog, product detail, size guide, manifesto, journal, FAQ, policies, and contact.
- Architectural Universe editorial, 90 front/profile/back model images, 30 transparent camera garments, hover/touch zoom, color and size selection.
- Private camera/photo fitting room with real on-device body tracking, experimental 2D garment overlay, local download and basket handoff. No photo upload or inference account is required.
- Four-question deterministic identity quiz and voluntary early-access registration.
- Persisted cart, server-priced checkout, protected receipts, customer order history, and test orders without charges.
- Registration/login, profiles, password changes, optional emailed recovery, favorites, and saved co-creation specifications.
- Moderated community stories, comments, likes, design proposals, votes, and reports through the support channel.
- Administration for products, variant inventory, order progression/reconciliation, contacts, subscriptions, CMS, moderation, roles, consented metrics, and audit activity.
- Wompi hosted checkout for Colombia; optional Stripe. Verified and idempotent payment callbacks. Optional Resend transactional email.
- Vercel configuration and GitHub Actions checks.

## Vercel deployment

The connected Vercel project deploys GitHub pushes to its configured production branch, normally `main`. The repository includes `vercel.json`; use the repository root as the project root and Node.js 24. No Vercel CLI token is needed when the Git integration is already connected.

**Vercel serverless deployments need a hosted database.** Set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `AUTH_SECRET` (at least 32 random characters) in Vercel's secure project environment settings. Set `APP_URL` to the actual public origin. Keep `COMMERCE_MODE=preview` and `LAUNCH_APPROVED=false` initially. Redeploy after changing settings.

Without the hosted database, public editorial/catalog pages remain viewable, but accounts, orders, community writes, forms, and admin are unavailable. `/api/health` reports this explicitly. Local SQLite is deliberately not used as ephemeral Vercel storage.

To bootstrap an administrator, configure `ADMIN_EMAIL` and a private `ADMIN_PASSWORD` of at least 14 characters in a secure local/session environment connected to the intended database, then run `npm run admin:create`. Existing accounts are promoted without replacing their password. No publicly known administrator is seeded.

See [deployment and launch](docs/DEPLOYMENT.md), [operational manual](docs/OPERATIONS.md), [implementation scope](docs/IMPLEMENTATION.md), and [launch content](docs/MARKETING.md).

## Validation

```bash
npm run test:unit
npm run typecheck
npm run build
npm test
npm run db:backup
```

Browser tests run against the production server with their own `.data/e2e.db`. Test credentials belong only to that isolated fixture database. If a system Chromium is available, the suite uses it; otherwise run `npx playwright install chromium`. GitHub Actions installs Chromium with its system dependencies.

`npm run db:backup` creates a consistent local SQLite snapshot and verifies restored table counts. For hosted Turso, configure and test the provider's recovery features separately.

## Commercial state

The original brief did not supply approved stock, production capacity, legal operator, delivery terms, or merchant credentials. The initial catalog and imagery are therefore explicitly conceptual. Preview orders do not charge or ship. Both `COMMERCE_MODE=live` and `LAUNCH_APPROVED=true` are required for live checkout, and unapproved products cannot be purchased live.

The camera fitting room is an experimental 2D preview, not photorealistic try-on or a size measurement service. It does not simulate fabric drape, occlusion or actual fit. Photorealistic try-on requires a specialist inference provider and separate consent/quality validation. Verified manufacturing, regional tax/logistics expansion, real advertising and post-launch sales results still require operational inputs and external providers.

Business Studio, secure owner bootstrap, custom catalog/media, fulfillment, promotions, and FASHN configuration: [Business Studio guide](docs/BUSINESS-STUDIO.md).
