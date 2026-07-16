# Ali Capa Foto — storefront operating procedure

## Customer flow

1. The visitor opens a work on `prints.html`.
2. For K.aisa.R, the visitor chooses Presence or Immersion.
3. The visitor selects the delivery country.
4. The server obtains or reads a server-trusted shipping charge.
5. Stripe Checkout shows print price, shipping and total before payment.
6. Stripe collects payment, email, phone and the complete shipping address.
7. The paid event is recorded in the private order ledger.

## Fulfilment rule

Never place a provider order before the matching Stripe payout is visibly available in Wise.

1. Open the private Orders Sheet.
2. Review rows with `Paid — Awaiting Wise`.
3. Confirm the payout is visibly available in Wise.
4. Change `Wise Available?` to `Yes`.
5. Place the matching manual order with Prodigi or Creativehub / theprintspace.
6. Use the customer address exactly as supplied at checkout.
7. Record provider order ID, actual cost, date, status and tracking.

The customer pays shipping. Ali Capa Foto does not absorb shipping unless Ali explicitly approves a promotion after recalculating the margin.

## Current catalogue

### Open editions

| Artwork | Internal SKU | Provider SKU | Size | Price | Status |
|---|---|---|---|---:|---|
| AtaquaS | `ATQ-LPP-30X45` | `GLOBAL-PAP-12X18` | 30 × 45 cm | €30 | Available |
| EclaircissE | `ECL-LPP-40X50` | `GLOBAL-PAP-16X20` | 40 × 50 cm | €35 | Available |
| Öppiä | pending | pending | final size pending | — | Available soon |
| IndepenDienta | pending | pending | final size pending | — | Available soon |

### Collector editions

| Artwork / variant | Internal SKU | Creativehub SKU | Size | Edition | Price | Status |
|---|---|---|---|---:|---:|---|
| K.aisa.R — Presence | `KSR-PRL-PRESENCE-60X90` | `V-XL076PZL` | 60 × 90 cm | 5 | €250 | Shipping setup required |
| K.aisa.R — Immersion | `KSR-PRL-IMMERSION-80X120` | `V-Y6L6H5YT` | 80 × 120 cm | 5 | €450 | Shipping setup required |
| Mèranö — Reverie | `MER-PRL-REVERIE-60X75` | `V-GDH2VKCH` | 60 × 75 cm | 10 | €225 | Shipping setup required |
| Ràábta — Veil | `RBT-PRL-VEIL-40X50` | `V-K5SCKYN3` | 40 × 50 cm | 10 | €175 | Physical-proof hold |

Collector products are unframed, printed on Hahnemühle Pearl 285 gsm, and include the configured COA and personal letter.

## Open-edition thank-you flyer

The A5 `Ali Capa Thank-You Letter` flyer is an optional fulfilment bonus. Prodigi charges €2.50 when the selected route supports it. Do not promise the flyer publicly because some fulfilment locations, including the verified Swedish EclaircissE route, cannot include it.

## Adding future prints

Follow `catalog/README.md`. The public page and checkout use `catalog/prints.js`; do not hand-copy product HTML.

## Limited-edition safeguard

The catalogue blocks a variant when its manually maintained `soldCount` reaches `editionSize`. This does not create an atomic reservation across simultaneous Stripe sessions. For a heavily promoted release, add stronger inventory reservation before launch.
