# Payments, Fulfilment and Shipping

## Stripe and Wise flow

1. The customer completes Stripe-hosted Checkout.
2. The signed Stripe webhook verifies the event and confirms that the Session is paid.
3. The D1 ledger claims the event atomically so retries cannot create duplicate operational orders.
4. The paid order is mirrored to the restricted Google Sheet.
5. Ali monitors the Stripe payout and waits until the money is visibly available in Wise.
6. Only then does Ali place a manual supplier order or begin the approved physical-shipment step.

Stripe receipts and Portuguese fiscal invoicing are separate matters. A dedicated Portuguese invoicing and tax workflow remains an open operational task.

## Google Sheet purpose

The restricted order sheet supports fulfilment, reconciliation, and accounting. Intended fields include:

- order date and internal order number;
- payment and Wise status;
- artwork or product;
- provider and SKU;
- size, paper, quantity, and edition information;
- print price and delivery charged;
- customer total and Stripe fee;
- fulfilment cost, reserve, and contribution to business funds;
- destination country and customer contact details;
- provider order ID;
- tracking;
- notes and final status.

The D1 ledger and Stripe remain the authoritative payment/transaction sources. The Sheet is an operational mirror.

## Open-edition print flow

Customer orders → Stripe verifies payment → order is recorded → wait for Wise → Ali places the matching Prodigi order → Prodigi produces and dispatches → provider order ID and tracking are recorded → customer is updated → order closes.

The optional A5 `Dear Friend` insert is not guaranteed on every fulfilment route and must not be advertised as universal.

## Collector-edition print flow

Customer orders → Stripe verifies payment → order is recorded → wait for Wise → Ali manually places the matching Creativehub/theprintspace order → the lab produces the unframed Hahnemühle Pearl print and certificate package → tracking is recorded → customer is updated → order closes.

Creativehub products remain managed manually. Do not connect automatic store fulfilment until Ali explicitly changes the financial-reserve rule.

## Original Artwork flow

Destination and address are entered → insured delivery quote is calculated → collector reviews complete total → server re-quotes → artwork is atomically reserved → Stripe Checkout opens for 30 minutes → verified payment permanently locks Sold → one private packing task is created → wait for Wise → Ali reviews the collector address → Ali protects the glass and frame, packs the artwork, measures the carton, and records actual weight → Ali confirms label readiness → private DHL shipment creation is approved → Ali takes the parcel to the approved carrier/drop-off point → tracking is stored and sent.

DHL shipment creation must not occur automatically at payment time.

## Shipping principles

- Customer pays the complete delivery charge.
- Carrier or provider quotes are server-side values; the browser does not invent delivery prices.
- Delivery is not business profit and should be tracked separately from product revenue.
- Import duties, customs charges, or destination taxes not collected at Checkout are generally the buyer’s responsibility where law permits.
- Refunds use the original payment route.

## Original Artwork packing baseline

Recommended protection:

- glass protection layer;
- rigid corner guards;
- rigid foam or honeycomb protection front and back;
- bubble wrap around the already rigidly protected artwork;
- double-wall flat corrugated box;
- controlled void fill;
- no reliance on bubble wrap and loose packing peanuts alone.

Provisional parcel profile: 55 × 45 × 15 cm and 2.5 kg. Replace it only after physical measurement of the first complete packed carton.

## Damage and delivery problems

For visible damage, request photographs of:

- outer packaging;
- carrier label;
- all damaged areas;
- complete item and protective packing.

Contact the provider or carrier promptly while preserving the customer’s mandatory legal rights. Never promise a refund, replacement, or claim outcome before checking the provider, carrier, payment record, and applicable policy.