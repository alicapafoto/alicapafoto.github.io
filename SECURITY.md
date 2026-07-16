# Security model

- Card information is handled only by Stripe-hosted Checkout.
- Product IDs, SKUs, print prices, destination rules, and shipping charges are recalculated server-side.
- Browser-submitted prices and shipping amounts are ignored.
- Stripe webhook signatures are verified before an order is recorded.
- A Checkout Session–based idempotency key suppresses duplicate ledger rows from webhook retries.
- Google Sheets appends use `valueInputOption=RAW` so customer-controlled text is not interpreted as formulas.
- Real Stripe, Prodigi, and Google credentials belong only in encrypted Cloudflare secrets.
- The repository, ZIP archive, HTML, and browser JavaScript must never contain secret keys.
- Checkout stays disabled unless Stripe, Prodigi, Google Sheets, webhook, and KV requirements are all present.
- The permanent business archive should contain aggregate information, not customer addresses.
- The private live order ledger should be shared only with a trusted fulfiller and access revoked afterward.

## Manual fulfilment control

A successful payment does not automatically create a Prodigi order. Ali confirms that the Stripe payout is visibly available in Wise before ordering fulfilment.

## Incident basics

If a credential is exposed:

1. Revoke or rotate it immediately at the provider.
2. Replace the corresponding Cloudflare secret.
3. Review Stripe events, Prodigi activity, Cloudflare logs, and Google Sheet sharing.
4. Remove the secret from Git history if it was ever committed.
5. Do not reuse the exposed value.
