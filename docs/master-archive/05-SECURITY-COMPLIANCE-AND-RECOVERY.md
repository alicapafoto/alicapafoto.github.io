# Security, Compliance and Recovery

## Secrets and private information

Never commit or place in shareable documentation:

- Stripe secret keys or webhook secrets;
- DHL credentials or account secrets;
- Google service-account private keys;
- database credentials or private identifiers;
- Cloudflare Access private identifiers;
- recovery codes;
- customer records;
- complete payment-card information;
- Ali’s private sender address or telephone.

Private values belong in approved encrypted platform configuration only.

## Account protection

Passkeys and two-factor authentication are enabled for key services including Stripe, GitHub, and Google. Recovery material must remain offline and restricted.

## Website protections

The storefront uses security headers including content-type protection, strict referrer controls, frame denial, permissions restrictions, cross-origin isolation policy, Content Security Policy, no-store controls for sensitive result/API routes, and noindex protections for checkout/private pages.

## Stripe webhook protections

- Verify the Stripe signature against the raw payload.
- Process only supported events.
- Retrieve the Checkout Session server-side and confirm paid state.
- Use D1 atomic claiming to prevent duplicates.
- Treat retries as normal and idempotent.
- Lock unique Original Artwork Sold state before operational mirroring.
- Never infer payment from a browser redirect or Gmail receipt alone.

The print storefront currently subscribes to the successful-payment events it uses. Before Original Works activation, add `checkout.session.expired` to the live webhook destination.

## Original Works protections

- Inventory begins unavailable.
- Public acquisition requires all feature, database, shipping, and checkout gates to agree.
- Delivery quote comes before reservation.
- Quote tokens are signed, short-lived, and bound to artwork, normalized address hash, amount, and expiry.
- The server re-quotes before the unique artwork is reserved.
- Only one atomic database update can win.
- Reservation tokens contain 256 random bits; only hashes are stored.
- Tokens do not enter URLs, Stripe metadata, analytics, or Google Sheets.
- Checkout-created holds cannot be released by generic timer cleanup.
- Paid Sold state cannot be reopened by cancellation or expiration code.
- Mock shipping is prohibited in live mode.
- The DHL live adapter remains fail-closed until official details are implemented.

## Stripe compliance status

The one-time contribution feature and its Payment Link were removed/deactivated after Stripe identified a potential restricted-business concern. The submitted response confirms that Stripe is used for commercial sales of Ali’s own books, prints, and Original Artworks. The contribution feature must not return under another name or processor without written approval and a fresh compliance review.

## Cloudflare Access

Private Original Artwork fulfilment controls are designed to sit behind Cloudflare Access. The backend verifies the signed Access JWT, issuer, audience, expiry, signature, canonical encoding, and approved administrator identity. Do not expose the private admin route publicly or trust an identity header without signature verification.

## Recovery priorities

When something looks wrong:

1. Do not repeat payment, fulfilment, migration, label, or deployment actions blindly.
2. Preserve the exact email, screenshot, Stripe Session ID, provider reference, and timestamp.
3. Check Stripe and D1 before trusting Gmail or Google Sheets.
4. Check the approved production branch before uploading any ZIP.
5. Use the live backup branch if the deployed site must be compared or restored.
6. Stop unique-artwork acquisition rather than risk a double sale.
7. Contact the relevant provider through the established account; do not evade a compliance or account restriction through another processor.

## Deployment rule

No major draft is merged, deployed, migrated, or activated without:

- successful automated checks;
- manual Preview review;
- correct encrypted configuration;
- external approvals where required;
- explicit final approval from Ali.