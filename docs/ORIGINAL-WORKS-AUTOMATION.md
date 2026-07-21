# Original Works acquisition automation

Status: approved architecture, code held on a non-production branch.

## Locked commercial data

| Artwork | Sale price | Declared value | Provisional parcel | Provisional packed weight |
|---|---:|---:|---|---:|
| DusaEmas | €200 | €200 | 55 × 45 × 15 cm | 2.5 kg |
| Gold | €200 | €200 | 55 × 45 × 15 cm | 2.5 kg |
| Study | €200 | €200 | 55 × 45 × 15 cm | 2.5 kg |
| Untitled | €200 | €200 | 55 × 45 × 15 cm | 2.5 kg |

Reservation duration: 30 minutes.

## State machine

`unavailable → available → reserved → sold`

A stale `reserved` record returns to `available` after 30 minutes. A paid Stripe Checkout Session changes the artwork permanently to `sold`. The browser never decides inventory state.

## Safety gates

- Database seed status is `unavailable`.
- `/api/original-artworks/reserve` refuses reservations unless `ORIGINAL_WORKS_ACQUISITION_ENABLED=true`.
- The live Original Artworks page remains hard-disabled until the DHL and checkout phases are approved.
- Reservation tokens are random 256-bit values; only a SHA-256 hash is stored in D1.
- Inventory acquisition uses one conditional D1 update, so only one collector can acquire the reservation.
- DHL label purchase remains a private, post-packing confirmation step.

## Activation sequence

1. Apply D1 migration `0002_original_artworks.sql`.
2. Connect and test DHL quote credentials in Preview.
3. Add server-side insured quote creation and persist the quote to the reservation.
4. Add Stripe Checkout creation with a 30-minute expiry and reservation metadata.
5. Extend the signed Stripe webhook to call `markOriginalArtworkSold`.
6. Add the private shipment-confirmation endpoint and DHL label creation.
7. Verify address, packed dimensions, packed weight, declared value, and quote before label purchase.
8. Run concurrency, expiry, duplicate-webhook, and sold-lock tests.
9. Enable the page only after Ali approves the complete Preview flow.

## Required future secrets and variables

Names are provisional until the DHL developer account confirms the exact API product and credential format.

- `ORIGINAL_WORKS_ACQUISITION_ENABLED`
- `DHL_API_KEY`
- `DHL_API_SECRET` or OAuth client secret
- sender name, street address, city, postcode, country and telephone
- private admin confirmation secret or Cloudflare Access policy
