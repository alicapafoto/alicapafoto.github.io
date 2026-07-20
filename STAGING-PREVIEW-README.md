# Ali Capa Staging Preview

Date: 20 July 2026
Status: STAGING PREVIEW ONLY

This package is for visual review and correction before the next authoritative GitHub deployment.

Included in this staging candidate:
- Original Works renamed to Original Artworks across public navigation, headings, metadata, links and footer language.
- Original Artworks page opening replaced with the approved first-person copy.
- Original Artwork cards now use artwork/framed carousels with arrows, dots, swipe support and full-screen viewing.
- Manual email enquiries, View framed buttons and 48-hour hold language removed.
- Original Artwork acquisition temporarily shows "Acquisition opening soon" while insured carrier delivery is being prepared.
- Prints page renamed Colourful Dimensions with the approved opening.
- Dream Editions and Collector Editions hierarchy and descriptions updated.
- Print details simplified to factual card language.
- Public button changed to "Acquire this print".
- K.aisa.R remains one artwork card; Presence and Immersion are selected inside the acquisition panel.
- Print checkout language changed to quiet customer-facing wording.
- Join Us page rewritten with Join the Dimensions and Contribute to What Comes Next.
- Public Support the Archive and Living Archive branding removed.
- About-page narrative changed from third person to first person.
- Checkout success and cancellation copy updated.
- Privacy and Terms copy reconciled with the new terminology and future direct Original Artwork acquisition flow.

Not final:
- DHL Express account and live insured Original Artwork carrier connection are pending.
- NiNE premium Saal Digital purchasing, cost and pricing must be completed before the final website ZIP.
- EclaircissE and any legacy SKU/dimension reconciliation must be verified before the authoritative production package.
- Production security hardening remains required before declaring the backend production-complete, including concurrency-safe webhook handling, idempotency, rate-limit verification, timeouts and staging/live separation.
- This package has not been uploaded to GitHub or deployed by ChatGPT.

Review sequence:
1. Open or deploy this package as a preview.
2. Inspect desktop and mobile layouts.
3. Test both image states on prints and Original Artworks.
4. Open K.aisa.R acquisition and inspect Presence/Immersion selection.
5. Check the Join Us page and all navigation/footer labels.
6. Record visual corrections.
7. Approve the final candidate only after DHL/Saal and required technical checks are complete.


## Analytics and staging safety correction — 20 July 2026

- Cloudflare Web Analytics is enabled in the staging Pages project and will activate on the next deployment.
- `wrangler.toml` binds `ANALYTICS_ENGINE` to `ali_capa_storefront_staging_events`.
- Anonymous first-party events are accepted through `/api/track`; the endpoint allowlists event names and strips unknown or oversized fields.
- No names, emails, addresses, card details, IP addresses or persistent advertising identifiers are written to the custom event dataset.
- `STORE_ENV` is `staging` and `STAGING_SAFE_MODE` is `true`.
- The staging build does not bind the production `ORDER_EVENTS` KV namespace.
- Checkout APIs report unavailable while safe mode is active, webhooks are ignored, and direct Mixam / contribution payment links are disabled in this preview.
- To test Stripe later, install test-only secrets and a staging-only order binding, then deliberately set `STAGING_SAFE_MODE = "false"`. Never reuse live payment secrets in this project.
Deployment refresh after staging-safe configuration.
