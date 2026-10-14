# Validation evidence

Validated on 14 October 2026 against the local production build with Node.js 24.19.0. Local tests use isolated fixtures. The connected Vercel preview now passes database/auth readiness and live account/favorite persistence checks; real merchant/email operation remains unverified.

| Check                                | Result                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen dependency install (`npm ci`) | Passed; repeatable without changing source or data                                                                                                                  |
| TypeScript / production build        | Passed                                                                                                                                                              |
| Domain tests                         | 9 passed; no failures or skipped tests                                                                                                                              |
| Production-browser suite             | 16 passed; no failures or skipped tests                                                                                                                             |
| Responsive overflow                  | Passed at 360, 390, 768, 1024 and 1440 px for home, catalog, product, creator, account, community, Universe and camera fitting                                      |
| Automated accessibility              | No WCAG A/AA violations in the scanned home, account, contact, identity, catalog, product, Universe and camera fitting pages; dialog focus wrapping/Escape verified |
| Local database readiness             | 18 conceptual products / 150 variants; health reports database/auth ready, preview commerce                                                                         |
| Local backup restore                 | Consistent snapshot created; principal restored table counts matched                                                                                                |
| Production dependency audit          | 0 vulnerabilities reported by `npm audit --omit=dev`                                                                                                                |
| Formatting                           | Passed                                                                                                                                                              |

The browser suite checks catalog filtering and public-page responses; size selection and cart persistence; preview checkout and protected confirmation; four-question identity recommendations; account registration/favorites/designs; origin and consent validation; server prices and simultaneous idempotent requests; moderation/roles/messages/CMS; responsive widths and actual image loading; accessibility and dialog focus; signed payment fixture settlement, duplicate callbacks, wrong totals, forged signatures and exactly-once inventory release; and administrator UI/variant inventory access.

The Wompi unit tests reject modified signed fields and verify that order references come from a mocked authoritative transaction API, rather than unsigned event fields. The Stripe callback browser test uses a signed local fixture. Neither is a real payment, merchant sandbox exercise or proof of commercial readiness.

Screenshots and HTML/trace test reports are generated in ignored `test-results/` and `playwright-report/`; test data stays in the isolated `.data/e2e.db`. Production uses a separate database.

Automated checks do not constitute a complete accessibility certification, legal review, field Core Web Vitals result or real customer acceptance. Check actual Vercel data persistence, account/admin flows, provider sandbox behavior, email delivery, hosted backup/restore and commercial content before launch.

## Mobile laboratory performance (initial design)

After correcting the initial loading shift, Lighthouse reported Performance **94**, Accessibility **100**, and Best Practices **100**, with CLS **0**, TBT **50 ms**, and LCP **3.1 seconds** in this local emulated-mobile run. The 2.5-second LCP target has not been demonstrated; actual deployment/CDN and field measurements remain necessary. The SEO audit's remaining failing item is the intentional preview `noindex`/robots restriction, which changes only after approved live launch. All other audited SEO checks passed.

The responsive and accessibility browser checks were rerun after this correction: **2 passed**. No assertions were disabled to obtain these results.

## Fresh-machine verification

A hosted CI browser-test startup failure prompted a clean-directory check. A file-based database override previously required its parent directory to exist. Initialization now creates the parent for file URLs, while hosted libSQL URLs retain their normal remote behavior. The complete browser suite was rerun against an entirely new, previously uncreated database directory: **10 passed**. Test configuration explicitly isolates email/payment bindings and uses Playwright's installed Chromium on GitHub Actions.

GitHub Actions subsequently passed the complete hosted workflow for commit `63cce77`: https://github.com/codexola/-lite-Atelier/actions/runs/38554127741.

The receipt regression now verifies that completing the active checkout empties its basket, while reopening that receipt after selecting another product preserves the new basket. Receipt polling clears the active checkout only once.

## Connected Vercel project

On 14 October 2026, https://liteatelierdemo.vercel.app/ and `/co-creacion` both returned HTTP 200. Its health endpoint returned HTTP 503 with `database:true`, `auth:false`, `commerce:"preview"`, and `payment:false`. These checks demonstrate deployed public pages and database readiness, but authenticated workflows still require Production `AUTH_SECRET` and redeployment. Real payment and email delivery remain unverified.

## Editorial redesign validation

The sample-led redesign adds an original black/ivory campaign photograph, a three-part landing experience with an interactive silhouette selector, studio handoff via a validated model query, visual studio thumbnails and numbered steps, product image enlargement with Escape/focus restoration, collection/community editorial headers, and account navigation cards. The production build, formatting check, and complete browser suite passed: **11 tests**, including the new landing-to-studio handoff and enlarged-image checks. Existing account, checkout, moderation, inventory, responsive and accessibility checks remain enabled.

A new local emulated-mobile Lighthouse run of the redesigned landing reported Performance **91**, Accessibility **100**, Best Practices **100**, CLS **0.004**, TBT **100 ms**, and LCP **3.4 seconds**. The wordmark accessible-name advisory was corrected afterwards. These are laboratory results, not field metrics. Preview SEO remains intentionally restricted.

## Modern wardrobe and fit gallery

The complete production browser suite passed **13 tests**, with **8 domain/media tests** passing. New checks cover front/profile/back selection, preserving the active angle across color changes, pointer-relative hover zoom and its reset, enlarged-view zoom and angle navigation, Escape/focus restoration, mobile zoom controls, collection presentation switching, selected-color URL handoff, selected size/color/image in the basket, and HTTP 200/image MIME responses for all 54 exported worn images. Accessibility scans include the catalog, product page and enlarged viewer. A collapsed image-link hit area discovered by the store test was fixed; the test then passed without forced clicks or disabled assertions.

Eighteen original generated triptychs provide six garments × three colors × three angles. The 54 WebP exports occupy approximately 2.1 MB. Campaign/editorial imagery and original garment-only photographs are retained. Size selection exposes the same orientative body measurements as the existing size guide; generated images do not claim to simulate a particular customer's fit or changes in garment size. Existing custom/approved product photographs are preserved when they differ from a conceptual reference. Availability reads saved variant inventory, and checkout remains authoritative.

The live authentication check was retried after the user's reported Production redeployment and still returned `auth:false` before this update was published. The updated health response distinguishes `missing` from `too-short` without disclosing the secret or its value. API JSON responses explicitly use `Cache-Control: no-store`. Final live deployment readiness must be checked after publication.

## Final connected deployment verification

The Production session secret was corrected: the live health endpoint now returns **HTTP 200**, `status:"ok"`, `database:true`, `auth:true`, `authConfiguration:"ready"`, and `commerce:"preview"`. A synthetic `.invalid` QA account labeled “QA · Verificación técnica” verified registration, signed sessions, logout, login and favorite persistence across sessions against the deployed database. Its temporary favorite was removed and the session closed; no checkout or email was submitted. Temporary test credentials/cookies were kept private and discarded.

Hosted GitHub Actions passed for `aa09eed`: https://github.com/codexola/-lite-Atelier/actions/runs/38564497069. The GitHub browser reporter now exposes future failed assertions as workflow annotations; existing list/HTML reports remain. The gallery/media implementation is commit `b23a54e`, with mobile touch targets and wordmark accessibility refinements in `aa09eed`.

The final local emulated-mobile Lighthouse run reports Performance **91**, Accessibility **100**, Best Practices **100**, CLS **0.00055**, TBT **110 ms**, and LCP **3.3 seconds**. This is a laboratory measurement; field metrics and the 2.5-second LCP target remain unverified. Preview SEO remains intentionally restricted. All 54 worn-image exports were checked for successful static delivery in the browser suite; deployed store/product pages and representative asset bytes were also verified after publication.

## Expanded wardrobe and local camera preview

The current implementation has 18 conceptual products, 150 stored variants, 90 front/profile/back photographs and 30 transparent camera garments. The original imagery and catalog records remain. Domain checks verify every photographed color/view and alpha-bearing camera asset, custom-image fallback, valid pose geometry and rejection of hidden/invalid joints. The production browser suite covers the expanded admin categories/image library and stock changes without inventing additional colors.

Camera checks execute the real self-hosted MediaPipe model, not mocked pose landmarks. A generated catalog photo and simulated camera video produce body detection and visible overlays. Tests verify a photo overlay persists after 1.6 seconds; garment/color changes; a local labeled download; selected size/color in the basket; no photo POSTs, external model/CDN requests or image data in localStorage; camera tracks ending on stop and client navigation; and rejected permission/unsupported photo recovery. Layout and WCAG scans include `/universo` and `/probador-virtual`. All layout-visible landing images are scrolled into view and checked for completed loading, excluding transient hidden server-streaming DOM copies.

These checks establish a functioning experimental 2D preview in Chromium and responsive layouts at the listed widths. They do not establish fabric simulation, photorealism, precise garment size, physical camera quality on every mobile device, or specialist hosted inference. The user explicitly requested the camera preview first. A repeatable `npm ci` also verified automatic model/runtime copying from the frozen npm dependency; model originals remain unmodified and carry the upstream license.
