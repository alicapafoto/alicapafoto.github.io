# Original Works private fulfilment control

Status: built and tested on the non-production Original Works branch. Do not merge, deploy, migrate, or activate yet.

## Purpose

This layer begins only after Stripe confirms a paid Original Artwork order and the D1 sold lock succeeds. It creates one private packing and shipment task for the unique artwork.

The private task is authoritative for physical fulfilment. The Google Sheet remains an operational and accounting mirror.

## Atomic paid handoff

D1 migration `0004_original_artwork_fulfilment.sql` installs a database trigger.

When an `original_artworks` row changes from a non-sold state to `sold`, the trigger creates exactly one fulfilment record using:

- artwork ID and title reference;
- reservation ID;
- Stripe Checkout Session ID;
- Payment Intent ID;
- €200 sale price;
- €200 declared value;
- insured delivery charged to the collector;
- stored collector delivery address;
- provisional parcel dimensions and weight.

The Checkout Session ID and reservation ID are unique in the fulfilment table. Duplicate Stripe webhooks cannot create a second packing task.

## Fulfilment states

`paid-awaiting-packing → packed-measured → ready-for-label → label-created → dropped-off → in-transit → delivered`

Exception exits:

- `shipment-exception`
- `cancelled`

The current code implements the first three states. DHL label creation is deliberately fail-closed.

## Packing rules

The private operator must:

1. compare the full collector address with the paid order;
2. fully protect and seal the artwork in its final carton;
3. measure the actual outer length, width, and height;
4. weigh the complete packed parcel;
5. record packing notes;
6. explicitly confirm the address review;
7. mark the task ready for label only after all checks pass.

Measurements are restricted to positive values with conservative upper bounds. A record cannot move to `ready-for-label` without all four measurements, address review, and private sender configuration.

## Private sender configuration

Sender information must never be committed to GitHub, embedded in frontend files, exposed through a public endpoint, or included in the shareable Layman folder.

Configure only as encrypted Cloudflare variables:

- `ORIGINAL_WORKS_SENDER_NAME`
- `ORIGINAL_WORKS_SENDER_ADDRESS_LINE1`
- `ORIGINAL_WORKS_SENDER_ADDRESS_LINE2`
- `ORIGINAL_WORKS_SENDER_CITY`
- `ORIGINAL_WORKS_SENDER_POSTAL_CODE`
- `ORIGINAL_WORKS_SENDER_COUNTRY`
- `ORIGINAL_WORKS_SENDER_PHONE_E164`

Any private contact limitations or operational notes belong only in the restricted master archive.

## Private Access security

The control page and APIs are designed to sit behind a Cloudflare Access application. The application also validates the Access JWT itself.

Required variables:

- `CF_ACCESS_TEAM_DOMAIN`
- `CF_ACCESS_AUD`
- `ORIGINAL_WORKS_ADMIN_EMAIL`

The validator checks:

- RS256 algorithm;
- signing key ID;
- signature against the current Cloudflare Access JWKS;
- issuer;
- application audience;
- expiration and activation times;
- exact allowed administrator email.

Checking an identity header without validating the JWT is not accepted.

## Private page

`admin-original-works.html` is:

- absent from all public navigation;
- blocked in `robots.txt`;
- marked `noindex`, `nofollow`, and `noarchive`;
- delivered with `Cache-Control: no-store`;
- free of analytics;
- free of browser storage;
- free of sender address and telephone values.

It shows paid fulfilment tasks, collector delivery details, provisional parcel data, packing controls, audit events, and the final DHL gate.

## DHL shipment gate

`/api/admin/original-artworks/create-shipment` currently validates:

- private Access identity;
- same-origin request;
- existing fulfilment record;
- `ready-for-label` status;
- actual measurements;
- complete private sender configuration.

It then returns HTTP 409 without changing state. This is intentional.

The endpoint must remain fail-closed until the approved DHL adapter performs all of the following:

1. re-quote using the actual packed dimensions and weight;
2. compare the final carrier charge with the amount paid by the collector;
3. review destination and sender data;
4. create the insured shipment;
5. store carrier shipment ID and service;
6. store a safe label reference rather than exposing label data publicly;
7. store tracking number and tracking URL;
8. write an immutable audit event;
9. send or prepare the collector tracking notification;
10. support safe retry without purchasing a duplicate label.

## Production activation requirements

- Stripe account review resolved without sales restrictions.
- DHL developer approval and official API product confirmed.
- Cloudflare Access application created for the private page and API path.
- Access JWT validation variables configured.
- Sender variables configured as encrypted values.
- D1 migrations `0002`, `0003`, and `0004` applied in order.
- Real DHL quote and shipment adapters implemented.
- `checkout.session.expired` subscribed in the live Stripe webhook.
- Rate limits configured for public artwork quote, reserve, release, and private shipment endpoints.
- Preview payment, cancellation, expiry, duplicate webhook, sold lock, paid handoff, packing, readiness, and shipment retry tests passed.
- Manual desktop and mobile private-page review completed.
- Ali gives explicit final activation approval.
