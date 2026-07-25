# When Something Goes Wrong

## Payment email arrived but the order is missing

Do not fulfil yet. Check Stripe and the protected order ledger. Preserve the Stripe Session reference and timestamp. The Sheet or Gmail alone is not enough.

## The same payment or order appears twice

Do not create a second supplier order. The backend is designed to ignore duplicate webhook retries. Compare the Stripe Session ID and order record before acting.

## Customer cancelled Checkout

No order should be fulfilled. For a future Original Artwork order, the protected hold should be released only through the approved cancellation or Stripe expiration path.

## Delivery price changed

Do not reserve or charge using the old price. Let the customer review the updated complete total.

## A unique artwork says unavailable

It may be held by another collector, sold, deliberately disabled, or awaiting backend readiness. Do not manually force it available without checking the protected inventory record.

## Wise has not received the payout

Do not place the supplier order yet. Keep the email under Waiting External and check Stripe’s payout status.

## Printer order failed

Preserve the provider error and order details. Do not create repeated orders blindly. Confirm whether the first attempt exists before retrying.

## Tracking is delayed

Check the provider/carrier record, then update the customer honestly. Do not invent a delivery date.

## Shipment arrived damaged

Ask for photographs of the outer package, label, internal protection, full item, and damage. Keep all correspondence and contact the provider or carrier promptly.

## Stripe or DHL requests an account review

Move the thread to Action Needed plus the relevant Platform and Legal/Compliance labels. Follow the stated process honestly. Do not evade the review through another processor or duplicate account.

## The website looks wrong after a deployment

Stop further uploads. Compare the deployed site with the live production branch and exact live backup branch. Never use the preproduction Original Works folder as an emergency replacement.

## Ali is temporarily unavailable

A helper may preserve records, acknowledge ordinary customer messages, and stop unsafe actions. The helper must not change commercial terms, issue unusual refunds, deploy major changes, enable Original Artworks, or reveal restricted access information.