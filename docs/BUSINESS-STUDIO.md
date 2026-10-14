# Business Studio and realistic fitting

## Separate access

Use `/admin/login`. Vercel Production `ADMIN_EMAIL` and `ADMIN_PASSWORD` bootstrap the owner into the persistent database once, storing a salted scrypt hash. No credentials are bundled into the site or Git. The configured password must contain at least ten characters. Customer login never grants access to the staff workspace; staff uses its own HttpOnly eight-hour session cookie. Roles are checked against the database on every authenticated request. Change the password in Security after the first login; the bootstrap migration will not undo that change. The editor handles catalog, images, content, moderation and design review. The operator handles customers, orders, shipping, discounts, returns, campaigns and reports. Only the administrator manages staff roles. Login and generation endpoints enforce rate limits.

## Catalog and images

Create and archive categories and collections without editing code. Add products with unique SKU, price in COP, weight, descriptive materials/fit, custom color names/hex values and custom sizes. Generate a variant grid and maintain stock and optional individual prices. Prices are validated again at checkout. A pending payment reservation prevents replacing a product's variant grid. Historical order line items retain their original descriptions, price and images.

Upload JPG, PNG or WebP photographs (up to 3 MB and 24 megapixels per file). The server rotates, resizes and re-encodes them to WebP and stores the optimized bytes in the persistent libSQL database. Uploads survive deployments. Assign a cover and a labeled gallery, color and angle for each view. Supply matching photos for each color: the software does not turn an unrelated photo into accurate evidence of a new garment. Public catalog images are distinct from private customer try-on photos.

The sample wardrobe now has 20 conceptual products, 160 stored size/color variants, 96 worn front/profile/back images and 32 transparent camera cutouts. The original photos remain, alongside the new cool-white fashion campaign and reference-inspired fitted black blazer and ivory scarf blouse. Catalog images, materials and prices require business approval before live selling.

## Operations

Shipping methods store country, price, free-shipping threshold and delivery conditions. Checkout uses these rates and server-validated percent/fixed discount codes with minimum, expiry and commercial usage limits. Preview orders do not consume commercial coupon uses. Releasing an unpaid reservation restores its consumed coupon use once.

Inspect order details and print a picking list. Register carrier, tracking number and HTTPS tracking link for a paid order, then progress to shipped/delivered without moving backwards. This is manual carrier fulfillment; there is no invented carrier-label API. Saved customer addresses and order history are restricted to their owners and authorized operators.

Full-order return requests support approval, receipt, one-time restocking and refund requests. Stripe uses its refund API when configured. Other gateways require processing the money in their portal; an operator can explicitly record the reference and reconciliation note. Such a manual record is an operator attestation, not automated proof from the gateway. Failed or uncertain Stripe requests remain visible for reconciliation instead of being blindly resubmitted. Preview orders cannot be fulfilled or refunded as paid orders.

Reports aggregate the whole database, excluding preview orders from confirmed sales, and subtract recorded completed refunds for net revenue. Work lists show up to 500 recent orders/customers. Authenticated CSV exports iterate the complete selected dataset and neutralize spreadsheet formulas. Image work lists show the latest 250 assets.

Draft campaigns for opted-in subscribers/customers. Sending requires explicit staff confirmation and configured Resend credentials, verified sender and public URL. Small resumable batches claim deliveries before sending; unsubscribe consent is rechecked for each address. Failed or uncertain deliveries require reconciliation with the email provider, preventing silent duplicate sends. An application deployment does not send campaigns. Shared co-creation proposals have feasibility, cost, decisions and review notes visible to their customer owner.

## FASHN integration

Set `FASHN_API_KEY` securely in Vercel Production, ensure the provider account has credits, and redeploy. `/api/try-on/config` exposes only provider/model/configuration status. The official `fashn` SDK submits `tryon-max`, quality mode, one 1K JPEG result and private Base64 output. Keep the key server-side. Do not set `FASHN_BASE_URL` in production; it is only used by the isolated automated provider fixture.

Customers can use their camera or a local photo, capture the unmodified person image, explicitly consent to sending it to FASHN, and generate the selected product/color. Account login is required for hosted generation. The job displays queue/processing progress, supports resuming polling without paying for a second submission, before/after comparison, memory-only recent looks and JPEG download. Photo bytes and generated results are not stored in the application database or localStorage; database rows contain only private owner/job metadata and expire after an hour. Deleting removes the app association and clears the browser experience; it does not cancel an already running provider job or guarantee deletion at the provider. FASHN's private result retrieval expires after 60 minutes. Review FASHN's privacy/retention terms before production use.

The local MediaPipe camera overlay remains a private approximate 2D visual preview; it is not photorealistic inference. It supports camera switching, mirror controls, pose tracking, alignment and partial-body guidance, including occluded arm fallback. The generated FASHN visual does not measure size or guarantee physical garment fit. An active provider key is not evidence of successful paid inference: real output quality must be checked with consented photographs after configuration. Automated tests use the official SDK with a simulated HTTP provider and do not spend credits or claim a real provider quality test.

## Scope and source references

The two uploaded development plans inform the feature matrix below. Their suggested integrations, legal/business approvals and budgets are context, not independent authorization to charge money, send campaigns or invent credentials. The user's direct instructions authorize implementing and publishing the application. The supplied design references inform original garments, editorial composition, the studio and the camera experience. Requests to inspect glance.com, glamurmagazine.co.uk, hockerty.uk and dribbble.com returned HTTP 403 from the cloud network, so no verified comparative audit or parity claim is made. Official FASHN SDK documentation/source was accessible through GitHub.

| Requested capability                                | Application implementation                                                                                          | External launch prerequisite                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Modern landing, editorial and architectural imagery | Cool-white/ink direction, original campaign collage, dark Fashion Story section, retained spatial images and motion | Brand/art approval                                                           |
| Expanded product catalog and editable taxonomy      | Product/category/collection creation, custom variants, stock, persistent image uploads, archive                     | Real approved catalog, pricing, material/size evidence                       |
| Product detail                                      | Worn multi-angle gallery, hover/detail zoom, size/color selection and individual variant prices                     | Matching actual product images                                               |
| Customer accounts and security                      | Persistent accounts, favorites, recovery, separate staff sessions and role controls                                 | Production database, AUTH_SECRET, APP_URL; email for delivery of reset links |
| Checkout and payments                               | Server totals, coupons, configured destination rates, idempotency, reservation and signed webhook settlement        | Wompi/Stripe credentials and approved live launch                            |
| Inventory and fulfillment                           | Variant inventory, paid-order picking lists, manual carrier tracking and status controls                            | Carrier account/actual tracking and operational policies                     |
| Returns/refunds                                     | Owner requests, decision/restock workflow, Stripe refund API, manual gateway reconciliation record                  | Payment gateway access and returns policy                                    |
| Customer management                                 | Private order/address history, saved addresses, authenticated exports                                               | Privacy/business operating policy                                            |
| CMS and moderation                                  | Editable copy/policies/images; community posts/reactions/comments/voting and moderation                             | Publish approved policy text and community rules                             |
| Style identity                                      | Four-question deterministic profile and recommendations                                                             | No hosted AI required                                                        |
| Co-creation                                         | Customer design specifications and feasibility/cost/approval review                                                 | Production planning and approved design options                              |
| Marketing and reporting                             | Consent, opt-out, draft/batch campaigns, full-dataset reports and CSV                                               | Resend sender configuration; reviewed content before explicit send           |
| Camera preview                                      | Local real pose tracking, garment alignment, photo upload and capture, mobile controls                              | User camera permission and supported device                                  |
| Realistic virtual try-on                            | Official FASHN SDK, private authenticated jobs, consent/progress/comparison/download                                | Valid FASHN key/credits and real consented output quality test               |
| Automatic deployment                                | GitHub main → linked Vercel project                                                                                 | Existing project bindings and production environment variables               |

Automatic taxation, carrier API labels, physical fit measurement, global translated catalogs and merchant payout reconciliation beyond the implemented payment/return workflows are not claimed. New shipping destinations can be configured, but business readiness for international selling requires policy, tax and gateway review.

## Optional repository-based worker

The actual FASHN VTON 1.5 pipeline now has a separate authenticated GPU-worker implementation and a private service adapter. Hosted FASHN remains the default key-only Vercel activation. The worker has not run GPU inference here and is not active on the shop. Its mandatory parser has a research/evaluation-only inherited license, so commercial usage rights must be resolved first. See [verified feasibility, implementation and deployment steps](SELF-HOSTED-VTON.md).
