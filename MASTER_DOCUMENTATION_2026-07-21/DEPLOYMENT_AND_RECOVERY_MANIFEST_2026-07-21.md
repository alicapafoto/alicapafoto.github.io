# Deployment and Recovery Manifest

Checkpoint: 21 July 2026

## Integrity anchor

- Repository: alicapafoto/alicapafoto.github.io
- Live production branch: cloudflare-storefront-staging
- Activation commit: 143f7731ef0855d45db4db2217836e5f484eb51e
- Site-only archive branch: backup-live-2026-07-21
- Documentation archive branch: master-documentation-2026-07-21

The site-only archive branch points to the exact activation commit. The documentation branch began from the same commit and adds only the dated documentation folder.

## Cloudflare production resources

- Pages project: ali-capa-storefront-staging
- Public domain: alicapa.com
- Build output: repository root
- Production branch: cloudflare-storefront-staging
- Automatic production deployments: enabled
- Store environment: live
- Safe mode: false
- Analytics mode: production
- Analytics binding: ANALYTICS_ENGINE
- Analytics dataset: ali_capa_storefront_staging_events
- D1 binding: ORDER_LEDGER
- D1 database: ali-capa-order-ledger-production
- D1 database ID: 829f9e58-5b03-4850-8a1f-f06f345696cf

## Protected configuration names

The restored system expects protected Cloudflare values for Stripe, Prodigi, Google Sheets, the Google service account, and the public site URL. This package records architecture but contains no secret values.

## What a code ZIP does not preserve

A GitHub code backup does not preserve Cloudflare DNS and dashboard settings, encrypted configuration values, D1 records, Stripe account data, Google Sheet contents, Wise payouts, supplier account settings, Gmail messages, or customer records. These remain inside their respective services.

## Safe restoration procedure

1. Keep the working production commit unchanged.
2. Extract the site backup into a new local folder.
3. Confirm the website files and folders are at the extracted root.
4. Run npm install, npm test, and npm run validate where a local Node environment is available.
5. Upload restoration work to a new GitHub branch first.
6. deploy that branch as a Cloudflare preview.
7. Reconnect the existing production bindings and protected values through the Cloudflare dashboard.
8. Verify the Stripe webhook and Google Sheet access.
9. Test static pages, API catalogue, delivery quotation, and a no-payment Stripe Checkout session.
10. Confirm unfinished products remain unavailable.
11. Promote the restored branch only after the preview passes.

## Emergency checkout lock

To stop checkout without taking the public website offline, enable staging safe mode and deploy. Confirm the catalogue reports checkoutReady false. Investigate the issue before returning the environment to live mode.

## Production reactivation

After resolving an issue, confirm D1, Google Sheets, Stripe, Prodigi, product availability, and protected settings. Return the store to live mode, deploy, verify checkoutReady true, and perform no-payment Dream and Collector Edition checkout checks.

## Launch verification record

On 21 July 2026:

- the Cloudflare production deployment for activation commit 143f773 was green;
- the production catalogue returned checkoutReady true;
- the six completed variants were individually ready;
- Öppiä and IndepenDienta remained unavailable;
- all six completed variants reached Stripe with correct metadata and matching totals;
- no test payment was submitted.

## External backup storage

Keep both downloaded ZIP files in a clearly dated website-backup folder on the external E drive. Preserve the activation commit SHA in the folder name or a nearby text note so the exact production state can be identified later.