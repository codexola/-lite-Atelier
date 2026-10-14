# Atelier operations

## Roles

- Customer: own account, orders, favorites, designs, community participation.
- Editor: catalog/variant inventory, content, and moderation. No customer-order or subscriber access.
- Operator: orders, reconciliation, subscriber export, and customer messages. No CMS or role assignment.
- Admin: all functions, including roles, metrics and activity.

API authorization enforces these permissions independently of the UI. The initial administrator is created by the secure bootstrap command; customer registration never grants administrative access. Administrators cannot demote themselves from the panel.

## Catalog

Open `/admin` → Catálogo. Create or edit a product, collection, description, composition, fit, price in COP and a library image. Visibility and homepage featuring are independent. Approval for sale is separate from visibility. Prices are stored as integer centavos; checkout reads them from the server.

The initial stock field initializes/replaces every size/color variant. Use the per-variant inventory table for precise quantities. Inventory cannot be overwritten while that product/variant has pending payment reservations. Upload approved photography into `public/images/` through the repository and use a `.webp` library path; arbitrary external image URLs and insecure uploads are not accepted.

## Orders

Preview orders are retained separately from real sales. Operators can cancel a preview order. A real order becomes paid only through verified payment evidence. Valid fulfillment progression is paid → processing → shipped → delivered. Updating a paid order's status does not send tracking emails or procure shipping labels; the logistics operator supplies those services.

Use Conciliar pago for a pending order with a recorded provider identifier. It checks the provider, rather than assuming payment from a customer's report. Pending Wompi orders without an identifier require a merchant-portal lookup by reference. Refunds are handled in the merchant portal, with manual reconciliation; the panel deliberately does not pretend that changing a status refunds money.

## Community and proposals

Stories, comments, and shared designs enter moderation. Private designs appear only in their owner's account. Review original content, third-party rights, and community standards before publication. Approval publishes the item; rejection keeps it off the public community. Votes indicate interest, not manufacturing commitments. Report links lead to the contact channel for manual review.

## Contacts and subscriptions

Mensajes contains support inquiries. Reply using the mail client link and mark the message resolved. Subscribers have separate marketing consent. CSV export neutralizes formula-leading characters. Never add unsubscribed contacts to campaigns or expose the exported file publicly.

The optional email integration sends transactional notices and welcome/recovery messages. Automated advertising, abandonment marketing and bulk campaigns are not activated by the repository. They require consent rules, configured providers, frequency limits and operator approval; no messages are sent to third parties during development.

## CMS and metrics

Contenidos edits homepage copy, manifesto, policies and the contact email. CMS text is rendered as plain text, preserving paragraphs; arbitrary HTML is not executed. Activity records administrative edits and operational changes. Metrics store only allowed event names and timestamps, after optional consent; they do not identify customers or import advertising trackers.

## Local data and recovery

`.data/atelier.db` persists local development data. Do not delete it to refresh dependencies. `npm run db:backup` takes a consistent snapshot and compares restored counts for principal tables. Use secure storage for these backups: they may contain personal data. Hosted Turso recovery must be configured and tested through the provider. Never restore a development database over production.

Password changes increment the account's session version, invalidating older sessions. Emailed recovery tokens are hashed in the database, single-use, and valid for 30 minutes. Recovery needs configured email. Data access/deletion requests arrive in Mensajes → Privacidad y datos personales and must be processed by the responsible operator, including applicable backups/retention rules.
