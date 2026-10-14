# Requirements and implementation

## Source interpretation

The supplied revised project plan and pasted client conversation were analyzed as project reference materials, not as instructions to contact people, negotiate contracts, approve budgets, publish advertisements, or make manufacturing commitments. The client's expressed direction is premium identity-led fashion with an interactive store, personal style discovery and community. Several prices, mockups, timelines and technologies in the materials are proposals, not accepted commercial facts.

The current user's instruction authorizes implementation and deployment of the application. Their follow-up establishes Colombia and the existing GitHub/Vercel link. The chosen custom application supports the requested co-creation/community differentiators; it does not depend on an unprovided Shopify account. The initial currency is COP. Generated imagery and catalog specifications are labeled conceptual.

## Page and capability map

| Area           | Routes / behavior                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Landing        | `/`, editorial hero, featured products, collections, manifesto, co-creation, quiz, journal, newsletter         |
| Commerce       | `/colecciones`, `/producto/[slug]`, `/guia-tallas`, `/carrito`, `/checkout`, `/pedido/[id]`                    |
| Brand          | `/universo`, `/manifiesto`, `/journal`, `/journal/[slug]`, `/contacto`, `/ayuda`                               |
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
- The user explicitly prioritizes the camera preview. Real MediaPipe body tracking runs locally; its experimental 2D overlay does not reproduce physical cloth, occlusion, exact size or photorealistic try-on. No hosted inference is claimed.
- Colombia is the initial operating scope. Other languages, currencies, jurisdictional taxes and logistics require regional configuration and validation; the current app does not claim global fulfillment.
- No advertising, influencer outreach, abandoned-cart marketing or bulk campaign is sent without provider configuration and consent/operational decisions.
- Real refunds, delivery labels, production capacity and legal review belong to configured providers and the brand's operation.

See VALIDATION.md for executed checks and their boundaries; DEPLOYMENT.md for the actual launch prerequisites.

## Camera fitting and expanded wardrobe

`/probador-virtual` loads self-hosted MediaPipe Pose models only after explicit camera activation or local photo selection. Live frames or photos are processed entirely in the browser. Smoothed shoulder/arm/hip/leg landmarks guide a transparent garment mesh; switching a garment updates the overlay. Size selection is handed to the basket, not inferred from the camera. A manual guide and visual adjustment controls provide a fallback. Camera tracks and inference resources are released on stop or navigation; the local photo is removed on stop. Downloads remain local and carry an experimental-preview label.

The additive seed expands the conceptual catalog from six to 18 products across seven categories, with 150 saved variants. Original six products retain three colors; the 12 additions initially offer their photographed reference color. Thirty transparent cutouts and 90 worn views are supplied. Existing photography and custom catalog records are preserved. All materials, prices and imagery remain conceptual pending commercial approval.

The landing and `/universo` give the existing environmental imagery dedicated architectural/textile/city stories. Glossy panels, pointer-responsive 3D tilt, floating Lab details and scroll movement share the editorial palette. Reduced-motion users see stable content, and text remains readable throughout movement. Mobile wardrobe controls scroll inside their own region.

## Sample-led editorial redesign

The revised visual direction follows the supplied campaign sample with a black/ivory couple portrait, architectural shadows, champagne typography and a compact three-part platform showcase. This includes a functioning landing silhouette selector that carries the chosen model into co-creation; visual model thumbnails and numbered studio steps; keyboard-accessible enlarged product photography; image-led collection and community layouts; and account overview cards linked to the corresponding sections. Original campaign imagery remains conceptual. Shared page, form, product and checkout surfaces carry the same palette and spacing across the system. The redesign does not change stock, payment or manufacturing commitments.

## Modern store and multi-angle garment viewing

The current store combines original campaign, editorial and garment-only imagery with 90 coordinated worn-view images. Collection cards have interactive color previews and a model/garment presentation switch. Product pages have a labeled thumbnail rail beside the main photograph: front, profile, back and the original garment-only shot in its reference color. Color changes preserve the selected worn angle; switching away from the reference color safely changes a garment-only selection to the appropriate worn view.

Fine-pointer hover zoom follows the pointer's location and resets when it leaves. The expanded viewer supplies zoom, previous/next angle and upper/center/lower detail controls for touch and keyboard users, with focus trapping and Escape restoration. Size selection changes orientative measurements and the variant saved to the cart. Variant inventory disables unavailable sizes, and the server still verifies stock and prices at checkout. Basket links preserve chosen color/size; stored order line images match the selected color. Custom product photos retain their own fallback and are not silently replaced by unrelated conceptual assets.

Shared typography, page headings, product cards, controls and surfaces use a contemporary near-white/ink/sage treatment while keeping the Élite campaign palette and identity. All fit images are conceptual illustrations requiring commercial validation.
