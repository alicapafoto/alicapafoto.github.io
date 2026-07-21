# Ali Capa Foto Master System Documentation

**Checkpoint date:** 21 July 2026  
**Status:** Production print storefront activated and pre-payment routes verified  
**Public identity:** Ali Capa Foto  
**Brand world:** Colourful Dimensions  
**Longstanding phrase:** Living Colourful Dimensions

---

## 1. Executive status

Ali Capa Foto now operates a live public website at `alicapa.com` with:

- the NiNE book purchase route;
- a live international print storefront for six completed print variants;
- a public Original Artworks section whose automated acquisition checkout remains withheld until insured-carrier integration is ready;
- Join Us, About, Privacy, Terms, checkout success, and checkout cancellation pages;
- Cloudflare Web Analytics plus privacy-conscious first-party storefront event analytics;
- Stripe-hosted secure payment collection;
- a Cloudflare D1 atomic order ledger;
- a Google Sheets operational order mirror;
- manual fulfilment only after the Stripe payout is visibly available in Wise.

The production activation was completed with commit:

`143f7731ef0855d45db4db2217836e5f484eb51e` — **Activate six completed print checkouts**

The production catalogue returned `checkoutReady: true`, and all six completed variants were tested through live delivery quotation and Stripe Checkout creation without submitting a payment.

---

## 2. Brand and public structure

### Primary identity

- **Artist:** Ali Capa
- **Business/storefront name:** Ali Capa Foto
- **Website:** alicapa.com

### Brand-world hierarchy

- **Colourful Dimensions** is the world or universe containing the photographs, books, poetry, Original Artworks, prints, and community.
- **Living Colourful Dimensions** is the enduring phrase and manifesto-like expression.
- **Dream Editions** and **Collector Editions** remain print categories inside Colourful Dimensions.
- The word **archive** may still be used internally or literally for preservation/history, but it is no longer the main public-facing identity.

### Main public navigation

- NiNE
- Prints
- Original Artworks
- About
- Join Us

### Gallery interaction

Each print and Original Artwork uses two visual states:

1. the artwork itself;
2. a real framed-room presentation.

Mobile supports direct finger swiping and full-screen swiping. Desktop retains visible navigation controls and clickable selectors. Keyboard-arrow navigation in the desktop full-screen print viewer remained an accepted non-blocking issue at this checkpoint.

---

## 3. Product catalogue and authoritative public offers

The authoritative code source is `catalog/prints.js`. It controls public presentation, checkout metadata, availability, pricing, provider identifiers, edition sizes, paper, borders, and fulfilment mode.

### 3.1 Dream Editions, Prodigi

Dream Editions are open photographic editions printed on Lustre Photo Paper. Customer delivery is quoted live by Prodigi for the selected destination. If Prodigi cannot return a valid quote, checkout must remain unavailable for that route.

#### AtaquaS

- Product ID: `ataquas-open`
- Store SKU: `ATQ-LPP-30X45`
- Provider: Prodigi
- Provider SKU: `GLOBAL-PAP-12X18`
- Size: 30 × 45 cm / 12 × 18 in
- Paper: Lustre Photo Paper (LPP), 240 gsm
- Border: none
- Retail price: €30
- Availability: live
- Fulfilment mode: `prodigi-live`

#### EclaircissE

- Product ID: `eclaircisse-open`
- Store SKU: `ECL-LPP-40X50`
- Provider: Prodigi
- Provider SKU: `GLOBAL-PAP-16X20`
- Size: 40 × 50 cm / 16 × 20 in
- Paper: Lustre Photo Paper (LPP), 240 gsm
- Border: none
- Retail price: €35
- Availability: live
- Fulfilment mode: `prodigi-live`

#### Öppiä

- Product ID: `oppia-open`
- Store SKU: `OPP-PENDING`
- Provider: intended Prodigi
- Final dimensions: still in development
- Price: not set
- Availability: Available soon
- Fulfilment mode: unavailable
- Public image remains a preview while the final artwork is rebuilt.

#### IndepenDienta

- Product ID: `independienta-open`
- Store SKU: `IND-PENDING`
- Provider: intended Prodigi
- Final dimensions: still in development
- Price: not set
- Availability: Available soon
- Fulfilment mode: unavailable
- Public image remains a preview while the final artwork is rebuilt.

### 3.2 Collector Editions, Creativehub / theprintspace

All Collector Editions are:

- produced by Creativehub / theprintspace;
- Hahnemühle Pearl 285 gsm Giclée;
- sold unframed;
- accompanied by a Clean Certificate of Authenticity;
- accompanied by the approved letter insert;
- signed and numbered on the Certificate of Authenticity, not directly on the photograph;
- fulfilled manually only after payout is visible in Wise;
- shipped at the collector’s expense.

#### K.aisa.R, Presence

- Product ID: `kaisar-presence`
- Store SKU: `KSR-PRL-PRESENCE-60X90`
- Provider SKU: `V-XL076PZL`
- Size: 60 × 90 cm / 24 × 35 in
- Border: none
- Edition size: 5
- Retail price: €250
- Availability: live

#### K.aisa.R, Immersion

- Product ID: `kaisar-immersion`
- Store SKU: `KSR-PRL-IMMERSION-80X120`
- Provider SKU: `V-Y6L6H5YT`
- Size: 80 × 120 cm / 31 × 47 in
- Border: none
- Edition size: 5
- Retail price: €350
- Availability: live

Presence and Immersion are separate five-print allocations. Together they represent the current two-size K.aisa.R offering.

#### Mèranö, Reverie

- Product ID: `merano-reverie`
- Store SKU currently retained in code: `MER-PRL-REVERIE-60X75`
- Provider SKU: `V-GDH2VKCH`
- Authoritative public size: 50 × 40 cm / 20 × 16 in
- Border: 25 mm white border
- Edition size: 10
- Retail price: €150
- Availability: live

The Store SKU contains superseded dimensional wording and must not be changed casually because backend reconciliation may depend on it. The public size and provider record are authoritative.

#### Ràábta, Veil

- Product ID: `raabta-veil`
- Store SKU currently retained in code: `RBT-PRL-VEIL-40X50`
- Provider SKU: `V-K5SCKYN3`
- Authoritative public size: 75 × 60 cm / 30 × 24 in
- Border: 25 mm white border
- Edition size: 10
- Retail price: €200
- Availability: live

The Store SKU contains superseded dimensional wording and must not be changed casually because backend reconciliation may depend on it. The public size and provider record are authoritative.

---

## 4. Book products

### NiNE Standard Edition

- Supplier: Mixam
- Format: hardcover print on demand
- Purchase route: external Mixam route linked from the website
- Shipping: worldwide according to Mixam’s route and checkout
- Operational signal: Ali receives the Mixam order email when a customer purchases

This route was already known to have completed previous customer deliveries. The July 2026 work preserved and restored the working NiNE and Join Us links while hardening the print storefront.

### NiNE Premium Edition

- Supplier: Saal Digital
- This is the same premium configuration previously produced, not a second edition or redesign.
- Existing physical copies: Ali’s own copy and one gift copy; they were not customer sales.
- Future task: inspect Saal’s current backend, direct-purchase or commission options, production cost, and viable margin before reopening the premium route.
- Do not publish a numbered edition limit or “second edition” language unless independently confirmed.

---

## 5. Original Artworks

Current Original Artworks records:

- DusaEmas
- Gold
- Study
- Untitled

Shared operational facts:

- each is a unique original;
- recorded retail price: €200 each;
- approximately 40 × 30 cm outer frame;
- solid wood frame;
- real glass;
- sold framed;
- public page uses artwork and framed-view carousel;
- public purchase action remains withheld while insured shipping is being prepared.

Planned acquisition flow:

1. customer opens the acquisition panel;
2. customer selects destination country and postal code;
3. server obtains an insured carrier quote;
4. quote does not reserve the artwork;
5. secure checkout creation performs an atomic availability check;
6. a private temporary hold prevents a second simultaneous checkout;
7. successful Stripe payment marks the work sold;
8. fulfilment begins only after the payout is visible in Wise;
9. tracking is provided automatically once the carrier shipment is created.

DHL Express is the intended primary international carrier. Business-account approval and live API access remain pending. Private origin, parcel, and internal weight details are deliberately excluded from this package.

---

## 6. Supplier and service map

### GitHub

- Stores the version-controlled website code.
- Repository: `alicapafoto/alicapafoto.github.io`
- Production branch: `cloudflare-storefront-staging`
- A push to the production branch triggers Cloudflare Pages deployment.

### Cloudflare Pages and Functions

- Pages project: `ali-capa-storefront-staging`
- Public custom domain: `alicapa.com`
- Serves static pages, CSS, JavaScript, artwork assets, and server-side Pages Functions.
- Pages Functions provide catalogue, delivery quotation, Stripe Checkout creation, Stripe webhook processing, analytics-event collection, and operational APIs.

### Stripe

- Hosts the secure payment page.
- Receives server-trusted product and shipping amounts.
- Collects customer email, name, shipping address, phone where required, card payment, and required acceptance of Terms and Privacy.
- Sends signed webhook events after successful payment.

### Cloudflare D1

- Binding: `ORDER_LEDGER`
- Database: `ali-capa-order-ledger-production`
- Database ID: `829f9e58-5b03-4850-8a1f-f06f345696cf`
- Authoritative atomic order-event ledger.
- Prevents concurrent webhook processing from creating duplicate operational orders.

### Google Sheets

- Operational order mirror for fulfilment and accounting workflow.
- Receives one order row after the D1 claim is acquired and payment is verified.
- D1 is authoritative for webhook processing state; Sheets is the human-facing operational record.

### Wise

- Receives Stripe payouts.
- No supplier order is placed until the relevant Stripe payout is visibly available in Wise.

### Prodigi

- Produces Dream Editions.
- Live quote API supplies route-specific production and shipping information.
- Orders remain manual under the current cash-flow rule.

### Creativehub / theprintspace

- Produces Collector Editions.
- Products remain managed as Creativehub drafts/manual fulfilment records rather than automatic store fulfilment.
- Orders remain manual under the current cash-flow rule.

### Mixam

- Produces and fulfils the standard NiNE book through its existing external print-on-demand purchase route.

### Saal Digital

- Supplier for the existing NiNE premium physical configuration.
- Future commercial route remains to be researched and verified.

### DHL Express

- Intended insured carrier for framed Original Artworks.
- Live integration remains pending.

---

## 7. Production technical architecture

### 7.1 Live Cloudflare configuration

The authoritative `wrangler.toml` production settings are:

- `STORE_ENV = "live"`
- `STAGING_SAFE_MODE = "false"`
- `ANALYTICS_MODE = "production"`
- `ANALYTICS_ENGINE` dataset: `ali_capa_storefront_staging_events`
- `ORDER_LEDGER` D1 binding: `ali-capa-order-ledger-production`

The project and dataset names retain the word “staging” for historical reasons, but the values above and the production branch are live. Do not infer environment status solely from the resource name.

### 7.2 Secret and variable names

Expected encrypted secrets or protected values include:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PRODIGI_API_KEY`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SHEET_ID`
- `SITE_URL`

Other configuration values may include regional shipping controls and supplier cost overrides. Secret values must never be committed to GitHub, copied into documentation, or placed in screenshots intended for public sharing.

### 7.3 Catalogue request

The public browser requests `/api/catalog`.

The API returns:

- currency;
- global checkout readiness;
- public products and variants;
- prices;
- sizes and paper;
- availability;
- edition sizes and current sold counts where applicable.

The catalogue is derived from the server-side product source rather than trusting values from the browser.

### 7.4 Delivery quote

For a Dream Edition:

1. the server calls Prodigi using the provider SKU and destination country;
2. the server chooses a valid quote;
3. the server calculates customer delivery in cents;
4. the browser receives the quote, total, method, and estimate note.

For a Collector Edition:

1. the server maps the destination to the configured region;
2. the server uses the approved fixed customer shipping charge;
3. supplier production and estimated shipping costs are retained as internal order metadata;
4. the browser receives the total and tracked-delivery note.

### 7.5 Stripe Checkout creation

The checkout endpoint:

- accepts POST only;
- requires the request to come from the same site origin;
- requires the live store to be operational;
- validates the product and destination country;
- rejects unavailable or incomplete products;
- re-quotes delivery server-side so browser values cannot alter the amount;
- retrieves the server-authoritative price;
- creates the Stripe Checkout Session;
- uses an idempotency key based on checkout attempt, product, and destination;
- records a non-PII checkout-created analytics event.

### 7.6 Paid-order webhook

After Stripe reports a successful Checkout Session:

1. the Pages Function verifies the Stripe signature;
2. only successful checkout payment event types continue;
3. the function claims the Stripe Session ID in D1;
4. an already completed session is returned as a duplicate without creating another order;
5. a currently processing session returns a retry response rather than racing;
6. the function retrieves the complete Checkout Session directly from Stripe;
7. payment status must be `paid`;
8. the function calculates storefront revenue, shipping charged, Stripe fee when available, estimated supplier cost, contribution, and reserves;
9. the full operational order snapshot is saved in D1;
10. Google Sheets is checked for the Stripe Session ID;
11. exactly one row is appended when no matching row exists;
12. D1 is marked completed and sheet-synced;
13. an optional legacy KV audit marker may be written;
14. a privacy-limited checkout-completed analytics event is recorded.

If order processing fails, D1 records a failed state and Stripe receives an error response so it can retry.

---

## 8. Security and customer-protection controls

### Implemented

- Stripe-hosted card collection; the Ali Capa site never receives raw card details.
- Same-origin requirement for checkout creation.
- Server-authoritative catalogue, prices, availability, and shipping.
- Server-side delivery re-quote immediately before Stripe session creation.
- Destination allowlist.
- Stripe idempotency keys for repeated checkout attempts.
- Stripe webhook signature verification.
- D1 primary-key claim on Stripe Session ID.
- Five-minute processing lease and safe retry takeover.
- Completed-session duplicate suppression.
- Google Sheets duplicate check by Stripe Session ID.
- Encrypted Cloudflare secrets.
- Separate safe-mode switch retained for future staging and incident response.
- Custom analytics events intentionally exclude names, emails, addresses, card data, and oversized arbitrary fields.
- Public checkout remains disabled for unfinished prints and Original Artworks.

### Operational rule

A successful customer payment does **not** trigger automatic supplier fulfilment. Ali first verifies the order and waits until the Stripe payout is visibly available in Wise. This prevents the business from funding production before receiving the money.

### Still to verify or finish

- Confirm the intended Cloudflare rate-limiting rules in the live dashboard before a large marketing push.
- Enable HSTS only after the HTTPS configuration has been deliberately rechecked.
- Complete the first genuine paid print order reconciliation.
- Continue monitoring webhook failures and D1 failed rows.
- Keep production and test credentials completely separate.
- Do not reuse live payment secrets in preview projects.

---

## 9. Shipping and verified checkout observations

### Collector customer shipping schedule in code

- United Kingdom: €9
- Germany: €9
- European Union, including Portugal: €19
- EFTA: €21
- United States: €31
- Canada: €44
- Australia and New Zealand: €82
- Other supported destinations: €82

These charges are customer-facing configured amounts, not necessarily identical to the supplier invoice.

### Live pre-payment checks completed on 21 July 2026

The following Portugal checkouts were verified through Stripe without submitting payment:

- AtaquaS: €30 + €12.26 dynamic delivery = €42.26
- EclaircissE: €35 + €11.20 dynamic delivery = €46.20
- Mèranö, Reverie: €150 + €19 tracked delivery = €169
- K.aisa.R, Presence: €250 + €19 tracked delivery = €269
- K.aisa.R, Immersion: €350 + €19 tracked delivery = €369
- Ràábta, Veil: €200 + €19 tracked delivery = €219

Prodigi prices are live provider quotes and may change. The observed amounts are evidence of the successful launch check, not permanent promises.

Stripe correctly displayed product titles, variant labels, dimensions, paper, Giclée/unframed details where applicable, customer shipping, total, shipping-country lock, and required Terms and Privacy acceptance.

Stripe may offer the customer an optional converted currency. The store’s authoritative prices and accounting currency remain EUR.

---

## 10. Order record and financial fields

The Google Sheets operational row is designed to retain:

- order date;
- internal reference/client reference;
- Stripe Checkout Session ID;
- Stripe Payment Intent ID;
- payment and Wise status;
- refund status;
- fulfilment status;
- artwork and variant;
- provider and provider SKU;
- size, paper, and quantity;
- print revenue;
- delivery charged;
- customer total;
- Stripe fee;
- supplier item cost;
- supplier shipping cost;
- supplier tax;
- estimated supplier total;
- estimated contribution;
- 10% artwork-price emergency reserve;
- additional contribution/reserve calculations;
- shipping method;
- fulfilment country and lab where available;
- destination country;
- customer contact and delivery address;
- provider order ID;
- tracking;
- notes and update timestamp.

The initial operational status after a paid webhook is:

- Payment: `Paid — Awaiting Wise`
- Wise available: `No`
- Fulfilment: `Not ordered`

---

## 11. Fulfilment procedures

### 11.1 Dream Edition order

1. Receive Stripe payment notification.
2. Confirm one completed D1 row for the Stripe Session ID.
3. Confirm exactly one Google Sheets order row.
4. Review customer name, address, country, product, size, and charged shipping.
5. Wait until the Stripe payout is visibly available in Wise.
6. Mark Wise availability in the order sheet.
7. Place the matching manual Prodigi order using the correct provider SKU.
8. Confirm the customer address before submission.
9. Use the available thank-you insert only when the route supports it; never advertise it as guaranteed.
10. Record Prodigi order ID, actual supplier cost, fulfilment status, and tracking.
11. Send or confirm the customer tracking communication.
12. Reconcile actual contribution and reserve after final Stripe and supplier costs are known.

### 11.2 Collector Edition order

1. Receive Stripe payment notification.
2. Confirm one completed D1 row and exactly one Google Sheets row.
3. Confirm title, variant, edition allocation, provider SKU, size, border, paper, and destination.
4. Wait until the Stripe payout is visibly available in Wise.
5. Open Creativehub / theprintspace and place the matching product manually.
6. Preserve the approved configuration: print-only, unframed, Hahnemühle Pearl 285 gsm Giclée, Clean Certificate of Authenticity, letter included, signature and number on certificate rather than print.
7. Record the edition sale so inventory remains accurate.
8. Record provider order ID, actual cost, tracking, and final status in Google Sheets.
9. Confirm customer communication and delivery progress.

### 11.3 NiNE standard book

1. Customer follows the Mixam purchase route.
2. Mixam processes the print-on-demand order and shipping.
3. Ali receives the relevant Mixam order email.
4. File the message under the future Gmail Orders/Books structure.
5. Retain the email and supplier record for sales tracking and accounting.

### 11.4 Original Artwork future order

Do not improvise a manual public payment route. Wait for the insured-carrier acquisition flow and atomic sold-state logic. Once live, follow the specific artwork packing, insured label, drop-off, tracking, and sold-inventory procedure.

---

## 12. Analytics

### Cloudflare Web Analytics

Cloudflare Web Analytics is enabled for the site and provides page-view and visit information.

### Custom Analytics Engine

- Binding: `ANALYTICS_ENGINE`
- Dataset: `ali_capa_storefront_staging_events`
- Mode: production

Permitted first-party events include storefront actions such as page/gallery interactions, quote activity, checkout-session creation, and successful checkout completion. Event records are designed around page, product, variant, country, outcome, and source rather than customer identity.

Analytics must never become a second customer database. Do not add names, emails, addresses, phone numbers, card details, or free-form customer text to custom analytics.

---

## 13. Deployment workflow

1. Work is prepared and tested away from the production branch.
2. GitHub commits preserve the change history.
3. A tested hardening branch may be deployed as a Cloudflare preview.
4. After approval, the code is merged into `cloudflare-storefront-staging`.
5. Cloudflare automatically builds and deploys the production branch.
6. The deployment must show a green production status.
7. `/api/catalog` confirms the intended global and per-product checkout state.
8. Live quote and Stripe pre-payment screens are checked without paying.
9. Only then is the storefront declared customer-ready.

The Cloudflare project is historically named `ali-capa-storefront-staging`, even though it currently serves production. The production branch and environment variables determine the live state.

---

## 14. Recovery principles

- The site-only backup branch `backup-live-2026-07-21` points to the exact activation commit.
- The documentation branch `master-documentation-2026-07-21` contains the same site snapshot plus this documentation folder.
- Restoring code does not restore encrypted Cloudflare secret values. Those must be re-entered securely.
- Restoring the site does not recreate external supplier accounts, Stripe settings, the Google Sheet, D1 data, or DNS automatically.
- Never overwrite a functioning production branch until the replacement has been compared and validated.
- Preserve the activation commit SHA as the integrity anchor.

---

## 15. Immediate next operational checkpoint

The first genuine **print** payment is the remaining real-world end-to-end confirmation. When it occurs:

1. verify Stripe payment success;
2. verify one D1 completed order for the Session ID;
3. verify exactly one Google Sheets row;
4. verify the product, customer total, address, and status;
5. wait for Wise availability;
6. place the manual supplier order;
7. record tracking and actual costs.

The friend’s intended **book** purchase is useful for confirming the existing Mixam email route and later Gmail organization, but it does not exercise the new Stripe/D1/Sheets print-order pipeline.

---

## 16. End-of-day conclusion

At this checkpoint:

- the Ali Capa website is live;
- the NiNE standard book route is available;
- AtaquaS and EclaircissE are live Dream Editions;
- K.aisa.R Presence, K.aisa.R Immersion, Mèranö Reverie, and Ràábta Veil are live Collector Editions;
- all six completed print variants passed live pre-payment verification;
- unfinished prints remain protected;
- Original Artwork checkout remains protected pending insured-carrier integration;
- Stripe, Cloudflare Pages Functions, Analytics Engine, D1, Google Sheets, Wise, Prodigi, Creativehub/theprintspace, Mixam, and future DHL responsibilities are documented;
- customer and business safety controls are active;
- a reproducible code backup and master documentation checkpoint have been created.