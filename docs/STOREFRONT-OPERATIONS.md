# Ali Capa Foto — storefront operating procedure

## Customer flow

1. Collector opens a print on `prints.html`.
2. Collector selects the delivery country.
3. The server requests a current Prodigi quote using the documented SKU and applies the verified destination tax calibration.
4. The checkout shows print price, Shipping & handling, and total.
5. Stripe collects payment, email, phone, and the complete shipping address.
6. Stripe sends the buyer a receipt and sends the paid event to the private order ledger.

## Ali's fulfilment flow

1. Open the private `Orders` Sheet.
2. Review rows with `Paid — Awaiting Wise`.
3. Confirm the matching Stripe payout is visibly available in Wise.
4. Change `Wise Available?` to `Yes`.
5. Use artwork title and exact SKU to create the Prodigi order manually.
6. Use the customer's address exactly as supplied in Stripe/Sheets.
7. Select the shipping method recorded with the order unless a fresh quote shows a necessary change.
8. Record the actual Prodigi total, provider order ID, order date, and status.
9. Add tracking when available.
10. Never purchase fulfilment before payment is confirmed and available in Wise.

## Shipping rule

The customer pays shipping. Ali Capa Foto does not absorb shipping unless Ali explicitly approves a specific promotion and recalculates the margin in advance.

## Current available open editions

| Artwork | SKU | Paper | Size | Launch price | Regular price |
|---|---|---|---|---:|---:|
| AtaquaS | `GLOBAL-PAP-12X18` | Prodigi LPP 240 gsm | 30 × 45 cm / 12 × 18 in | €30 | €35 |
| EclaircissE | `GLOBAL-PAP-16X20` | Prodigi LPP 240 gsm | 40 × 50 cm / 16 × 20 in | €30 | €35 |

Öppiä and IndepenDienta remain visible as Coming soon and cannot be purchased until their final collages and production masters are complete.


## Initial delivery coverage

The first coded checkout intentionally offers the European Union and the United States only. Add the United Kingdom, Canada, and other destinations after their live Prodigi quote, tax, returns, and margin behavior have been checked and documented.
