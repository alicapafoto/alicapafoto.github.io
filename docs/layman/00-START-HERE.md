# Start Here — Ali Capa Foto in Plain Language

This folder explains how the business works without exposing private technical details.

Ali Capa Foto sells Ali’s own books, photographic prints, and unique Original Artworks through `alicapa.com`. The website shows the art, calculates approved delivery where available, sends customers to Stripe for secure card payment, and records verified paid orders for fulfilment.

Ali remains the final decision-maker. A helper may follow these documents, but must not change prices, products, editions, shipping rules, providers, availability, refunds, payment routes, or the live website without Ali’s approval.

## The simple system

- GitHub holds the website files.
- Cloudflare publishes and protects the site.
- Stripe securely accepts card payments.
- The private database prevents duplicate orders and double sales.
- Google Sheets gives Ali an operational order view.
- Wise receives Stripe payouts.
- Prodigi, Creativehub/theprintspace, and Mixam produce the relevant prints or books after Ali manually orders them.
- DHL will carry insured Original Artworks after the live connection is approved and Ali confirms the packed parcel.
- Gmail organizes actions, waiting items, providers, orders, finance, compliance, outreach, and completed records.

## Current position at v0.9

The live print shop is operational. Original Artwork acquisition is still closed while Stripe finishes an account review and DHL answers the developer/API request. The Original Works system is prepared and tested but must not be deployed yet.

## Safety boundary

This folder does not contain passwords, keys, customer records, private address details, account recovery material, or instructions for bypassing Ali’s approval. Anyone needing deeper implementation detail must receive the restricted technical documentation directly from Ali.