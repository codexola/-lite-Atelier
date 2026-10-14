# Deployment and commercial launch

## GitHub → Vercel

The connected public project is **https://liteatelierdemo.vercel.app**. On 14 October 2026, `/` and `/co-creacion` returned HTTP 200. `/api/health` returned HTTP 503 with `database:true`, `auth:false`, and `commerce:"preview"`: the database check succeeds, but Production needs a random `AUTH_SECRET` of at least 32 characters and a redeployment before authenticated operation can be verified. Set `APP_URL=https://liteatelierdemo.vercel.app` for provider redirects and email links.

1. In the existing Vercel project, verify repository `codexola/-lite-Atelier`, production branch `main`, root directory `.`, framework Next.js, and Node.js 24.
2. Add the settings below in Vercel's secure environment settings. Use separate preview and production databases, provider keys, and secrets. Never put credentials into Git, a chat message, screenshots, or public build logs.
3. Push the checked application to `main`. Vercel automatically installs the frozen lockfile and runs domain tests plus the production build.
4. Check the deployment's actual URL. Verify `/api/health` returns HTTP 200 and `{status:"ok",database:true,commerce:"preview"}` before claiming the full system is operational.
5. Repeat registration, cart → test order → receipt, admin, community moderation, and email checks against that deployment. A successful local build is not proof of remote persistence or provider connectivity.

## Required for the data-backed preview

| Setting              | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `TURSO_DATABASE_URL` | Actual hosted libSQL/Turso URL. Never use a local file URL on Vercel. |
| `TURSO_AUTH_TOKEN`   | Database access token, entered securely.                              |
| `AUTH_SECRET`        | Private random session-signing secret, minimum 32 characters.         |
| `APP_URL`            | Exact deployed origin, including `https://`, without a trailing path. |
| `COMMERCE_MODE`      | `preview` initially.                                                  |
| `LAUNCH_APPROVED`    | `false` until commercial launch checks are complete.                  |

The database schema and preview seed are initialized automatically on first use. Subsequent invocations preserve existing products and records. Product seeding is insert-only; CMS edits are not overwritten.

Create the first administrator from an authorized environment connected to the production database. Use the secure `ADMIN_EMAIL` and `ADMIN_PASSWORD` bindings and `npm run admin:create`; remove the bootstrap password binding afterwards. Do not create a public default account.

## Colombia payments

Wompi is the default hosted-payment provider. Merchant onboarding and its sandbox/live settings must be completed with Wompi.

- `PAYMENT_PROVIDER=wompi`
- `WOMPI_PUBLIC_KEY` (the correct sandbox or production public key)
- `WOMPI_INTEGRITY_SECRET`
- `WOMPI_EVENTS_SECRET`
- Event callback URL: the deployed origin plus `/api/webhooks/wompi`.

The server creates the integrity signature from order reference, integer centavos, COP, and the merchant integrity secret. It validates event checksums and reads the authoritative transaction from Wompi before trusting the reference or settling an order. Never mark orders paid from the checkout redirect. The API destination is selected from the public-key environment: `sandbox.wompi.co` or `production.wompi.co`; customer checkout uses `checkout.wompi.co`.

An abandoned Wompi checkout with no transaction identifier cannot safely release inventory automatically. Search the order reference in the merchant portal and reconcile it before changing stock. Verified declined/void/error events release a pending reservation exactly once. Pending transactions with an identifier can be reconciled from admin. Late payments after released/cancelled reservations return a reconciliation error and require merchant review; do not ignore repeated failing webhook deliveries.

Stripe is optional for a merchant account that supports the chosen operating arrangement:

- `PAYMENT_PROVIDER=stripe`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Callback: `/api/webhooks/stripe`.
- Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`.

Stripe checkout sessions expire after 30 minutes; a verified expiry or failed-payment callback releases reserved inventory once. A paid callback must match the saved COP total. Preview and production webhooks must not share secrets.

## Email

Set `RESEND_API_KEY` and `EMAIL_FROM` after verifying the sending domain. Requests use `api.resend.com`. Set `APP_URL` before testing unsubscribe and password recovery links. Without these bindings, forms and test orders remain saved, but email is not claimed as sent and password recovery reports the configuration prerequisite. Paid-order confirmation and lead-welcome delivery must be verified with the real provider before launch.

## Live launch gate

Before setting `COMMERCE_MODE=live` and `LAUNCH_APPROVED=true`:

- Replace conceptual imagery and specifications with approved commercial product information, or explicitly approve their intended commercial use.
- Enter real stock for each variant. Review production feasibility and co-creation rules.
- Fill in legal operator, NIT, customer-service channels, pricing/tax treatment, delivery coverage, guarantees, retracto/reversión and return terms for Colombia.
- Replace policy drafts in CMS; validate security, privacy, legal and operational obligations with responsible professionals.
- Configure `SHIPPING_FEE_COP` and `FREE_SHIPPING_COP` to approved amounts. The reference defaults are 25,000 and 1,200,000 COP respectively. Live prices must already incorporate the approved tax treatment; the app does not calculate regional taxes.
- Mark only actually saleable products as approved in admin.
- Complete sandbox payments: approved, declined, abandoned, duplicate callbacks, stock conflicts and refund/late-payment reconciliation. The automated callback tests use fixtures; they do not prove real merchant connectivity.
- Verify emails, production persistence, backup/restore, monitoring and the mobile purchase flow on the actual deployment.

## Recovery and maintenance

Use a prior Vercel deployment for application rollback. Database rollback is a separate operation: record the database schema version and restore a verified provider snapshot if necessary. Configure provider backup retention, alerts for webhook/API failures and a support owner. Monitor HTTP 5xx rates and failed webhook deliveries. Rotate compromised keys and invalidate existing sessions when needed by rotating `AUTH_SECRET`.

The project snapshot contains installed files, not live server processes. Restart services for a new cloud task using the saved startup instructions. Do not create Git worktrees unless explicitly requested.
