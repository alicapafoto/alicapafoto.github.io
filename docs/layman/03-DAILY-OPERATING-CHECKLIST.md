# Daily Operating Checklist

## When opening the business inbox

1. Open `01 Action Needed`.
2. Check active `20 Orders and Fulfilment` messages.
3. Check `30 Finance and Records` for Stripe and Wise movement.
4. Check `02 Waiting External` for replies that now require action.
5. Read urgent Legal/Compliance and Website/Infrastructure alerts.

## When a paid order appears

- Confirm payment in Stripe and the protected order record.
- Confirm that exactly one operational order exists.
- Add or keep the correct Orders, Finance, Stripe, and Action Needed Gmail labels.
- When waiting for the payout, move the active state from Action Needed to Waiting External.
- When Wise shows the funds, return the order to Action Needed.
- Place the correct supplier order manually.
- Record the provider order ID.
- Move the order to Waiting External while the provider produces or ships.
- When tracking arrives, return it to Action Needed, record tracking, and update the customer where needed.
- When complete, remove active state labels, add Reference Archive, and archive the email from the main Inbox.

## When Stripe or DHL replies

- If they ask Ali to do something: use `01 Action Needed`.
- After Ali responds: use `02 Waiting External`.
- When fully resolved: remove both active labels and use `99 Reference Archive`.

## At the end of a meaningful business workday

- Make sure no finished item still says Action Needed.
- Make sure waiting items are under Waiting External.
- Record important provider references and tracking.
- Add a brief Operational Diary entry when decisions or systems changed.
- Update the open-items roadmap when a blocker is resolved.
- Do not create a new master ZIP unless this is an approved freeze point.

## Current daily reality at v0.9

- Print storefront: live.
- Stripe compliance review: Waiting External.
- DHL developer request: Waiting External.
- Original Artwork acquisition: disabled.
- Artist work and planned Instagram posts may continue without reopening technical construction.