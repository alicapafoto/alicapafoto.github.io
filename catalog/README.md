# Adding and updating prints

The public catalogue and checkout both read from one file:

`catalog/prints.js`

## Add a future print

1. Prepare optimized web files:
   - `images/prints/<slug>.jpg` for the artwork fallback
   - optionally `images/prints/<slug>.webp` for a smaller modern artwork view
   - `images/prints/<slug>-mockup.jpg` for the framed room view
   - optionally `images/prints/<slug>-preview.jpg` for the lightweight card and Stripe preview
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

Collector shipping is stored by region in each variant object in `catalog/prints.js`:

- United Kingdom: €9
- Germany: €9
- Other EU countries: €19
- EFTA: €21
- United States: €31
- Canada: €44
- Australia and New Zealand: €82
- Other supported destinations: €82

The selector exposes the destination codes accepted by Stripe Checkout. Dream Editions are still accepted only when Prodigi returns a valid live route.

## Limited-edition counts

`soldCount` is the current public catalogue count and must be updated after a confirmed sale. The server blocks checkout when `soldCount >= editionSize`.

This is a manual catalogue safeguard, not an atomic reservation system. Before a heavily promoted limited release, add a stronger server-side reservation/inventory mechanism.

## Security and ease of maintenance

This is a centralized code-based catalogue, not a public browser-based admin dashboard. That avoids exposing an upload endpoint or admin credentials on the storefront.

For a new photograph, use `NEW-PRINT-TEMPLATE.js.txt`, add the web assets, update one catalogue object, and run the validation commands.
