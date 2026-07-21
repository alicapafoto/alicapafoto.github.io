# Layman handoff folder plan

This document is the build plan for the separate plain-language folder in the Ali Capa master documentation archive.

The Layman folder is shareable only when Ali approves it. It explains the business in ordinary language and does not replace the restricted technical documentation.

## Folder purpose

A trusted person should be able to understand:

- what the website sells;
- what happens when a customer orders;
- where payment goes;
- how an order becomes a fulfilment task;
- how Ali knows what to pack or order;
- how delivery and tracking are handled;
- what must never be changed casually;
- when to stop and ask Ali rather than improvising.

## Proposed files

### 00 - Start Here

One-page explanation of Ali Capa Foto, Colourful Dimensions, the website, and the rule that Ali remains the only person with full business authority.

### 01 - The Website in Simple Terms

Explain:

- GitHub stores the approved website files;
- Cloudflare publishes and protects the live site;
- the public website does not store card details;
- public buttons appear only when the related backend is ready;
- production and working branches are separate.

### 02 - What a Customer Sees

Explain the customer journey for:

- NiNE books;
- open edition prints;
- collector edition prints;
- unique Original Artworks;
- Patreon through Join Us.

State clearly that the one-time Stripe contribution option is inactive and must not be restored without written Stripe approval.

### 03 - What Happens After a Print Order

Simple flow:

Customer chooses print → delivery is quoted → Stripe collects payment → secure webhook records the paid order → Google Sheet receives the operational row → Ali waits for payout availability → Ali manually orders from the correct printer → provider ships → Ali adds tracking and closes the order.

### 04 - What Happens After an Original Artwork Order

Simple flow:

Customer receives insured delivery quote → customer approves total → artwork is held for 30 minutes → Stripe collects payment → database permanently marks artwork Sold → one private packing task is created → Ali checks address → Ali packs the artwork → Ali measures and weighs final carton → Ali approves DHL label creation → Ali drops parcel off → tracking is recorded and sent.

### 05 - The Order Sheet in Simple Terms

Explain the important columns without exposing customer examples:

- paid status;
- Wise status;
- artwork or print;
- provider and SKU;
- customer total;
- shipping charged;
- fulfilment cost;
- destination;
- provider order ID;
- tracking;
- final status.

### 06 - Money in Simple Terms

Explain:

- Stripe receives the customer payment;
- Stripe fees are recorded;
- Wise receives payouts;
- customer-paid shipping is not business profit;
- Ali does not absorb shipping unless he explicitly approves it;
- supplier orders are placed manually after funds are available;
- refunds must be processed through the original payment route.

### 07 - Shipping in Simple Terms

Separate sections for:

- Prodigi open editions;
- Creativehub / theprintspace collector editions;
- book fulfilment;
- DHL insured Original Artworks.

Explain that Original Artwork parcel measurements are provisional until a real packed parcel is measured.

### 08 - What Is Automatic and What Ali Must Approve

Automatic:

- delivery quote calculation;
- Stripe payment confirmation;
- duplicate-payment protection;
- order ledger entry;
- Google Sheet mirror;
- Original Artwork reservation and Sold lock.

Ali approval required:

- placing manual supplier orders;
- approving final Original Artwork packing measurements;
- creating the DHL shipment and label;
- changing prices, editions, shipping rules, or availability;
- refunds outside routine approved cases;
- restoring any contribution or tip feature;
- production deployment of major changes.

### 09 - Safety Rules

Plain rules:

- never paste keys or passwords into public files;
- never email secrets;
- never put private sender or customer data in GitHub;
- never mark a unique artwork available without checking the database;
- never create a second shipment label because a page looked slow;
- never bypass Stripe, DHL, Cloudflare, or database safeguards;
- never merge a draft branch without Ali's explicit approval;
- stop if payment, inventory, address, or shipping totals disagree.

### 10 - If Something Goes Wrong

Decision tree for:

- payment succeeded but order row is missing;
- duplicate Stripe webhook;
- shipping quote changed;
- customer cancelled checkout;
- unique artwork shows unavailable;
- printer order failed;
- damaged shipment;
- tracking is delayed;
- Stripe or DHL asks for account review;
- Ali is temporarily unavailable.

### 11 - Who to Contact

Public business contacts and provider names only. Private sender address, telephone limitations, API credentials, recovery codes, customer details, and account identifiers remain in the restricted archive.

### 12 - Glossary

Plain definitions for:

- production;
- working branch;
- webhook;
- D1 ledger;
- Google Sheet mirror;
- SKU;
- fulfilment;
- reservation;
- Sold lock;
- insured value;
- declared value;
- Stripe payout;
- Wise;
- carrier label;
- tracking number.

## Exclusions from the Layman folder

Do not include:

- passwords;
- API keys;
- webhook secrets;
- service-account private keys;
- recovery codes;
- customer records;
- complete payment details;
- private sender address or telephone;
- private Cloudflare Access identifiers;
- live database IDs unless Ali explicitly approves them;
- instructions that allow someone to bypass Ali's approval.

## Restricted companion folder

The technical and emergency handoff documentation remains separate and restricted. It contains the precise implementation, environment-variable names, migrations, provider setup, troubleshooting, security recovery, and controlled deployment procedures.

The Layman folder may point to the restricted documentation by file name, but it must not reproduce restricted values.
