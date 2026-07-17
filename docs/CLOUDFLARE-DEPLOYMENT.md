# Ali Capa Foto — Cloudflare Pages deployment and live activation

This package keeps GitHub as the source-code archive and uses Cloudflare Pages Functions for private server-side checkout logic.

## 1. Deploy from GitHub

1. Upload the complete build to the intended GitHub repository and branch.
2. In Cloudflare, open **Workers & Pages**.
3. Connect the repository if it is not already connected.
4. Build command: leave blank.
5. Build output directory: `.`.
6. Confirm Pages Functions under `/functions` are detected.

## 2. KV binding

Bind the existing KV namespace to the Pages project as:

`ORDER_EVENTS`

This prevents Stripe webhook retries from creating duplicate Google Sheets rows.

## 3. Variables and encrypted secrets

Use `.dev.vars.example` as the names-only checklist.

Encrypted secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PRODIGI_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`

Non-secret settings:

- `STORE_ENV=live`
- `SITE_URL=https://FINAL-DOMAIN`
- `GOOGLE_SHEET_NAME=Orders`
- `PRODIGI_DEFAULT_TAX_RATE=0.20` — verify against live account quotes
- `PRODIGI_TAX_RATES_JSON={"US":0}` — keep valid JSON and expand only from verified data
- `SHIPPING_PROCESSING_RATE=0.035`
- `SHIPPING_HANDLING_CENTS=50`

Never put real keys in GitHub, client-side JavaScript, screenshots, or the downloadable business archive.

## 4. Stripe live setup

1. Use the Stripe live-mode secret key.
2. Create or update the live webhook endpoint:
   `https://FINAL-DOMAIN/api/stripe-webhook`
3. Subscribe to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
4. Save the live endpoint signing secret as `STRIPE_WEBHOOK_SECRET`.
5. Confirm Stripe Checkout displays the correct business name, Terms, Privacy, receipts, and EUR currency.

The storefront creates one server-side Checkout Session per purchase. Browser-submitted prices and shipping amounts are never trusted.

## 5. Prodigi live quoting

1. Add the live Prodigi API key.
2. Keep automatic order creation disabled.
3. Confirm live quotes for AtaquaS and EclaircissE to Portugal and at least one additional EU destination.
4. Confirm a United States quote before promoting US delivery.
5. Ali manually places each Prodigi order only after the payout is visibly available in Wise.

## 6. Collector Editions

Collector delivery charges are already stored in `catalog/prints.js`:

- €15 EU
- €15 US
- €15 Canada
- €45 rest of world, reserved for later expansion

Collector products do not require a Creativehub API connection. After payment and Wise confirmation, Ali places the matching Creativehub / theprintspace order manually using the provider SKU recorded in the order ledger.

## 7. Google Sheets order ledger

Follow `GOOGLE-SHEETS-SETUP.md`. Share the private order sheet with the service-account email and use the `Orders` worksheet unless intentionally changed.

The webhook appends each paid order with the initial status:

`Paid — Awaiting Wise`

## 8. Final controlled test

Before announcing the shop:

- Run `npm test` and `npm run validate` locally.
- Confirm `/api/catalog` reports checkout-ready products once all bindings are present.
- Complete one controlled live payment for the lowest-priced available print.
- Confirm Stripe marks it paid.
- Confirm exactly one Google Sheets row is created.
- Confirm a repeated webhook event does not create a duplicate row.
- Refund the controlled payment if appropriate.
- Confirm no secret appears in page source, browser responses, Git history, or the ZIP.

## 9. Domain consistency

`SITE_URL`, the public site domain, Stripe webhook URL, and Stripe Terms/Privacy URLs must all use the final production host. Run the existing domain update script when needed:

```bash
npm run set-domain -- https://FINAL-DOMAIN
```
