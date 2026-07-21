# First Real Print Order Checklist

Use this checklist for the first genuine Stripe print payment. Do not use the friend’s Mixam book purchase as proof of the new print-order backend because Mixam uses a separate external route.

## A. Payment confirmation

- Confirm the Stripe payment shows successful or paid.
- Record the Stripe Checkout Session ID.
- Record the Payment Intent ID.
- Confirm the paid total matches the product price plus the quoted delivery.
- Confirm the destination country and customer address are complete.
- Do not place the supplier order yet.

## B. D1 atomic ledger

- Open the production D1 database `ali-capa-order-ledger-production`.
- Find the row for the Stripe Checkout Session ID.
- Confirm there is exactly one row.
- Confirm status is `completed`.
- Confirm `sheet_synced` is `1`.
- Confirm no unresolved `last_error` is present.
- Do not manually duplicate the row.

## C. Google Sheets operational mirror

- Open the live Ali Capa orders sheet.
- Search for the Stripe Checkout Session ID.
- Confirm exactly one row exists.
- Confirm artwork, variant, provider, provider SKU, size, paper, quantity, print price, delivery charged, customer total, destination, customer details, and initial status are correct.
- Initial status should show payment received but awaiting Wise and supplier order not yet placed.
- If the row is missing or duplicated, stop fulfilment and investigate before ordering.

## D. Wise payout gate

- Wait until the relevant Stripe payout is visibly available in Wise.
- Do not rely only on Stripe’s estimated payout date.
- Mark Wise availability in the operational sheet only after it is visible.

## E. Supplier order

### Dream Edition

- Match the order to the correct Prodigi provider SKU.
- Confirm the exact size and customer address.
- Place the order manually.
- Add the thank-you insert only when the selected route supports it.

### Collector Edition

- Match the order to the correct Creativehub/theprintspace product and provider SKU.
- Confirm variant, edition allocation, size, border, paper, Clean Certificate of Authenticity, letter insert, and unframed configuration.
- Place the order manually.
- Record the sold edition allocation.

## F. Tracking and reconciliation

- Add the provider order ID to Google Sheets.
- Add the actual supplier item, delivery, and tax costs.
- Add the tracking number and carrier.
- Update fulfilment status.
- Confirm the customer receives tracking information.
- Reconcile the final contribution and reserves after actual Stripe and supplier costs are known.

## G. First-order completion record

After the first real print order completes successfully, record the date and Stripe Session ID in the master decision log. This becomes the first production proof of the full chain:

Customer → Ali Capa website → Cloudflare Pages Function → Stripe → signed webhook → D1 atomic ledger → Google Sheets → Wise payout → manual supplier order → tracking → customer delivery.