# Build changelog

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
- Added provider-aware fulfilment: live Prodigi quotes and configurable collector shipping.
- Added conservative checkout locks for upcoming, proof-held, sold-out and unconfigured products.
- Preserved Stripe, Google Sheets, Wise-first manual fulfilment and webhook idempotency.
- Added internal store SKU, variant and edition information to the existing order-ledger Notes field without changing the live sheet column structure.
- Expanded automated tests to cover collector pricing and configured shipping.
