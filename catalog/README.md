# Adding and updating prints

The public catalogue and checkout both read from one file:

`catalog/prints.js`

## Add a future print

1. Prepare optimized web files:
   - `images/prints/<slug>.jpg` — artwork
   - `images/prints/<slug>-mockup.jpg` — framed room view
   - optionally `images/prints/<slug>-preview.jpg` — lightweight card/Stripe preview
2. Copy `NEW-PRINT-TEMPLATE.js.txt` and add one work object to `PRINT_CATALOG`.
3. Add one or more variant objects inside the work.
4. Run:

```bash
npm test
npm run validate
```

## Availability values currently used

- `available` — may be purchased when the core backend and its fulfilment profile are configured.
- `upcoming` — visible with a disabled **Available soon** button.

Limited variants are also blocked when `soldCount >= editionSize`.

## Fulfilment modes

- `prodigi-live` — requests a current server-side Prodigi quote by provider SKU.
- `configured-fixed` — uses server-trusted customer shipping stored in the catalogue, with optional Cloudflare-variable fallback.
- `unavailable` — no checkout.

Collector shipping is currently stored in the variant objects in `catalog/prints.js`:

- EU: €15
- United States: €15
- Canada: €15
- Rest of world: €45, reserved for later expansion

The country selector currently exposes the EU, United States, and Canada only.

## Limited-edition counts

`soldCount` is the current public catalogue count and must be updated after a confirmed sale. The server blocks checkout when `soldCount >= editionSize`.

This is a manual catalogue safeguard, not an atomic reservation system. Before a heavily promoted limited release, add a stronger server-side reservation/inventory mechanism.

## Security and ease of maintenance

This is a centralized code-based catalogue, not a public browser-based admin dashboard. That avoids exposing an upload endpoint or admin credentials on the storefront.

For a new photograph, use `NEW-PRINT-TEMPLATE.js.txt`, add the web assets, update one catalogue object, and run the validation commands.
