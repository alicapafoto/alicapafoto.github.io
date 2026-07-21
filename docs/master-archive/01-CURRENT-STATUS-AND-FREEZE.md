# Current Status and v0.9 Freeze

Date: 21 July 2026

## Live and operational

- `alicapa.com` is live through Cloudflare.
- The live website is deployed from `production-2026-07-21`.
- An exact live backup exists at `backup-live-2026-07-21`.
- The current print checkout is live and has passed a controlled delivery-quote and Stripe Checkout smoke test.
- Stripe payment, signed webhook handling, D1 order claiming, duplicate protection, and Google Sheets mirroring are established for the print storefront.
- Terms and Privacy no longer describe the removed one-time contribution feature.
- Patreon remains the external membership route on Join Us.
- Gmail has an operational business-label structure and a plain-language daily operating map.

## Built but deliberately not live

The Original Works system is contained in the isolated branch `original-works-automation-2026-07-21` and Draft Pull Request #2.

It includes:

- one-winner D1 inventory control;
- unavailable, available, reserved, and sold states;
- quote-first acquisition;
- signed short-lived delivery quotes;
- address and amount binding;
- server re-quoting before reservation;
- 30-minute Stripe Checkout holds;
- cancellation and expiration release paths;
- permanent paid Sold locking;
- duplicate protection;
- verified confirmation pages;
- private packing, measurement, label-readiness, and shipment controls;
- fail-closed mock and DHL placeholders;
- automated security and workflow tests.

It is not merged, deployed, migrated, or enabled in production.

## External answers pending

### Stripe

The previous one-time contribution Payment Link was deactivated, the website contribution option was removed, obsolete legal wording was removed, and the compliance response was submitted. The account is in review. No final written decision has been received.

### DHL

A business/developer-access request was submitted. No account number, developer approval, approved API product, credential format, or official live implementation details have been received.

## Current public availability

Available through the intended storefront once the connected backend is used:

- AtaquaS
- EclaircissE
- K.aisa.R Presence
- K.aisa.R Immersion
- Mèranö
- Ràábta

Still shown as Available soon with checkout disabled:

- Öppiä
- IndepenDienta

Original Artworks remain publicly disabled until all external and production gates pass.

## Freeze declaration

This v0.9 package is an authoritative archival checkpoint, not a production-activation instruction. No pending Original Works code should be deployed merely because it appears in the archive.