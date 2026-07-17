# Cloudflare checkout rate limiting

The storefront already validates origin, limits JSON bodies to 8 KB, recalculates all prices and shipping on the server, and verifies Stripe webhooks. Add one Cloudflare rate-limiting rule before a public marketing push to reduce automated quote and checkout abuse.

## Recommended zone rule

Name:

`Ali Capa checkout API protection`

Expression:

```text
(http.request.method eq "POST" and http.request.uri.path in {"/api/quote" "/api/create-checkout"})
```

Recommended starting threshold:

- 12 requests
- per 10 seconds
- counted by source IP
- action: Managed Challenge, or Block when Managed Challenge is unavailable

This comfortably allows normal browsing and repeated country checks while slowing scripted abuse. Review Cloudflare Security Events after launch. Raise the threshold if legitimate collectors are challenged; lower it only if automated traffic becomes visible.

Do not rate-limit `/api/stripe-webhook` with this rule. Stripe must be able to retry signed webhook deliveries.
