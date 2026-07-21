# Daily Completion Log

## Work period

20 July 2026 evening through 21 July 2026 early morning, Europe/Lisbon.

## Outcome

The Ali Capa print storefront moved from an analytics-safe staging state to a hardened, live production state. Six completed print variants became purchasable. All six passed live destination quotation and Stripe pre-payment verification without submitting a payment.

## Completed sequence

1. Enabled Cloudflare Web Analytics for the Pages project.
2. Created and bound the custom Analytics Engine dataset for privacy-limited first-party storefront events.
3. Corrected the Cloudflare Pages project’s Wrangler-managed configuration.
4. Used GitHub Desktop to replace the incomplete staging branch upload with the full staging-preview package after browser uploads repeatedly failed.
5. Resolved the Cloudflare build failure caused by missing Functions dependencies by restoring the complete repository structure.
6. Resolved the deployment failure that required Analytics Engine by creating the dataset and matching binding.
7. Confirmed a successful Cloudflare deployment of the Colourful Dimensions staging build.
8. Reviewed desktop and mobile pages.
9. Corrected cropped Mèranö and Ràábta gallery presentation.
10. Corrected mobile horizontal overflow and the white strip on the Prints page.
11. Corrected mobile header overflow that cut off Join Us and shifted Colourful Dimensions.
12. Aligned Prints gallery dimensions and controls more closely with the Original Artworks gallery.
13. Added reliable mobile carousel swiping, including inside full-screen viewing.
14. Preserved visible gallery arrows and selectors while accepting desktop keyboard-arrow support as a later non-blocking improvement.
15. Removed the visible photograph credit overlay from the Join Us image.
16. Preserved the NiNE and Join Us routes while the storefront was rebuilt.
17. Created the Cloudflare D1 production order ledger named `ali-capa-order-ledger-production`.
18. Created the `order_events` table and status index.
19. Hardened checkout creation with same-origin checks, server-side product and price authority, server-side re-quotation, destination validation, and Stripe idempotency.
20. Hardened paid-order recording with Stripe signature verification and D1 atomic Session ID claims.
21. Made D1 the authoritative webhook-processing ledger and Google Sheets the operational mirror.
22. Added retry-safe processing leases and duplicate suppression.
23. Bound the production D1 database through Wrangler.
24. Temporarily configured Cloudflare custom preview-branch deployment so the isolated hardening branch could build and deploy.
25. Confirmed the isolated production-hardening preview deployed successfully.
26. Confirmed the preview catalogue returned correct products while checkout remained safely locked.
27. Merged the tested hardening work into the production branch.
28. Confirmed production deployed the hardening merge with a green Cloudflare status.
29. Confirmed the production catalogue returned `checkoutReady: false` while safe mode remained active.
30. Activated live mode by changing only the three environment switches in `wrangler.toml`.
31. Confirmed production activation commit `143f773` deployed successfully.
32. Confirmed `https://alicapa.com/api/catalog` returned global `checkoutReady: true`.
33. Confirmed AtaquaS and EclaircissE were individually checkout-ready.
34. Confirmed Öppiä and IndepenDienta remained unavailable.
35. Tested AtaquaS to Stripe for Portugal: €30 print, €12.26 delivery, €42.26 total.
36. Tested Mèranö Reverie to Stripe: €150 print, €19 delivery, €169 total.
37. Tested K.aisa.R Presence to Stripe: €250 print, €19 delivery, €269 total.
38. Tested K.aisa.R Immersion to Stripe: €350 print, €19 delivery, €369 total.
39. Tested EclaircissE to Stripe: €35 print, €11.20 delivery, €46.20 total.
40. Tested Ràábta Veil to Stripe: €200 print, €19 delivery, €219 total.
41. Confirmed product titles, variant labels, dimensions, paper, Giclée and unframed details, shipping, totals, destination lock, and Terms/Privacy acceptance displayed correctly.
42. Declared the six completed print variants customer-ready.
43. Created an immutable dated site-backup branch at the activation commit.
44. Created this dated master-documentation branch and package.

## Production state at wrap-up

Live print variants:

- AtaquaS, Dream Edition
- EclaircissE, Dream Edition
- K.aisa.R, Presence
- K.aisa.R, Immersion
- Mèranö, Reverie
- Ràábta, Veil

Protected unavailable products:

- Öppiä
- IndepenDienta
- all four Original Artworks, pending insured-carrier integration

## Important interpretation

The friend’s expected NiNE purchase exercises the existing Mixam book route. The first genuine Stripe print purchase will be the final proof of the new Cloudflare, Stripe, D1, Google Sheets, Wise, and manual-supplier workflow.