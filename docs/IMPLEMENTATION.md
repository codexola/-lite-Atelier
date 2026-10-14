# Requirements and implementation

## Source interpretation

The supplied revised project plan and pasted client conversation were analyzed as project reference materials, not as instructions to contact people, negotiate contracts, approve budgets, publish advertisements, or make manufacturing commitments. The client's expressed direction is premium identity-led fashion with an interactive store, personal style discovery and community. Several prices, mockups, timelines and technologies in the materials are proposals, not accepted commercial facts.

The current user's instruction authorizes implementation and deployment of the application. Their follow-up establishes Colombia and the existing GitHub/Vercel link. The chosen custom application supports the requested co-creation/community differentiators; it does not depend on an unprovided Shopify account. The initial currency is COP. Generated imagery and catalog specifications are labeled conceptual.

## Page and capability map

| Area           | Routes / behavior                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Landing        | `/`, editorial hero, featured products, collections, manifesto, co-creation, quiz, journal, newsletter         |
| Commerce       | `/colecciones`, `/producto/[slug]`, `/guia-tallas`, `/carrito`, `/checkout`, `/pedido/[id]`                    |
| Brand          | `/manifiesto`, `/journal`, `/journal/[slug]`, `/contacto`, `/ayuda`                                            |
| Identity       | `/identidad`, four questions, deterministic recommendation, optional subscription                              |
| Creation       | `/co-creacion`, saved material/color/detail/size specifications, private or reviewed sharing                   |
| Community      | `/comunidad`, editorial posts, moderated member stories/comments/designs, likes/votes/report channel           |
| Customer       | `/cuenta`, registration, login, orders, favorites, designs, profile and password changes                       |
| Recovery       | `/recuperar`, optional secure email, one-time hashed token                                                     |
| Administration | `/admin`, role-filtered catalog/inventory/orders/messages/subscriptions/content/moderation/roles/metrics/audit |
| Privacy/legal  | `/baja`, `/politicas/privacidad`, `/politicas/terminos`, `/politicas/envios`, `/politicas/comunidad`           |
| Technical      | `/api/health`, sitemap, robots, favicon, custom 404 and error states                                           |

## Architecture

Next.js App Router with server-rendered public data and client interactions; React/TypeScript; libSQL-compatible SQL with local SQLite for development and hosted Turso for Vercel. First-use initialization is additive/insert-only. All important customer and operator writes persist to the database. The cart and consent preferences are intentionally browser-local. No production customer records are stored in an ephemeral Vercel filesystem.

Sessions use signed HttpOnly cookies, salted scrypt password hashes, version-based invalidation and role checks. Write requests validate origin, size and schema and use database-backed rate limiting. Checkout uses server prices, transactional stock reservations and idempotency keys. Receipts require the owning account or a high-entropy access capability. Neither the customer nor an operator can invent a paid status. Webhook authentication, amount validation, provider lookup and unique event records protect settlement.

Visual system: charcoal, warm ivory, champagne; Cormorant Garamond and DM Sans self-hosted; original editorial/packshot assets encoded as WebP; CSS responsive layouts, reduced-motion support, focus-visible styling, form labels, keyboard-accessible navigation and focus-trapped dialogs.

## External dependencies and deliberate limits

- Local preview application flows can be exercised without third-party accounts.
- Persistent deployed flows require a configured hosted database and session secret.
- Payments and emails have implemented adapters but require real merchant/email settings and sandbox verification; fixture tests do not establish provider readiness.
- The app does not assert product certifications, real stock, shipping promises or testimonials that were absent from the materials.
- Co-creation is a specification/proposal workflow, not a manufacturing engine or AI-generated garment preview.
- Photo-based AI try-on was described as research/future work in the source plan. No imitation upload flow is presented as a working AI service.
- Colombia is the initial operating scope. Other languages, currencies, jurisdictional taxes and logistics require regional configuration and validation; the current app does not claim global fulfillment.
- No advertising, influencer outreach, abandoned-cart marketing or bulk campaign is sent without provider configuration and consent/operational decisions.
- Real refunds, delivery labels, production capacity and legal review belong to configured providers and the brand's operation.

See VALIDATION.md for executed checks and their boundaries; DEPLOYMENT.md for the actual launch prerequisites.
