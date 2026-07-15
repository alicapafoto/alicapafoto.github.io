import { json, methodNotAllowed } from "../_lib/http.js";
import { appendOrderRow } from "../_lib/google-sheets.js";
import { retrieveCheckoutSession, verifyStripeWebhook } from "../_lib/stripe.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  const payload = await context.request.text();
  const signatureHeader = context.request.headers.get("stripe-signature");
  const verified = await verifyStripeWebhook({
    payload,
    signatureHeader,
    secret: context.env.STRIPE_WEBHOOK_SECRET,
  });
  if (!verified) return json({ error: "Invalid webhook signature" }, 400);

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return json({ error: "Invalid webhook payload" }, 400);
  }

  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    return json({ received: true });
  }

  const sessionId = event.data?.object?.id;
  if (!sessionId) return json({ error: "Missing Checkout Session ID" }, 400);
  const idempotencyKey = `checkout:${sessionId}`;

  if (context.env.ORDER_EVENTS) {
    const processed = await context.env.ORDER_EVENTS.get(idempotencyKey);
    if (processed) return json({ received: true, duplicate: true });
  }

  const session = await retrieveCheckoutSession(context.env, sessionId);
  if (session.payment_status !== "paid") return json({ received: true, paymentStatus: session.payment_status });

  const metadata = session.metadata || {};
  const shippingDetails = session.collected_information?.shipping_details
    || session.shipping_details
    || session.customer_details
    || {};
  const address = shippingDetails.address || session.customer_details?.address || {};
  const balanceTransaction = session.payment_intent?.latest_charge?.balance_transaction || {};
  const lineItem = session.line_items?.data?.[0] || {};
  const createdIso = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString();
  const updatedIso = new Date().toISOString();

  const printRevenueCents = cents(metadata.store_price_cents || session.amount_subtotal);
  const shippingChargedCents = cents(metadata.customer_shipping_cents || session.total_details?.amount_shipping);
  const customerTotalCents = cents(session.amount_total);
  const stripeFeeCents = centsOrNull(balanceTransaction.fee);
  const providerItemCents = euroStringToCents(metadata.prodigi_item_quote_eur);
  const providerShippingCents = euroStringToCents(metadata.prodigi_shipping_quote_eur);
  const providerTaxCents = cents(metadata.prodigi_item_tax_cents) + cents(metadata.prodigi_shipping_tax_cents);
  const providerTotalCents = cents(metadata.estimated_provider_total_cents)
    || providerItemCents + providerShippingCents + providerTaxCents;
  const contributionCents = stripeFeeCents === null
    ? null
    : customerTotalCents - stripeFeeCents - providerTotalCents;

  const values = [
    createdIso,
    session.client_reference_id || "",
    session.id,
    session.payment_intent?.id || session.payment_intent || "",
    "Paid — Awaiting Wise",
    "No",
    "Not ordered",
    metadata.artwork || lineItem.description || "",
    metadata.provider || "",
    metadata.provider_sku || "",
    metadata.print_size || "",
    metadata.paper || "",
    lineItem.quantity || 1,
    euros(printRevenueCents),
    euros(shippingChargedCents),
    euros(customerTotalCents),
    stripeFeeCents === null ? "" : euros(stripeFeeCents),
    euros(providerItemCents),
    euros(providerShippingCents),
    euros(providerTaxCents),
    euros(providerTotalCents),
    contributionCents === null ? "" : euros(contributionCents),
    euros(Math.round(printRevenueCents * 0.10)),
    contributionCents === null ? "" : euros(Math.max(0, Math.round(contributionCents * 0.30))),
    contributionCents === null ? "" : euros(Math.max(0, Math.round(contributionCents * 0.10))),
    metadata.prodigi_shipping_method || "",
    metadata.fulfillment_country || "",
    metadata.fulfillment_lab || "",
    address.country || metadata.destination_country || "",
    shippingDetails.name || session.customer_details?.name || "",
    session.customer_details?.email || "",
    session.customer_details?.phone || "",
    address.line1 || "",
    address.line2 || "",
    address.city || "",
    address.state || "",
    address.postal_code || "",
    "",
    "",
    "",
    "",
    "",
    updatedIso,
  ];

  try {
    await appendOrderRow(context.env, values);
    if (context.env.ORDER_EVENTS) {
      await context.env.ORDER_EVENTS.put(idempotencyKey, "processed", { expirationTtl: 60 * 60 * 24 * 180 });
    }
    return json({ received: true });
  } catch (error) {
    console.error("Order ledger append failed", error);
    return json({ error: "Order recording failed; Stripe should retry this webhook." }, 500);
  }
}

function cents(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function centsOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function euroStringToCents(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function euros(valueInCents) {
  return Number((valueInCents / 100).toFixed(2));
}
