# Validation evidence

Validated on 14 October 2026 against the local production build with Node.js 24.19.0. External merchant/email/database services were not configured; their real connectivity and production operation remain launch checks.

| Check                                | Result                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Frozen dependency install (`npm ci`) | Passed; repeatable without changing source or data                                                                      |
| TypeScript / production build        | Passed                                                                                                                  |
| Domain tests                         | 7 passed; no failures or skipped tests                                                                                  |
| Production-browser suite             | 10 passed; no failures or skipped tests                                                                                 |
| Responsive overflow                  | Passed at 360, 390, 768, 1024 and 1440 px for home, catalog, product, creator, account and community                    |
| Automated accessibility              | No WCAG A/AA violations in the scanned home, account, contact and identity pages; dialog focus wrapping/Escape verified |
| Local database readiness             | 6 conceptual products / 90 variants; health reports database/auth ready, preview commerce                               |
| Local backup restore                 | Consistent snapshot created; principal restored table counts matched                                                    |
| Production dependency audit          | 0 vulnerabilities reported by `npm audit --omit=dev`                                                                    |
| Formatting                           | Passed                                                                                                                  |

The browser suite checks catalog filtering and public-page responses; size selection and cart persistence; preview checkout and protected confirmation; four-question identity recommendations; account registration/favorites/designs; origin and consent validation; server prices and simultaneous idempotent requests; moderation/roles/messages/CMS; responsive widths and actual image loading; accessibility and dialog focus; signed payment fixture settlement, duplicate callbacks, wrong totals, forged signatures and exactly-once inventory release; and administrator UI/variant inventory access.

The Wompi unit tests reject modified signed fields and verify that order references come from a mocked authoritative transaction API, rather than unsigned event fields. The Stripe callback browser test uses a signed local fixture. Neither is a real payment, merchant sandbox exercise or proof of commercial readiness.

Screenshots and HTML/trace test reports are generated in ignored `test-results/` and `playwright-report/`; test data stays in the isolated `.data/e2e.db`. Production uses a separate database.

Automated checks do not constitute a complete accessibility certification, legal review, field Core Web Vitals result or real customer acceptance. Check actual Vercel data persistence, account/admin flows, provider sandbox behavior, email delivery, hosted backup/restore and commercial content before launch.

## Mobile laboratory performance

After correcting the initial loading shift, Lighthouse reported Performance **94**, Accessibility **100**, and Best Practices **100**, with CLS **0**, TBT **50 ms**, and LCP **3.1 seconds** in this local emulated-mobile run. The 2.5-second LCP target has not been demonstrated; actual deployment/CDN and field measurements remain necessary. The SEO audit's remaining failing item is the intentional preview `noindex`/robots restriction, which changes only after approved live launch. All other audited SEO checks passed.

The responsive and accessibility browser checks were rerun after this correction: **2 passed**. No assertions were disabled to obtain these results.
