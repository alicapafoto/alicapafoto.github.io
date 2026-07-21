# Original Works acquisition automation

Status: approved quote-first architecture on a non-production branch. The live Original Works page remains disabled.

## Locked commercial data

| Artwork | Sale price | Declared value | Provisional parcel | Provisional packed weight |
|---|---:|---:|---|---:|
| DusaEmas | €200 | €200 | 55 × 45 × 15 cm | 2.5 kg |
| Gold | €200 | €200 | 55 × 45 × 15 cm | 2.5 kg |
| Study | €200 | €200 | 55 × 45 × 15 cm | 2.5 kg |
| Untitled | €200 | €200 | 55 × 45 × 15 cm | 2.5 kg |

Stripe Checkout reservation duration: 30 minutes.

The parcel dimensions and packed weight are conservative provisional values. They must be replaced with measured values after the first artwork is physically packed.

## Approved quote-first purchase flow

1. The collector chooses an available artwork.
2. The collector enters the complete delivery address.
3. The server calculates insured delivery. A quote does not reserve the artwork.
4. The collector reviews the artwork price, insured delivery, and complete total.
5. The collector selects **Reserve and continue**.
6. The server calculates the insured delivery quote again.
7. If the price changed, no reservation is created and the collector reviews the updated total.
8. If the quote is unchanged, one atomic D1 update reserves the artwork.
9. The server creates a card-only Stripe Checkout Session with a 30-minute expiration.
10. The reservation and Stripe Session are joined in D1 before the checkout URL is returned.
11. The collector sees a private countdown page and then continues to Stripe.
12. Successful payment permanently changes the artwork to `sold` through the signed Stripe webhook.
13. Explicit cancellation expires the Stripe Session first and only then releases the artwork.
14. An unpaid Stripe Session releases the artwork through the verified `checkout.session.expired` event.

## Inventory and reservation states

Artwork state:

`unavailable → available → reserved → sold`

Reservation state:

`active → checkout-created → completed`

Failure exits:

- `active → expired`
- `active → failed`
- `checkout-created → released`
- `checkout-created → expired`

Only an `active` pre-Checkout reservation may be released by generic time-based cleanup. A `checkout-created` hold remains protected even after its timestamp passes. It resolves only through:

- a verified paid Stripe webhook;
- a verified Stripe `checkout.session.expired` webhook; or
- an explicit token-authenticated cancellation that first expires the Stripe Session.

The browser never decides the authoritative inventory state.

## Safety controls already implemented

- All four database seed records begin as `unavailable`.
- `ORIGINAL_WORKS_ACQUISITION_ENABLED` defaults to false.
- Public availability requires all checkout, D1, shipping, and feature gates to agree.
- The obsolete standalone reserve endpoint returns HTTP 410.
- The shipping quote is calculated before any reservation exists.
- The shipping quote is recalculated server-side immediately before reservation.
- Checkout attempts have UUID idempotency keys.
- Inventory acquisition uses one conditional D1 update, so only one collector can win.
- Reservation tokens contain 256 random bits.
- Only SHA-256 token hashes are stored in D1.
- Reservation tokens never enter URLs, Stripe metadata, analytics, or Google Sheets.
- The complete delivery address is stored server-side with the reservation and is not placed in Stripe metadata.
- Stripe Checkout is card-only for Original Works.
- Stripe Checkout expires after 30 minutes.
- Stripe Session creation failure releases the D1 reservation.
- If attachment to D1 fails after Stripe creation, the Stripe Session is expired and the reservation is released.
- The paid webhook permanently locks the artwork before completing the operational order mirror.
- Duplicate webhook deliveries are idempotent.
- A sold artwork cannot be released by cancellation or expiration code.
- The confirmation page retrieves Stripe server-side and displays confirmation only for a paid Original Artwork Session.
- Reservation, confirmation, and cancellation pages use `no-store` and `noindex` headers.
- DHL label purchase remains a private post-packing confirmation step.

## Shipping adapter status

`ORIGINAL_WORKS_SHIPPING_MODE=mock` is available only for Preview and automated testing. Code explicitly refuses mock shipping when `STORE_ENV=live`.

`ORIGINAL_WORKS_SHIPPING_MODE=dhl-live` is currently fail-closed. Even the presence of credentials cannot make the storefront report DHL as ready until the approved DHL product and live adapter have been implemented and tested.

No DHL secret belongs in the repository.

## Database migrations

Apply in order to the production `ORDER_LEDGER` D1 database only during the controlled activation process:

1. `migrations/0002_original_artworks.sql`
2. `migrations/0003_original_artwork_checkout.sql`

Do not mark any artwork `available` until the complete Preview flow passes and production configuration has been independently verified.

## Preview configuration

Use Preview or local development only:

- `STORE_ENV=test` or another non-live value
- `ORIGINAL_WORKS_ACQUISITION_ENABLED=true`
- `ORIGINAL_WORKS_SHIPPING_MODE=mock`
- `ORIGINAL_WORKS_MOCK_SHIPPING_CENTS_JSON` with test-only regional prices
- Stripe test credentials
- a non-production D1 database or local D1

The mock adapter remains unavailable in live mode even if someone accidentally copies the mock variables into production.

## Production configuration still pending

Exact names may change after DHL confirms the approved API product and credential format.

- `ORIGINAL_WORKS_ACQUISITION_ENABLED=false` until final activation
- `ORIGINAL_WORKS_SHIPPING_MODE=disabled` until the DHL adapter is complete
- `DHL_API_KEY`
- `DHL_API_SECRET` or approved OAuth client secret
- `DHL_ACCOUNT_NUMBER`
- sender name
- full sender street address
- `DHL_ORIGIN_CITY`
- `DHL_ORIGIN_POSTAL_CODE`
- `DHL_ORIGIN_COUNTRY`
- sender telephone number
- private shipment-confirmation protection, preferably Cloudflare Access

## Stripe webhook requirements before activation

The live webhook destination must subscribe to all three events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`

The first two are already subscribed. `checkout.session.expired` must be added before Original Works acquisition can open.

## Remaining implementation work

- Receive and verify DHL developer approval and credential format.
- Implement the real insured DHL quote adapter against official documentation.
- Test DHL quote normalization, error handling, destination restrictions, currency, insurance, and timeouts in Preview.
- Build the private post-packing shipment-confirmation endpoint.
- Recheck parcel dimensions, weight, declared value, collector address, and quote before DHL label creation.
- Store the DHL shipment ID, tracking number, and label reference in the private order record.
- Replace provisional parcel data after the first physical packing measurement.
- Add `checkout.session.expired` to the live Stripe webhook destination.
- Apply migrations through a controlled production procedure.
- Run one complete Stripe test-mode Preview acquisition, cancellation, expiration, payment, duplicate-webhook, and sold-lock test.
- Review mobile and desktop UI manually.
- Keep production feature gate false until Ali gives final activation approval.

## Automated test coverage

`npm test` covers:

- disabled-by-default behavior;
- one-winner atomic reservations;
- token hashing and wrong-token rejection;
- quote-only behavior with no reservation;
- mock shipping prohibited in live mode;
- DHL live placeholder prohibited from reporting ready;
- server-side re-quote and changed-total handling;
- checkout-attempt idempotency;
- competing collector rejection;
- Stripe creation failure cleanup;
- Stripe-first explicit cancellation;
- protected checkout-created holds;
- verified expiration release;
- permanent and duplicate-safe sold lock;
- prevention of post-sale release;
- stored delivery-address order context;
- confirmation-page paid-session verification;
- no-store and noindex result-page headers;
- required collector UI paths and quote-first wording.

## Final activation rule

Do not merge, deploy, apply production migrations, set artwork rows to `available`, or enable `ORIGINAL_WORKS_ACQUISITION_ENABLED` until:

1. DHL approval and live quote behavior are known;
2. Stripe account review is resolved without sales restrictions;
3. the third Stripe webhook event is subscribed;
4. Preview passes the complete test matrix;
5. Ali reviews the collector experience; and
6. Ali explicitly approves production activation.
