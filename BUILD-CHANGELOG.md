# Production-ready copy pass — 17 July 2026

- Added concise, image-specific descriptions for all seven print listings.
- Kept the catalogue grid and full-screen viewer visually clean; descriptions remain in each work’s dedicated purchase panel below the artwork/mockup carousel.
- Added individual interpretive copy for DusaEmas, Gold, Study, and Untitled.
- Expanded the print-programme materials paragraph with precise Dream/Collector Edition information.
- Strengthened the Original Works process close without adding sales pressure.
- Standardized public-facing artist branding as Ali Capa / Ali Capa Foto while retaining legal identity in the Terms and Privacy documents.
- Preserved all prices, sizes, SKUs, edition counts, shipping configuration, and fulfillment metadata from the uploaded authoritative build.

# Build changelog

## 2026-07-17 — final copy, checkout, mobile, and artwork corrections

- Renamed the public open-edition programme to **Dream Editions**.
- Added the **Dare to Dream** heading and final Dream/Collector programme copy.
- Removed public temporary-checkout status messages.
- Changed available purchase controls to **Checkout**.
- Activated K.aisa.R, Mèranö, and Ràábta catalogue checkout states.
- Stored collector delivery charges of €15 for EU/US/Canada and €45 for later rest-of-world expansion.
- Replaced cold references to “the work” with photograph-focused language across the Prints experience.
- Updated the Print Programme statement to “Open to many. Special to few.”
- Replaced the Mèranö room mockup with the final approved image.
- Tightened mobile spacing throughout the Prints page, including the Öppiä-to-IndepenDienta transition.
- Updated the Original Works acquisition footer copy.
- Removed packaging-only backup files from the authoritative handoff.

## 2026-07-16 — catalogue rebuild and final image handoff

- Replaced the staggered Prints-page cascade with two compact catalogue grids.
- Added final artwork and room mockups for all seven works.
- Optimized 14 source images into full web images and generated seven lightweight previews.
- Added physical white-border presentation for Mèranö and Ràábta.
- Introduced `catalog/prints.js` as the single source of truth for artwork, variants, pricing, editions, SKUs and availability.
- Added future-print instructions in `catalog/README.md`.
- Set AtaquaS to €30 and EclaircissE to €35.
- Added K.aisa.R Presence/Immersion, Mèranö Reverie and Ràábta Veil product metadata.
- Added variant selection for K.aisa.R.
- Added provider-aware fulfilment: live Prodigi quotes and fixed collector shipping.
- Preserved Stripe, Google Sheets, Wise-first manual fulfilment and webhook idempotency.
- Added internal store SKU, variant and edition information to the order-ledger Notes field without changing the live sheet column structure.
- Expanded automated tests to cover collector pricing and configured shipping.
- 2026-07-17: Cloudflare production branch changed to main for the production-ready storefront deployment.
- 2026-07-17: Final public domain set to https://alicapa.com; canonical URLs, social metadata, structured data, robots.txt, and sitemap.xml updated to the permanent domain.
- 2026-07-17: Updated storefront checkout display to preserve exact shipping and total cents.
