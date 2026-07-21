# Production Checkout Activation

This checklist activates the six completed print options without exposing payment or fulfilment secrets.

## Safety rule

Do not remove staging safe mode and do not merge the production hardening pull request until every item below is complete.

## 1. Create the atomic order ledger

Create a Cloudflare D1 database named:

`ali-capa-order-ledger-production`

Binding name used by Pages Functions:

`ORDER_LEDGER`

The database ID is not a secret, but it must match the D1 database created in the Ali Capa Cloudflare account.

## 2. Add the Wrangler binding

Add the following block to the production Pages Wrangler configuration, replacing the placeholder with the real database ID:

```toml
[[d1_databases]]
binding = "ORDER_LEDGER"
database_name = "ali-capa-order-ledger-production"
database_id = "REPLACE_WITH_REAL_DATABASE_ID"
migrations_dir = "migrations"
```

Keep `STAGING_SAFE_MODE = "true"` while the binding and database are being verified.

## 3. Apply the schema

Apply `migrations/0001_order_ledger.sql` to the production D1 database before checkout activation. The Functions also perform a defensive `CREATE TABLE IF NOT EXISTS`, but the migration remains the authoritative setup record.

## 4. Verify production dependencies

Confirm the production Pages environment has these encrypted or resource bindings:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PRODIGI_API_KEY`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `SITE_URL`
- `ORDER_EVENTS`
- `ORDER_LEDGER`
- `ANALYTICS_ENGINE`

`STORE_ENV` must be `live` only in production.

## 5. Controlled activation

After the D1 binding and schema are verified:

1. Set `STORE_ENV = "live"`.
2. Set `ANALYTICS_MODE = "production"`.
3. Set `STAGING_SAFE_MODE = "false"`.
4. Run the automated storefront checks.
5. Deploy to the current production branch.
6. Confirm `/api/catalog` reports checkout ready for exactly six completed options.
7. Request delivery quotes for a Dream Edition and a Collector Edition without paying.
8. Complete one controlled real purchase.
9. Confirm exactly one D1 order event and exactly one Google Sheets order row.
10. Confirm Stripe webhook delivery returned HTTP 200.

## Rollback

If any production verification fails, restore `STAGING_SAFE_MODE = "true"` immediately and redeploy. Existing book and Join Us links remain independent of the print checkout safe-mode switch.
