# Ali Capa Master Documentation v0.9

Freeze date: 21 July 2026

This archive records the business, website, products, fulfilment systems, security decisions, operational workflow, and known open items as they stand at the end of the 21 July 2026 working day.

## Why this is v0.9

The live website and print checkout are operational. The safe Original Works acquisition and private fulfilment system is built and tested on an isolated draft branch, but it remains disabled and undeployed while two external answers are pending:

1. Stripe account-compliance review.
2. DHL developer/API approval and official implementation details.

Version 1.0 should be created only after the complete Original Works flow has passed Preview, the external approvals are resolved, production activation is explicitly approved by Ali, and every intended public sales path is live.

## Authoritative website states

- Live production branch: `production-2026-07-21`.
- Exact live backup branch: `backup-live-2026-07-21`.
- Original Works working branch: `original-works-automation-2026-07-21`.
- Original Works review record: Draft Pull Request #2.
- Live domain: `alicapa.com`.

The live-production snapshot and the preproduction Original Works snapshot must never be confused. The preproduction snapshot is not a replacement upload for the live site.

## Archive sections

- `master-archive`: business control, product, fulfilment, security, status, and roadmap records.
- `layman`: safe plain-language handoff documents.
- `operational-diary`: dated business recaps and monthly indexes.
- Original Works technical documentation: detailed implementation and activation rules.

## Privacy rule

No archive intended for ordinary sharing contains passwords, API keys, webhook secrets, recovery codes, private keys, customer records, complete card details, private sender address or telephone, or private Cloudflare Access identifiers.

## How to use this archive

Start with this file, then read:

1. `01-CURRENT-STATUS-AND-FREEZE.md`
2. `02-BUSINESS-SYSTEM-MAP.md`
3. `03-PRODUCT-AND-AVAILABILITY-REGISTER.md`
4. `04-PAYMENTS-FULFILMENT-AND-SHIPPING.md`
5. `05-SECURITY-COMPLIANCE-AND-RECOVERY.md`
6. `06-OPEN-ITEMS-AND-ROADMAP.md`
7. `07-HANDOFF-AND-CONTINUITY.md`

For the fastest non-technical understanding, use the separate `layman` folder.