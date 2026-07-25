# The Website and Customer Journey

## What visitors see

The website presents:

- NiNE books;
- open-edition photographic prints;
- collector-edition photographic prints;
- unique Original Artworks;
- About and Join Us pages.

Patreon is the external monthly membership option. The previous one-time Stripe contribution option is inactive and must not return without written Stripe approval.

## What happens when a customer buys a print

1. The customer chooses a print.
2. The website calculates the approved delivery charge.
3. The customer reviews the full price.
4. Stripe securely accepts the card payment.
5. The backend verifies that payment really succeeded.
6. The order is recorded for Ali.
7. Ali waits until the payout reaches Wise.
8. Ali manually places the matching order with the correct printer.
9. The printer ships and provides tracking.
10. Ali records the tracking and closes the order.

## What will happen when a customer buys an Original Artwork

1. The customer enters the complete delivery address.
2. The website calculates insured delivery.
3. No artwork is reserved yet.
4. The customer reviews the artwork price, delivery, and total.
5. The server checks the quote again.
6. One collector receives a 30-minute protected hold.
7. Stripe securely accepts payment.
8. Verified payment permanently marks the unique artwork Sold.
9. Ali waits for the payout, packs the artwork, measures the finished carton, and approves the DHL shipment.
10. Ali takes the parcel to the carrier and sends tracking.

## Why some buttons say Available soon

A button stays disabled when the final artwork, provider setup, delivery, backend, or safety checks are not complete. This prevents a customer from paying for something that cannot yet be fulfilled correctly.

## What the website does not do

- It does not store complete card details.
- It does not let the browser decide whether payment succeeded.
- It does not let two people buy one unique artwork.
- It does not automatically spend Ali’s money on supplier orders before funds are available.
- It does not automatically create a DHL shipment at payment time.