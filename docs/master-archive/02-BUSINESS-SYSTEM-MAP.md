# Business System Map

## Public brand and contact

- Public artist name: Ali Capa.
- Business presentation: Ali Capa Foto.
- Main website: `alicapa.com`.
- Business email: `alicapafoto@gmail.com`.
- Public work language should use `Colourful Dimensions`, `Living Colourful Dimensions`, `photographs`, and `artworks` rather than generic archive language where the context calls for the living body of work.

## Website and infrastructure

- GitHub stores approved website source files and branch history.
- Cloudflare publishes the live site, provides DNS and security controls, and runs the server-side storefront functions.
- Stripe hosts card Checkout and reports verified payment events to the signed webhook.
- Cloudflare D1 is the authoritative transactional ledger for backend state and duplicate protection.
- Google Sheets is an operational mirror for fulfilment, reconciliation, and accounting visibility; it is not the authoritative proof of payment or inventory state.
- Gmail is the communication and operational triage layer; it is not the source of truth for payment or inventory.

## Product and fulfilment providers

- Prodigi: open-edition photographic prints.
- Creativehub / theprintspace: collector-edition photographic prints.
- Mixam: NiNE book production and related book records.
- Stripe: customer card payment and payout initiation.
- Wise: EUR payout destination and the manual funds-available checkpoint before supplier orders are placed.
- DHL: planned insured Original Artwork delivery and later label creation after Ali confirms the packed parcel.
- Patreon: external monthly membership route through Join Us.

## Core commercial rule

The customer pays the full delivery charge. Ali Capa Foto does not absorb delivery unless Ali explicitly approves a later exception.

## Manual fulfilment rule

Print and book supplier orders remain manual:

1. Customer pays Ali through the approved checkout.
2. The verified payment is recorded.
3. Ali waits until the Stripe payout is visibly available in Wise.
4. Ali places the matching supplier order manually.
5. The provider ships directly to the customer where applicable.
6. Tracking and provider order references are recorded.

This rule exists because automatic supplier fulfilment could create an immediate expense before the payout is available.

## Unique Original Artwork rule

A unique artwork may have only one successful collector. The server controls reservation and Sold state. A paid artwork is permanently locked Sold before fulfilment continues. DHL shipment creation remains a separate private action after packing and measurement.

## Documentation layers

- Layman folder: plain-language overview safe for an approved helper.
- Operational Diary: dated record of what changed and where work stopped.
- Master archive: comprehensive business control record without live secrets.
- Restricted technical records: exact deployment, migration, recovery, and configuration procedures.
- Accounting/order systems: customer and transaction records with restricted access.