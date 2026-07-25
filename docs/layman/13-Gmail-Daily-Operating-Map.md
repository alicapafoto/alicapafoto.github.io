# Gmail Daily Operating Map

This guide explains how the Ali Capa Foto business Gmail labels work in ordinary language. It is safe for an approved handoff because it contains no passwords, API keys, customer records, private sender details, recovery codes, or private account identifiers.

## The most important idea

Gmail uses labels rather than traditional folders. One email can appear under several labels at the same time.

For example, one paid print-order email may correctly appear under:

- `20 Orders and Fulfilment` because it concerns an order;
- `30 Finance and Records` because money was collected;
- `10 Platforms/Stripe` because Stripe sent it;
- `01 Action Needed` because Ali must verify or fulfil it.

This is not duplication. It is the same email being shown from several useful viewpoints.

## The morning priority order

Open the business labels in this order:

### 1. `01 Action Needed`

This is the first and most important folder every morning.

Anything here requires Ali to do something, such as:

- verify that a paid order was recorded correctly;
- place a manual printer order after funds are available;
- pack or measure an Original Artwork;
- add tracking;
- answer a customer or provider;
- respond to Stripe, DHL, a publication, or another service;
- review an urgent website or account warning.

When the action is finished, remove the `01 Action Needed` label.

### 2. `20 Orders and Fulfilment`

Check this next for active customer orders and provider fulfilment messages.

This label covers:

- print purchases;
- book orders;
- Original Artwork purchases;
- provider production notices;
- packing and shipping correspondence;
- tracking and delivery messages.

An order may remain here throughout its full life, from payment through fulfilment and delivery.

### 3. `30 Finance and Records`

Check this for money and accounting events:

- Stripe payment and payout notices;
- Wise payout arrival;
- provider invoices and receipts;
- fees;
- refunds;
- records needed for accounting or tax work.

Shipping money collected from a customer is not automatically business profit. Provider costs, carrier costs, fees, refunds, and accounting records must remain traceable.

### 4. `02 Waiting External`

This means Ali has completed his current action and another person or organisation owes the next response.

Examples:

- waiting for Stripe review;
- waiting for DHL developer approval;
- waiting for a Stripe payout to reach Wise;
- waiting for Prodigi, Creativehub, Mixam, or DHL to fulfil or ship;
- waiting for a magazine, editor, jury, or model platform to reply.

Normally, a thread should use either `01 Action Needed` or `02 Waiting External`, not both. When a reply arrives and Ali must act, remove `02 Waiting External` and add `01 Action Needed`.

### 5. `40 Legal and Compliance`

Review unread messages here carefully. This includes:

- Stripe or payment-account reviews;
- identity or business verification;
- policy notices;
- legal documents;
- tax or regulatory matters;
- privacy and compliance correspondence.

A legal or compliance email that requires a reply must also receive `01 Action Needed`. A submitted review awaiting a platform decision receives `02 Waiting External`.

### 6. `60 Website and Infrastructure`

Check this when there are unread warnings, failed deployments, security notices, domain messages, or service interruptions.

It covers GitHub, Cloudflare, website deployment, domain, security, and backend infrastructure. Routine GitHub notifications do not all require action. Only add `01 Action Needed` when a real decision, failure, or repair is required.

### 7. `50 Creative and Outreach`

This contains magazine submissions, awards, open calls, editors, galleries, artist platforms, and other professional outreach.

Use:

- `01 Action Needed` when a submission, reply, release, deadline, or follow-up is required;
- `02 Waiting External` after the submission or reply has been sent;
- the publication or platform sublabel to keep each relationship together.

### 8. `07 Operational Diary`

This contains quick business-recap messages or drafts. It is not a customer-order queue and does not replace the full master documentation.

Use it to remember:

- what changed;
- what remains open;
- what external answer is pending;
- where the next work session should resume.

### 9. `99 Reference Archive`

This is for completed confirmations and records that no longer require action.

Examples:

- completed account setup confirmations;
- resolved provider correspondence;
- final receipts;
- completed order records;
- old decisions kept for reference.

When a matter is finished:

1. remove `01 Action Needed` and `02 Waiting External`;
2. keep the useful context label, such as Stripe, DHL, Orders, or Finance;
3. add `99 Reference Archive`;
4. archive it from the main Inbox when it no longer needs daily visibility.

## Context labels

The context labels answer “What area of the business does this belong to?”

### `10 Platforms`

- `Stripe`: checkout, payments, payouts, reviews, disputes, refunds, and account notices.
- `DHL`: developer approval, account access, quotes, labels, shipments, and tracking.
- `Cloudflare`: hosting, security, analytics, domain, and deployment notices.
- `GitHub`: repository, branch, pull request, security, and workflow notices.
- `Prodigi`: open-edition print fulfilment.
- `Creativehub`: collector-edition print fulfilment through theprintspace.
- `Mixam`: book production and order correspondence.
- `Wise`: payout arrival and business-money records.
- `Patreon`: Ali Capa creator-account, membership, identity, and security records. Posts from unrelated creators should not enter the business archive.

### `20 Orders and Fulfilment`

The operational home for customer orders, provider production, packing, shipping, tracking, and delivery.

### `30 Finance and Records`

The operational home for payments, payouts, provider costs, invoices, receipts, fees, refunds, accounting, and tax records.

### `40 Legal and Compliance`

The operational home for reviews, verification, terms, policy, tax, legal, and regulatory correspondence.

### `50 Creative and Outreach`

The operational home for submissions, awards, open calls, publications, editors, galleries, and artist platforms.

### `60 Website and Infrastructure`

The operational home for website hosting, deployment, code, domain, security, backend, and service notices.

## Print-order email workflow

### Stage 1: Stripe reports a paid order

Apply or keep:

- `20 Orders and Fulfilment`;
- `30 Finance and Records`;
- `10 Platforms/Stripe`;
- `01 Action Needed` until the paid order is verified in the operational records.

Ali checks that the payment is genuine and the order was recorded correctly. The email itself is not the authoritative inventory or accounting system; it is the notification and correspondence layer.

### Stage 2: Order is verified and funds are moving to Wise

Remove:

- `01 Action Needed`.

Add:

- `02 Waiting External`.

The order remains under Orders, Finance, and Stripe while Ali waits for the payout to become visibly available in Wise.

### Stage 3: Wise confirms funds are available

Remove:

- `02 Waiting External`.

Add:

- `01 Action Needed`;
- `10 Platforms/Wise` when the Wise message exists.

Ali now places the matching manual order with Prodigi, Creativehub / theprintspace, Mixam, or the correct provider.

### Stage 4: Provider order has been placed

Keep:

- `20 Orders and Fulfilment`;
- the relevant provider label.

Remove:

- `01 Action Needed`.

Add:

- `02 Waiting External` while the provider produces or ships the order.

### Stage 5: Tracking or a provider problem arrives

When tracking arrives, or when the provider asks a question:

- remove `02 Waiting External`;
- add `01 Action Needed`;
- record the provider order ID and tracking in the operational order record;
- send or confirm tracking to the customer where required.

### Stage 6: Order is complete

Remove:

- `01 Action Needed`;
- `02 Waiting External`.

Keep:

- `20 Orders and Fulfilment`;
- the provider label;
- `30 Finance and Records` where financially relevant.

Add:

- `99 Reference Archive`.

Archive the completed thread from the main Inbox.

## Original Artwork email workflow

### Stage 1: Stripe reports verified payment

Apply or keep:

- `20 Orders and Fulfilment`;
- `30 Finance and Records`;
- `10 Platforms/Stripe`;
- `01 Action Needed`.

Ali verifies the permanent Sold state, the operational order record, and the private fulfilment task before packing anything.

### Stage 2: Waiting for payout availability

After verification:

- remove `01 Action Needed`;
- add `02 Waiting External` while the payout is moving to Wise.

### Stage 3: Funds are available and packing begins

When Wise confirms the funds:

- remove `02 Waiting External`;
- add `01 Action Needed`.

Ali then:

- checks the collector address;
- packs the artwork safely;
- records the real packed length, width, height, and weight;
- confirms the declared and insured value;
- approves shipment creation only after the parcel is physically ready.

### Stage 4: DHL shipment is created

Keep:

- `20 Orders and Fulfilment`;
- `10 Platforms/DHL`.

Remove:

- `01 Action Needed` after the label, order record, and drop-off preparation are complete.

Add:

- `02 Waiting External` while DHL carries the parcel.

### Stage 5: Tracking and delivery are complete

After tracking is recorded, sent, and delivery is complete:

- remove `01 Action Needed` and `02 Waiting External`;
- keep Orders, DHL, Finance, and Stripe context where relevant;
- add `99 Reference Archive`;
- archive the thread from the main Inbox.

## Stripe and DHL approval workflow

The current Stripe review belongs under:

- `10 Platforms/Stripe`;
- `40 Legal and Compliance`;
- `02 Waiting External`.

The current DHL application belongs under:

- `10 Platforms/DHL`;
- `02 Waiting External`.

When either company replies:

- add `01 Action Needed` if Ali must answer, upload information, change a setting, or approve a step;
- remove `02 Waiting External` until Ali’s action is completed;
- after Ali responds, return it to `02 Waiting External`;
- once fully resolved, remove both state labels and add `99 Reference Archive`.

## The main Inbox versus the business labels

The main Inbox is simply where new mail arrives. It is not the authoritative business task list.

The authoritative daily task list is:

1. `01 Action Needed`;
2. active orders under `20 Orders and Fulfilment`;
3. finance under `30 Finance and Records`;
4. unread replies under `02 Waiting External`;
5. urgent compliance or infrastructure warnings.

The recent business backfill added labels but did not delete messages or mass-archive the Inbox. This was intentional.

## New incoming email

The current system is an organizational framework, not a complete automatic Gmail-rules engine. Recent business mail has been classified, but a new message may still arrive only in the main Inbox.

For every new business email:

1. add one or more context labels;
2. decide whether it is `01 Action Needed`, `02 Waiting External`, or already complete;
3. when complete, add `99 Reference Archive` and archive it from the Inbox.

When uncertain, leave the email in the Inbox and ask Ali rather than guessing.

## Labels to ignore

An older experimental set of empty labels remains visible, including names such as:

- `00 Action Needed`;
- `01 Orders & Payments`;
- `02 Fulfilment & Shipping`;
- `03 Website & Infrastructure`;
- `04 Legal & Compliance`;
- `05 Creative & Outreach`;
- `06 Finance & Tax`.

These labels contain no messages and are not authoritative. Use only the newer structure beginning with:

- `01 Action Needed`;
- `02 Waiting External`;
- `07 Operational Diary`;
- `10 Platforms`;
- `20 Orders and Fulfilment`;
- `30 Finance and Records`;
- `40 Legal and Compliance`;
- `50 Creative and Outreach`;
- `60 Website and Infrastructure`;
- `99 Reference Archive`.

## Safety rules

- Gmail is a notification and correspondence layer, not the sole source of truth for payment, inventory, or fulfilment.
- Never fulfil an order only because an email looks convincing. Confirm payment and the operational order record.
- Never email passwords, API keys, private keys, recovery codes, or payment secrets.
- Never place customer data or private sender details into shareable documentation.
- Never create a duplicate provider order or DHL label because a page or email response seemed slow.
- Never mark a unique artwork available or sold from Gmail alone.
- Stop and verify whenever payment, Wise status, order records, inventory, address, shipping price, or tracking disagree.
