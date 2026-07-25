# Handoff and Business Continuity

## Authority

Ali remains the only person with full authority to change prices, availability, editions, payment routes, providers, shipping rules, refunds outside routine approved cases, production deployment, or any contribution/tip feature.

A temporary helper may follow approved fulfilment instructions but must stop when records disagree or a decision is not documented.

## Sixty-second business handoff

- Live print sales operate through `alicapa.com`.
- Stripe verifies payment; D1 prevents duplicate processing; Google Sheets mirrors the paid order.
- Supplier fulfilment remains manual after the payout is visible in Wise.
- Original Works are not yet publicly available for acquisition.
- The complete Original Works system exists on a draft branch and is waiting for Stripe and DHL.
- Gmail `01 Action Needed` is the daily task list; `02 Waiting External` contains matters awaiting another party.
- The Operational Diary shows what changed and where work stopped.

## Daily opening check

1. Open Gmail `01 Action Needed`.
2. Check active `20 Orders and Fulfilment` threads.
3. Check `30 Finance and Records` for Stripe/Wise movement.
4. Check `02 Waiting External` for replies that now require action.
5. Read urgent `40 Legal and Compliance` and `60 Website and Infrastructure` alerts.
6. Confirm payments in Stripe/D1 before acting on an email.

## Daily closeout after meaningful business work

- Remove obsolete Action Needed or Waiting External labels.
- Record provider order IDs and tracking.
- Archive finished email threads under Reference Archive.
- Add a brief Operational Diary entry when a meaningful business decision or system change occurred.
- Update the open-items register when a blocker is resolved or a new risk is discovered.
- Do not generate a new master archive for trivial changes; use approved freeze points.

## Order continuity

### Paid print or book

Check Stripe and the operational record → wait for Wise → place the correct provider order → record provider ID → wait for tracking → update customer/record → close and archive.

### Paid Original Artwork after future activation

Verify Sold lock and fulfilment task → wait for Wise → review address → pack and measure → approve insured DHL label → drop off → record tracking → close and archive.

## Stop conditions

Stop and ask Ali when:

- Stripe payment and D1 disagree;
- Google Sheets contains a row without a corresponding verified payment;
- a unique artwork appears available after payment;
- two collectors appear connected to one artwork;
- delivery quote or address changed unexpectedly;
- a provider requests a different product/SKU;
- a refund, chargeback, damage claim, or customs issue falls outside the documented routine;
- a deployment branch or ZIP is not clearly identified;
- a platform asks for compliance, identity, tax, or account action;
- secrets or private data appear in a public/shareable location.

## Never improvise

- Never upload the preproduction Original Works folder as the live site.
- Never process a supplier order before funds are available unless Ali explicitly approves it.
- Never create a duplicate provider order or DHL label because a page was slow.
- Never mark payment complete from Gmail alone.
- Never publish secrets or private sender/customer data.
- Never merge a Draft Pull Request without Ali’s explicit production approval.

## Recovery locations

- Live production branch: `production-2026-07-21`.
- Exact live backup branch: `backup-live-2026-07-21`.
- Original Works draft branch: `original-works-automation-2026-07-21`.
- Master documentation v0.9: the dated archive generated from this branch.
- Rescued photograph archive: `E:\Ali Capa Master Archive Rescue`.
- Current print masters: `E:\Ali Capa Master Archive\Print Masters\`.

## Handoff privacy

The shareable continuity material explains responsibilities and safe stopping points. Exact credentials, private configuration values, customer records, sender details, recovery codes, and emergency account access remain in separately restricted records.