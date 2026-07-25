# Open Items and Roadmap

Freeze date: 21 July 2026

## External blockers

### Stripe

- Await the final account-compliance review decision.
- Do not restore one-time contributions or tips without written Stripe approval.
- Commercial print/book sales remain the intended Stripe use.

### DHL

- Await developer/API approval and account details.
- Confirm the exact API product, authentication method, rate endpoint, insurance/declaration behavior, shipment endpoint, label format, tracking behavior, destination coverage, and telephone requirements.
- Confirm whether a WhatsApp-only operational number is accepted or whether the carrier requires ordinary calls/SMS.

## Original Works activation work after approvals

1. Implement the real DHL insured-quote adapter from current official documentation.
2. Configure private sender values in encrypted Preview settings.
3. Configure an encrypted quote-signing secret.
4. Configure Cloudflare Access for the private fulfilment interface.
5. Configure and verify rate limits for quote, reserve-and-checkout, and release endpoints.
6. Add `checkout.session.expired` to the live Stripe webhook destination.
7. Apply the Original Works migrations in Preview.
8. Run the complete quote, changed-price, competing collector, cancellation, expiry, payment, duplicate-webhook, Sold-lock, packing, label-readiness, and shipment test matrix.
9. Perform manual desktop and mobile review.
10. Apply production migrations through a controlled procedure.
11. Enable inventory and acquisition only after Ali’s final explicit approval.
12. Create v1.0 website and documentation archives after successful activation.

## Catalogue and artistic production

- Rebuild and approve the final Öppiä artwork.
- Rebuild and approve the final IndepenDienta artwork.
- Upload both to Prodigi only after final master/proof approval.
- Complete the final Mèranö room mockup.
- Keep only two images per print listing: complete artwork and one realistic wall mockup.
- Preserve native aspect ratios unless Ali explicitly approves a crop.

## Samples and physical operations

- Use the Prodigi first-sample discount for initial print quality checks.
- Obtain the necessary flat double-wall art boxes, glass protection, rigid boards/foam, corner guards, tape, labels, and a reliable parcel scale.
- Pack one Original Artwork as a controlled physical trial.
- Replace the provisional 55 × 45 × 15 cm / 2.5 kg profile with measured packed values.

## Finance, tax and records

- Establish the dedicated Portuguese invoicing/receipt and tax-record workflow.
- Continue recording Stripe fees, provider costs, delivery charged, reserves, and final status.
- Maintain the rule that delivery paid by the customer is not treated as product profit.
- Keep refunds on the original payment route.

## Gmail and operational monitoring

- The recent business period is labelled and organized.
- New business mail still requires daily triage into Action Needed, Waiting External, context labels, or Reference Archive.
- A future controlled Gmail-filter pass may automate high-confidence provider labels, but no broad historical mass move should be performed without review.

## Outreach and publishing

- Prepare and submit Ràábta to NUDE Magazine Issue 61 SPECIAL before 1 September 2026.
- Required submission package: 8–16 cohesive JPGs, signed releases, series/model information, email or transfer link, archival contact sheet where useful, email record, statement, and credits.
- Continue tracking Model Society and other outreach correspondence in the dedicated Gmail labels.
- Instagram: at least two or three posts are prepared or near-ready; the recently completed Porto river/boat video is intended for a later post rather than a late-night publication on 21 July.

## Website/business refinements that are not blockers

- Verify the final Patreon presentation and external link during the next full-site content review.
- Perform periodic customer-service workflow drills for damage, wrong address, refund, chargeback, lost parcel, customs, and delayed tracking.
- Continue end-of-working-day Operational Diary entries only after meaningful business changes.
- Build the final full master ZIP only at approved freeze points.

## What is not missing today

The live print storefront, payment webhook, order ledger, Google Sheets mirror, legal cleanup, security baseline, Gmail operating structure, Original Works architecture, private packing foundation, Layman map, and Operational Diary are sufficiently complete to pause technical construction and return to artistic work.