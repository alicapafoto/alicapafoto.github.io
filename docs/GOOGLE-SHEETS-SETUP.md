# Private Google Sheets order ledger

## Create the spreadsheet

1. Create a private Google Sheet named `Ali Capa Foto — Live Orders`.
2. Rename the first worksheet to `Orders`.
3. Import or paste the header row from `ORDER_LEDGER_TEMPLATE.csv`.
4. Freeze row 1 and enable a filter.
5. Do not place this sheet inside a publicly shared Drive folder.

## Create Google service-account access

1. Create or select a Google Cloud project.
2. Enable the Google Sheets API.
3. Create a service account dedicated to the Ali Capa order ledger.
4. Create a JSON key once. Do not upload the JSON file to GitHub or ChatGPT.
5. Copy only the service-account email and private key into encrypted Cloudflare secrets.
6. Share the individual Google Sheet with the service-account email as **Editor**.
7. Put the spreadsheet ID in `GOOGLE_SHEET_ID`.

## Recommended private views

Use filter views instead of creating a worksheet for each date:

- Today's Orders — Order Date is today.
- Awaiting Wise — Order Status is `Paid — Awaiting Wise`.
- Ready to Fulfil — Wise Available? is `Yes` and Fulfilment Status is `Not ordered`.
- Ordered — Fulfilment Status is `Ordered`.
- Shipped — Fulfilment Status is `Shipped`.
- Exceptions — Order Status is `Refunded` or `Disputed`.

The webhook writes only to the master `Orders` worksheet using RAW cell values so customer-supplied text cannot be interpreted as spreadsheet formulas. Estimated provider cost, contribution, and reserve fields are recorded from the checkout snapshot; Ali later enters the actual provider total, provider order ID, fulfilment date, and tracking.

## Privacy rules

- Keep the live fulfilment sheet private.
- Share it temporarily only with a trusted person who is actively fulfilling orders.
- Revoke access after the handoff.
- The permanent business archive should contain aggregated sales and product data, not customer addresses.
- Export a dated XLSX backup monthly for accounting and continuity.
