# Adding and updating prints

The site no longer requires hand-editing seven separate blocks of HTML. The public catalogue and checkout both read from one file:

`catalog/prints.js`

## Add a future print

1. Prepare two optimized web files:
   - `images/prints/<slug>.jpg` — artwork
   - `images/prints/<slug>-mockup.jpg` — framed room view
2. Add one work object to `PRINT_CATALOG` and one or more variant objects inside it.
3. Run:

```bash
npm test
npm run validate
```

## Availability values

- `available` — may be purchased when its fulfilment/shipping profile is configured.
- `upcoming` — visible with a disabled **Available soon** button.
- `proof-hold` — visible but withheld until physical print approval.
- `sold-out` — visible as sold out and blocked by the server.

## Fulfilment modes

- `prodigi-live` — requests a current Prodigi quote by provider SKU.
- `configured-fixed` — reads destination shipping from Cloudflare environment variables.
- `unavailable` — no checkout.

For a configured fixed variant whose prefix is `MERANO_REVERIE`, set:

- `MERANO_REVERIE_SHIPPING_EU_CENTS`
- `MERANO_REVERIE_SHIPPING_US_CENTS`

Values are customer-facing shipping-and-handling charges in euro cents. Leave them unset until verified. The server keeps checkout disabled rather than guessing.

## Limited-edition counts

`soldCount` is the current public catalogue count and must be updated after a confirmed sale. The server blocks checkout when `soldCount >= editionSize`. This is a manual catalogue safeguard, not an atomic reservation system; do not launch a high-traffic limited release without adding stronger inventory reservation.

## Security and ease of maintenance

This is a centralized code-based catalogue, not a public browser-based admin dashboard. That avoids exposing an upload endpoint or admin credentials on the static storefront. For a new work, use `NEW-PRINT-TEMPLATE.js.txt`, add the two web images, and run the two validation commands above.
