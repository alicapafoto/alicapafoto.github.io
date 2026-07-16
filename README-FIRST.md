# Ali Capa Foto — Cloudflare storefront master build

## Status

This is the current authoritative full-site package prepared from the July 2026 Cloudflare storefront staging codebase and the final seven-print image handoff.

The public Prints page is complete as a two-tier catalogue:

- **Open editions:** AtaquaS, EclaircissE, Öppiä, IndepenDienta.
- **Collector editions:** K.aisa.R, Mèranö, Ràábta.

The site contains no real API keys, passwords, Google credentials or customer data.

## What is ready

- Final artwork and room-mockup web assets for all seven works.
- Four-across open-edition desktop grid and three-across collector grid.
- Compact two-column mobile catalogue.
- Two views per work only: artwork and framed-room reference.
- A single shared catalogue file at `catalog/prints.js` controls page content and checkout metadata.
- AtaquaS at €30 and EclaircissE at €35 with live Prodigi shipping quotes.
- Öppiä and IndepenDienta visible with disabled **Available soon** controls.
- K.aisa.R, Mèranö and Ràábta shown with final sizes, prices, edition counts, borders, papers, certificates and Creativehub SKUs.
- Ràábta remains on physical-proof hold.
- Collector checkout code is prepared but remains safely disabled until verified destination shipping values are added in Cloudflare.
- Stripe Checkout, webhook verification, duplicate suppression and private Google Sheets order recording are preserved.
- Manual fulfilment remains mandatory after the Stripe payout is visibly available in Wise.

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

For local Cloudflare Pages Functions testing, create a private `.dev.vars` file with test credentials only and run:

```bash
npm run dev
```

Never commit `.dev.vars` or any real secret.

## Activation sequence

1. Deploy this complete folder to the Cloudflare staging project.
2. Confirm the existing secrets, Google Sheet and `ORDER_EVENTS` KV binding remain attached.
3. Test AtaquaS and EclaircissE quotes in Stripe test mode.
4. Verify collector shipping costs manually for each size and destination region.
5. Add the corresponding collector shipping environment variables listed in `catalog/README.md`.
6. Keep Ràábta disabled until its physical 40 × 50 cm proof is approved.
7. Complete one final test purchase and confirm exactly one order-ledger row.
8. Switch to live operation only after the test passes.
