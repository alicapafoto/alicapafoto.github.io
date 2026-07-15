# Ali Capa Foto — Cloudflare storefront staging package

## Status

This package is a **tested staging build**, not a live store. It contains no real API keys, passwords, Google credentials, or customer data. Checkout remains disabled until every required secret and binding is configured in Cloudflare.

## What is ready

- Existing Ali Capa website preserved.
- Public commercial hosting structure prepared for Cloudflare Pages.
- Two active accessible open editions:
  - AtaquaS — `GLOBAL-PAP-12X18` — €30 launch / €35 regular.
  - EclaircissE — `GLOBAL-PAP-16X20` — €30 launch / €35 regular.
- Öppiä and IndepenDienta shown as Coming soon and cannot be purchased.
- Server-side Prodigi quote lookup.
- Server-trusted product, SKU, price, destination, and shipping calculation.
- Stripe-hosted Checkout Session creation.
- Stripe webhook verification and duplicate suppression.
- Private Google Sheets order-ledger append.
- Customer-supplied sheet values written as RAW data to prevent spreadsheet-formula execution.
- Customer-paid shipping and manual fulfilment after Wise availability.
- Terms, privacy, security headers, success/cancel pages, tests, and operating documentation.

## Initial delivery coverage

The launch selector intentionally contains the European Union and the United States only. Additional countries should be enabled only after live quote, tax, returns, and margin checks.

## First files to read

1. `docs/CLOUDFLARE-DEPLOYMENT.md`
2. `docs/GOOGLE-SHEETS-SETUP.md`
3. `docs/STOREFRONT-OPERATIONS.md`
4. `.dev.vars.example`
5. `docs/ORDER_LEDGER_TEMPLATE.csv`

## Local checks

```bash
npm install
npm test
npm run validate
```

For local Cloudflare Pages Functions testing, copy `.dev.vars.example` to `.dev.vars`, add **test credentials only**, and run:

```bash
npm run dev
```

Never commit `.dev.vars` or any real secret.

## Activation sequence

1. Deploy to a Cloudflare staging URL.
2. Create and bind `ORDER_EVENTS` KV.
3. Create the private Google Sheet and service account.
4. Add encrypted Cloudflare secrets and non-secret settings.
5. Create the Stripe test webhook.
6. Compare live/sandbox Prodigi quote output with the dashboard.
7. Complete test purchases for Portugal, an EU destination, and the US.
8. Confirm exactly one order-ledger row per paid Checkout Session.
9. Set the final domain and retest.
10. Switch to live Stripe/Prodigi credentials only after all checks pass.

## Pricing switch

Use `STORE_PRICE_MODE=launch` for the introductory €30 price. Seven days after the actual public launch, change it to:

```text
STORE_PRICE_MODE=regular
```

The server will then use €35 without editing product-page code.
