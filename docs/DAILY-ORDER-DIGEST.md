# Daily order digest

The launch master includes a separate Worker project in `cloudflare-order-digest/`.

It is designed to send Ali a private email every day at 10 p.m. Europe/Lisbon time. The Worker runs hourly and checks Lisbon local time, which keeps the delivery hour correct across daylight-saving changes.

The digest reads the private Google Sheet and summarizes:

- order count;
- customer total;
- shipping charged;
- estimated provider total;
- estimated contribution;
- orders awaiting Wise;
- orders ready to fulfil;
- artwork, size, destination, customer reference, and operational status for each order.

Full addresses and phone numbers are intentionally omitted from the email and remain in the private order ledger.

This feature requires a one-time separate Worker deployment, Email Service or Email Routing setup, a verified destination address, and encrypted Google credentials. The website itself remains fully operational whether or not the digest Worker has been deployed.
