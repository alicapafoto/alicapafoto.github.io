# Storefront staging build — 15 July 2026

## Added

- Cloudflare Pages Functions architecture.
- Server-side Prodigi quote lookup.
- Server-side Stripe Checkout Session creation.
- Verified Stripe webhook order recording.
- Private Google Sheets ledger integration.
- Checkout success and cancellation pages.
- Secure storefront modal and destination quoting.
- Security headers and secret-management templates.
- Deployment, Google Sheets, operations, and security documentation.
- Automated validation and storefront unit tests.

## Product status

- AtaquaS: active open edition, 30 × 45 cm, `GLOBAL-PAP-12X18`.
- EclaircissE: active open edition, 40 × 50 cm, `GLOBAL-PAP-16X20`.
- Öppiä: Coming soon, purchase disabled.
- IndepenDienta: Coming soon, purchase disabled.
- K.aisa.R, Mèranö, Ràábta: collector editions in preparation.

## Pricing

- Launch: €30 plus customer-paid shipping.
- Regular: €35 plus customer-paid shipping.
- `STORE_PRICE_MODE` controls the active server-side price.

## Security and operations

- No real credentials are included.
- Browser-submitted price and shipping values are ignored.
- Checkout is disabled until every required backend service is configured.
- Google Sheets values are appended as RAW data.
- Fulfilment remains manual after payout availability in Wise.
- Initial delivery coverage is EU + United States.
