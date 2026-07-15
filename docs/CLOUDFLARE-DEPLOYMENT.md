# Ali Capa Foto — Cloudflare Pages deployment

This package keeps GitHub as the source-code archive while moving the commercial storefront to Cloudflare Pages and Pages Functions.

## 1. Create the Pages project

1. In Cloudflare, open **Workers & Pages**.
2. Choose **Create application → Pages → Connect to Git**.
3. Select the existing `alicapafoto.github.io` repository.
4. Production branch: `main`.
5. Build command: leave blank.
6. Build output directory: `.`.
7. Deploy first as a preview/staging site. Do not point the public domain at it yet.

## 2. Create a KV namespace for webhook idempotency

Create a KV namespace called `ali-capa-order-events` and bind it to the Pages project as:

`ORDER_EVENTS`

This prevents Stripe webhook retries from creating duplicate rows.

## 3. Set variables and encrypted secrets

In **Settings → Variables and Secrets**, add the values listed in `.dev.vars.example`.

Encrypted secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PRODIGI_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`

Non-secret settings:

- `STORE_ENV=test` during setup; change to `live` only at launch.
- `STORE_PRICE_MODE=launch` for the first seven days; change to `regular` afterward.
- `SITE_URL=https://your-pages-domain.pages.dev` during staging, then the final public domain.
- `GOOGLE_SHEET_NAME=Orders`
- `PRODIGI_DEFAULT_TAX_RATE=0.20` — current EU calibration value; verify with live quotes.
- `PRODIGI_TAX_RATES_JSON={"US":0}` — destination overrides; keep this valid JSON and add countries only after their tax treatment is verified.
- `SHIPPING_PROCESSING_RATE=0.035`
- `SHIPPING_HANDLING_CENTS=50`

Never put real keys in GitHub, HTML, JavaScript sent to the browser, screenshots, or the master business archive.

## 4. Stripe setup

1. Stay in Stripe test mode.
2. Create a webhook endpoint:
   `https://YOUR-STAGING-DOMAIN/api/stripe-webhook`
3. Subscribe to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Confirm the public business settings include the correct Terms and Privacy URLs so Checkout can require terms acceptance.
6. Enable Stripe customer receipts in the Dashboard.

The storefront creates one Checkout Session per purchase. Product price and SKU are selected server-side; browser-submitted prices are never trusted.

## 5. Prodigi setup

1. Use the Prodigi sandbox API key while testing.
2. The server calls the Quote endpoint for all available methods and selects the lowest shipping price returned.
3. Confirm at least one quote for Portugal, Germany/France, and the United States. The initial storefront intentionally enables EU destinations and the US only.
4. Compare API results against the manual dashboard. Adjust `PRODIGI_DEFAULT_TAX_RATE` and `PRODIGI_TAX_RATES_JSON` only from verified account data.
5. Automatic Prodigi order creation remains disabled. Ali manually orders only after the Stripe payout is visibly available in Wise.

## 6. Google Sheets order ledger

Follow `GOOGLE-SHEETS-SETUP.md`. The webhook appends each paid order to the private `Orders` worksheet with the initial status:

`Paid — Awaiting Wise`

## 7. Test before launch

- Run `npm install`, `npm test`, and `npm run validate` locally.
- Run `npm run dev` with a private `.dev.vars` file.
- Use Stripe test cards.
- Confirm a successful test purchase creates exactly one Google Sheet row.
- Re-send the same Stripe event and confirm it is marked as a duplicate rather than appended again.
- Confirm no API key appears in page source, browser network responses, Git history, or the ZIP.
- Confirm the selected shipping country is the only country accepted by the Checkout Session.
- Confirm the order appears as `Paid — Awaiting Wise` and not `Ready to Fulfil`.

## 8. Domain cutover

When the staging checkout passes:

1. Choose the final Cloudflare Pages/custom domain.
2. Run:
   `npm run set-domain -- https://FINAL-DOMAIN`
3. Set `SITE_URL` to the same domain in Cloudflare.
4. Update the Stripe webhook URL if the host changed.
5. Test again in Stripe test mode.
6. Change to live Stripe and Prodigi keys only after the final test passes.
7. Keep GitHub Pages online briefly as a fallback, then redirect or retire it once the Cloudflare site is verified.
