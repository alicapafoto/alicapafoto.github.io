import {
  ALLOWED_COUNTRY_CODES,
  getCurrentPriceCents,
  getProduct,
  isPubliclyAvailable,
  isProductCheckoutConfigured,
} from "../_lib/products.js";
import { assertCheckoutOperational, assertSameOrigin, getSiteOrigin, json, methodNotAllowed, publicError, readJson } from "../_lib/http.js";
import { quoteProduct } from "../_lib/fulfillment.js";
import { createStripeCheckoutSession } from "../_lib/stripe.js";
import { writeAnalyticsEvent } from "../_lib/analytics.js";

function checkoutIdempotencyKey(attemptId, productId, countryCode) {
  const cleanAttempt = /^[a-f0-9-]{20,80}$/i.test(String(attemptId || ""))
    ? String(attemptId)
    : crypto.randomUUID();
  return `ali-capa-checkout:${cleanAttempt}:${productId}:${countryCode}`;
}

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    assertCheckoutOperational(context.env);
    const { productId, countryCode, checkoutAttemptId } = await readJson(context.request);
    const product = getProduct(productId);
    const country = String(countryCode || "").toUpperCase();
    if (!product || !isPubliclyAvailable(product)) return json({ error: "This print is not currently available." }, 404);
    if (!isProductCheckoutConfigured(product, context.env)) return json({ error: "This print is temporarily unavailable." }, 409);
    if (!ALLOWED_COUNTRY_CODES.has(country)) return json({ error: "Delivery is temporarily unavailable for that destination." }, 400);

    // Re-quote server-side so a browser cannot alter product or shipping amounts.
    const { quote, shipping, estimateNote } = await quoteProduct({ product, countryCode: country, env: context.env });
    const priceCents = getCurrentPriceCents(product);
    const siteOrigin = getSiteOrigin(context.request, context.env);

    const session = await createStripeCheckoutSession({
      env: context.env,
      siteOrigin,
      product,
      priceCents,
      countryCode: country,
      shipping,
      quote,
      idempotencyKey: checkoutIdempotencyKey(checkoutAttemptId, product.id, country),
    });
    writeAnalyticsEvent(context.env, "checkout_session_created", {
      page: "/prints.html",
      product: product.id,
      variant: product.label,
      country,
      outcome: "success",
      source: "server",
    });
    return json({
      url: session.url,
      sessionId: session.id,
      currency: "EUR",
      priceCents,
      shippingCents: shipping.customerCents,
      totalCents: priceCents + shipping.customerCents,
      shippingMethod: quote.method,
      estimateNote,
    });
  } catch (error) {
    return json({ error: publicError(error, "Secure checkout could not be started. Please try again.") }, 502);
  }
}
