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
- 2026-07-17: Added final live-rate confirmation so the storefront displays the exact server-approved Stripe total before redirecting whenever a fresh fulfilment quote changes.

## 2026-07-17, worldwide launch consolidation

- Expanded the country selector to Stripe-supported worldwide destination codes.
- Kept Dream Edition delivery provider-aware through live Prodigi quotes.
- Added approved regional Collector Edition delivery charges and regional provider-cost estimates.
- Preserved final server-side quote confirmation before Stripe redirect.
- Rewrote public descriptions and labels to remove editorial dashes while preserving Ali Capa's poetic voice.
- Moved inline page scripts and styles into external files and removed `unsafe-inline` from Content Security Policy.
- Added WebP alternatives for five large artwork views while retaining JPEG fallbacks.
- Added Cloudflare rate-limiting deployment guidance for quote and checkout endpoints.
- Added a separate Cloudflare Worker foundation for a private daily 10 p.m. Lisbon order digest.
- Kept Öppiä and IndepenDienta visible as Available soon; all completed Dream and Collector Editions remain enabled.

## 2026-07-19 — Collector display and catalogue correction

- Fixed the Android/mobile collapse of bordered artwork views that squeezed Mèranö and Ràábta into thin horizontal strips.
- Added explicit 4:5 paper sizing and normal block sizing for nested `<picture>` elements.
- Updated the authoritative collector records while preserving existing product IDs, variant IDs, provider SKUs and legacy Store_SKUs:
  - K.aisa.R Immersion: €350.
  - Mèranö Reverie: 50 × 40 cm / 20 × 16 in, 25 mm border, Clean certificate, €150.
  - Ràábta Veil: 75 × 60 cm / 30 × 24 in, 25 mm border, Clean certificate, €200.
- Added cache-busting query strings to the corrected print CSS, storefront module and catalogue import.
- Retained manual Creativehub fulfilment and all existing Stripe, shipping, webhook and Google Sheets safeguards.

## 19 July 2026 — Join Us navigation label

- Changed the public navigation label linking to `support.html` from **Support** to **Join Us** across desktop, mobile, and home overlay navigation.
- Kept the existing support-page title and contribution copy unchanged pending the later artistic page-copy decision.
- No checkout, payment, shipping, catalogue, webhook, or fulfilment logic was changed.


## 20 July 2026, Colourful Dimensions staging preview

- Renamed public Original Works language to Original Artworks.
- Added two-image Original Artwork carousels and removed manual enquiry actions.
- Added temporary insured-delivery preparation state for Original Artworks.
- Introduced Colourful Dimensions as the Prints-page umbrella.
- Updated Dream Editions and Collector Editions card and acquisition language.
- Moved K.aisa.R Presence and Immersion selection into the acquisition panel.
- Rewrote Join Us using Colourful Dimensions terminology.
- Changed public artist narrative to first person where appropriate.
- Updated success, cancellation, privacy and terms copy.
- Validated HTML, storefront functions, JavaScript syntax, asset paths and navigation consistency.
- Marked package as staging preview only; no production deployment completed.

## 20 July 2026 — staging analytics and hard safety correction

- Replaced live staging configuration with `STORE_ENV=staging` and `STAGING_SAFE_MODE=true`.
- Removed production KV bindings from the staging Wrangler configuration.
- Added Analytics Engine dataset binding and `/api/track`.
- Added anonymous conversion events for print views, acquisition intent, variant selection, quotes, checkout, Patreon, contributions and NiNE purchase links.
- Added server-confirmed checkout-completed tracking through the Stripe webhook path for future non-safe-mode use.
- Updated the Privacy Policy and CSP for Cloudflare Web Analytics.
- Disabled all live-payment routes and direct payment links in the staging preview.
