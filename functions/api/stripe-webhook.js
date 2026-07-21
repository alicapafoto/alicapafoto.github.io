import { isStagingSafeMode, json, methodNotAllowed } from "../_lib/http.js";
import { writeAnalyticsEvent } from "../_lib/analytics.js";
import { appendOrderRow, hasOrderSession } from "../_lib/google-sheets.js";
import { claimOrderEvent, markOrderCompleted, markOrderFailed, saveOrderSnapshot } from "../_lib/order-ledger.js";
import { retrieveCheckoutSession, verifyStripeWebhook } from "../_lib/stripe.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  if (isStagingSafeMode(context.env)) return json({ received: true, ignored: "staging-safe-mode" });

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

  let acquired = false;
  try {
    const claim = await claimOrderEvent(context.env, {
      sessionId,
      eventId: event.id || `unknown:${sessionId}`,
      eventType: event.type,
    });
    if (claim.duplicate) return json({ received: true, duplicate: true });
    if (claim.inProgress) {
      const retryAfter = Math.max(1, Math.ceil(Number(claim.retryAfterMs || 1_000) / 1_000));
      return json(
        { error: "Order processing is already in progress; Stripe should retry." },
        503,
        { "retry-after": String(retryAfter) },
      );
    }
    acquired = true;

    const session = await retrieveCheckoutSession(context.env, sessionId);
    if (session.payment_status !== "paid") {
      await markOrderFailed(context.env, sessionId, `Payment status: ${session.payment_status || "unknown"}`);
      return json({ received: true, paymentStatus: session.payment_status });
    }

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
    const providerItemCents = euroStringToCents(metadata.provider_item_quote_eur || metadata.prodigi_item_quote_eur);
    const providerShippingCents = euroStringToCents(metadata.provider_shipping_quote_eur || metadata.prodigi_shipping_quote_eur);
    const providerTaxCents = cents(metadata.provider_item_tax_cents || metadata.prodigi_item_tax_cents)
      + cents(metadata.provider_shipping_tax_cents || metadata.prodigi_shipping_tax_cents);
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
      metadata.shipping_method || metadata.prodigi_shipping_method || "",
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
      buildNotes(metadata),
      updatedIso,
    ];

    // D1 is the authoritative atomic ledger. Google Sheets is the operational mirror.
    await saveOrderSnapshot(context.env, sessionId, {
      eventId: event.id || "",
      eventType: event.type,
      sessionId,
      paymentIntentId: session.payment_intent?.id || session.payment_intent || "",
      productId: metadata.product_id || "",
      artwork: metadata.artwork || lineItem.description || "",
      variant: metadata.variant_label || "",
      storeSku: metadata.store_sku || "",
      destinationCountry: address.country || metadata.destination_country || "",
      customerTotalCents,
      values,
    });

    const alreadyMirrored = await hasOrderSession(context.env, sessionId);
    if (!alreadyMirrored) await appendOrderRow(context.env, values);
    await markOrderCompleted(context.env, sessionId, { sheetSynced: true });

    if (context.env.ORDER_EVENTS) {
      try {
        await context.env.ORDER_EVENTS.put(`checkout:${sessionId}`, "processed", { expirationTtl: 60 * 60 * 24 * 180 });
      } catch (error) {
        console.error("Legacy KV audit write failed", error);
      }
    }

    writeAnalyticsEvent(context.env, "checkout_completed", {
      page: "/checkout-success.html",
      product: metadata.product_id || metadata.store_sku || "",
      variant: metadata.variant_label || "",
      country: address.country || metadata.destination_country || "",
      outcome: "paid",
      source: "stripe-webhook",
    });
    return json({ received: true, reconciled: alreadyMirrored });
  } catch (error) {
    if (acquired) {
      try {
        await markOrderFailed(context.env, sessionId, error);
      } catch (ledgerError) {
        console.error("Order ledger failure state could not be recorded", ledgerError);
      }
    }
    console.error("Order processing failed", error);
    return json({ error: "Order recording failed; Stripe should retry this webhook." }, 500);
  }
}

function buildNotes(metadata) {
  const notes = [];
  if (metadata.store_sku) notes.push(`Store SKU: ${metadata.store_sku}`);
  if (metadata.variant_label) notes.push(`Variant: ${metadata.variant_label}`);
  if (metadata.edition_size) notes.push(`Edition size: ${metadata.edition_size}`);
  return notes.join(" · ");
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
