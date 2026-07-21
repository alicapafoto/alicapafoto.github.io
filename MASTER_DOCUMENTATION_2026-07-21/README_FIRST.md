# Ali Capa Foto Master Documentation

**Authoritative checkpoint:** 21 July 2026, after production activation of the completed print storefront.

This folder documents the live Ali Capa Foto website, the Colourful Dimensions storefront, its products, suppliers, payments, order recording, fulfilment, security controls, restoration procedure, and known pending work.

## Authority rule

For the production state described here, this folder and the live code at activation commit `143f7731ef0855d45db4db2217836e5f484eb51e` override older notes that conflict with it. Some older files elsewhere in the repository contain superseded prices, sizes, availability language, or deployment steps. Do not treat those older notes as current without reconciling them against this package and `catalog/prints.js`.

## Files in this package

1. `ALI_CAPA_MASTER_SYSTEM_DOCUMENTATION_2026-07-21.md`  
   Full business, product, technical, security, fulfilment, and operating documentation.
2. `DAILY_COMPLETION_LOG_2026-07-20_TO_2026-07-21.md`  
   Chronological record of the staging repair, visual corrections, D1 hardening, production activation, and six checkout verifications.
3. `PRODUCT_CATALOGUE_2026-07-21.csv`  
   Machine-readable product and supplier catalogue.
4. `DEPLOYMENT_AND_RECOVERY_MANIFEST_2026-07-21.md`  
   Exact repository, branch, commit, Cloudflare resources, restoration steps, and go-live verification.
5. `FIRST_REAL_ORDER_CHECKLIST.md`  
   Controlled checklist for the first genuine print order and every fulfilment handoff.
6. `KNOWN_GAPS_AND_NEXT_ACTIONS.md`  
   Deliberately unfinished work and non-blocking issues.

## Live production snapshot

- Public domain: `alicapa.com`
- GitHub repository: `alicapafoto/alicapafoto.github.io`
- Production branch: `cloudflare-storefront-staging`
- Activation commit: `143f7731ef0855d45db4db2217836e5f484eb51e`
- Cloudflare Pages project: `ali-capa-storefront-staging`
- Store mode: live
- Safe mode: off
- Analytics mode: production
- Six completed print variants: live
- Öppiä and IndepenDienta: visible but unavailable
- Original Artworks checkout: not live; insured-carrier integration remains pending
- NiNE standard book: external Mixam print-on-demand purchase route remains available

## Security notice

No live passwords, API keys, webhook secrets, private keys, customer records, card details, or private shipping-origin information are included in this documentation. Protected configuration names are recorded so the system can be restored, but their values remain encrypted in the service dashboards.

## Backup use

Keep a downloaded ZIP of this branch and the separate site-only backup branch on the external E drive. Do not upload the documentation branch as the production branch. The production branch remains `cloudflare-storefront-staging`.