# Known Gaps and Next Actions

This file distinguishes deliberate pending work from production failures.

## Immediate operational follow-up

### First genuine print payment

The six completed print variants have passed live pre-payment testing, but the first genuine print payment must still verify the full paid-order chain:

- successful Stripe payment;
- exactly one completed D1 order event;
- exactly one Google Sheets order row;
- correct awaiting-Wise status;
- manual supplier order only after Wise availability;
- tracking and final reconciliation.

### Gmail organization

Create a clear Gmail structure for Ali Capa Foto business mail. Suggested top-level labels and sublabels:

- Ali Capa Foto / Orders / Books
- Ali Capa Foto / Orders / Dream Editions
- Ali Capa Foto / Orders / Collector Editions
- Ali Capa Foto / Orders / Original Artworks
- Ali Capa Foto / Fulfilment / Mixam
- Ali Capa Foto / Fulfilment / Prodigi
- Ali Capa Foto / Fulfilment / Creativehub and theprintspace
- Ali Capa Foto / Fulfilment / DHL and Shipping
- Ali Capa Foto / Payments / Stripe
- Ali Capa Foto / Payments / Wise
- Ali Capa Foto / Submissions
- Ali Capa Foto / Press and Publications
- Ali Capa Foto / Website and Technical
- Ali Capa Foto / Accounting and Legal

Filters should be created carefully from confirmed sender domains and subject patterns rather than broad guesses. Important order and payment mail should remain visible and unread until reviewed.

## Product work

- Rebuild and finalize Öppiä.
- Rebuild and finalize IndepenDienta.
- Confirm final Prodigi products, provider SKUs, dimensions, costs, prices, and mockups before enabling either checkout.
- Do not enable a product merely by adding a price; the provider route and server-side quote must also be complete.

## Original Artworks

- Receive DHL Express business-account decision.
- Obtain and secure live API access if approved.
- Build carrier-neutral insured quote adapter.
- Implement private temporary reservation and atomic sold-state handling.
- Complete carrier failure, cancellation, expiry, and tracking states.
- Keep automated acquisition unavailable until those controls pass.

## NiNE premium route

- Inspect the current Saal Digital backend.
- Verify whether direct customer purchase or commission fulfilment is available.
- Verify current production and shipping costs.
- Calculate a viable public retail price and margin.
- Preserve the existing premium configuration without calling it a second edition.

## Desktop gallery

- Mobile gallery and full-screen swiping were accepted as picture-perfect at the launch checkpoint.
- Desktop full-screen keyboard-arrow navigation remained unresolved.
- This is a non-blocking usability improvement, not a checkout or mobile defect.

## Security and infrastructure

- Verify the intended Cloudflare rate-limiting rules in the live dashboard.
- Continue reviewing CSP and security headers after major third-party integration changes.
- Consider HSTS only after deliberate HTTPS verification.
- Monitor D1 rows with failed status and Stripe webhook retries.
- Keep test and production secrets separate.
- Maintain a safe-mode rollback procedure.
- Reconcile older repository documentation that contains superseded product facts. The dated master documentation and live catalogue are authoritative.

## Marketing and submissions

- NUDE Magazine Ràábta submission remains pending; deadline 1 September 2026.
- Continue the approved archival submission-package workflow.
- Update Patreon/community public language toward Colourful Dimensions where appropriate.
- Avoid blind text replacement of the word archive where it remains literally correct.

## Backup discipline

- Download the site-only backup ZIP.
- Download the documentation branch ZIP.
- Store both on the external E drive in a dated folder.
- Keep the activation commit SHA with the backups.
- Future authoritative deployments should receive a new dated backup rather than overwriting this checkpoint.