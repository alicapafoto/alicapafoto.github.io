# Ali Capa daily order digest Worker

This separate Cloudflare Worker sends a private daily digest at 10 p.m. Europe/Lisbon time. It runs hourly and checks local Lisbon time, so daylight-saving changes do not shift the delivery hour.

The email includes daily order count, customer total, shipping charged, estimated provider cost, estimated contribution, orders awaiting Wise, orders ready to fulfil, and a compact list of each order. Full addresses and phone numbers remain only in the private Google Sheet.

## Required Cloudflare setup

1. Enable Email Routing or Email Service for `alicapa.com`.
2. Verify `alicapafoto@gmail.com` as a destination address.
3. Onboard `alicapa.com` for sending and allow `orders@alicapa.com`.
4. Deploy this directory as a separate Worker, not as a Pages Function.
5. Add encrypted Worker secrets:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `DIGEST_MANUAL_TOKEN`
6. Confirm the `ORDER_EVENTS` KV binding points to the production namespace.
7. Run `npm install`, then `npm run deploy` from this directory.

## Manual verification

After deployment, `GET /health` returns a non-sensitive health response. A protected manual digest can be sent with:

`POST /send?force=1`

and header:

`Authorization: Bearer <DIGEST_MANUAL_TOKEN>`

Never place the token or Google credentials in GitHub.
