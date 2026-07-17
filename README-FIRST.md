# Ali Capa Foto — final storefront handoff build

## Status

This is the current authoritative full-site package prepared on 17 July 2026 from the Cloudflare storefront codebase, the final seven-print image handoff, and Ali's approved desktop/mobile correction batches.

The package is **ready to upload to GitHub**, but live checkout still requires the production Cloudflare secrets, bindings, and Stripe webhook to be connected after deployment. No real API keys, passwords, Google credentials, or customer data are included.

## Public Prints catalogue

### Dream Editions

- AtaquaS — €30 — checkout-ready once the live backend is connected.
- EclaircissE — €35 — checkout-ready once the live backend is connected.
- Öppiä — visible as **Available soon**.
- IndepenDienta — visible as **Available soon**.

### Collector Editions

- K.aisa.R — Presence €250 / Immersion €450.
- Mèranö — Reverie €225.
- Ràábta — Veil €175.

All three Collector Editions are enabled in the catalogue. Their checkout uses fixed customer delivery charges of €15 for the EU, United States, and Canada. The €45 rest-of-world value is stored for future expansion, but rest-of-world countries are not yet exposed in the country selector.

## What is ready

- Final artwork and room-mockup web assets for all seven works, including the updated Mèranö mockup.
- Four-across Dream Editions desktop grid and three-across Collector Editions grid.
- Compact two-column mobile catalogue with tightened vertical spacing.
- Two views per work only: artwork and framed-room reference.
- A single shared catalogue file at `catalog/prints.js` controls page content, checkout metadata, prices, availability, provider SKUs, editions, borders, and shipping rules.
- Server-trusted Stripe Checkout creation.
- Live Prodigi quote integration for AtaquaS and EclaircissE once `PRODIGI_API_KEY` is connected.
- Stripe webhook verification, duplicate suppression through KV, and private Google Sheets order recording.
- Manual fulfilment only after the Stripe payout is visibly available in Wise.
- Original Works page copy and acquisition workflow updated.

## First files to read

1. `catalog/README.md`
2. `catalog/prints.js`
3. `docs/CLOUDFLARE-DEPLOYMENT.md`
4. `docs/STOREFRONT-OPERATIONS.md`
5. `docs/GOOGLE-SHEETS-SETUP.md`

## Local checks

```bash
npm test
npm run validate
```

For local Cloudflare Pages Functions testing, copy `.dev.vars.example` to a private `.dev.vars`, insert test credentials, and run:

```bash
npm run dev
```

Never commit `.dev.vars` or any real secret.

## Next activation sequence

1. Upload this complete build to the GitHub repository.
2. Confirm the Cloudflare Pages project deploys the intended branch.
3. Connect the live Cloudflare variables, encrypted secrets, and `ORDER_EVENTS` KV binding.
4. Create or update the live Stripe webhook endpoint.
5. Confirm the live Prodigi API quote flow.
6. Perform one controlled end-to-end payment and verify exactly one Google Sheets order row.
7. Archive the deployed ZIP and the final business-documentation package on the E drive.
