import { ALLOWED_COUNTRY_CODES, getCurrentPriceCents, getProduct } from "../_lib/products.js";
import { assertCheckoutOperational, assertSameOrigin, getSiteOrigin, json, methodNotAllowed, publicError, readJson } from "../_lib/http.js";
import { calculateCustomerShippingCents, chooseBestQuote, getProdigiQuotes } from "../_lib/prodigi.js";
import { createStripeCheckoutSession } from "../_lib/stripe.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    assertCheckoutOperational(context.env);
    const { productId, countryCode } = await readJson(context.request);
    const product = getProduct(productId);
    const country = String(countryCode || "").toUpperCase();
    if (!product || !product.active) return json({ error: "This print is not currently available." }, 404);
    if (!ALLOWED_COUNTRY_CODES.has(country)) return json({ error: "Delivery is not currently available for that country." }, 400);

    // Re-quote server-side so a browser cannot alter the shipping amount.
    const payload = await getProdigiQuotes({ env: context.env, sku: product.sku, countryCode: country });
    const quote = chooseBestQuote(payload);
    const shipping = calculateCustomerShippingCents(quote, country, context.env);
    const priceCents = getCurrentPriceCents(product, context.env);
    const siteOrigin = getSiteOrigin(context.request, context.env);

    const session = await createStripeCheckoutSession({
      env: context.env,
      siteOrigin,
      product,
      priceCents,
      countryCode: country,
      shipping,
      quote,
    });
    return json({ url: session.url, sessionId: session.id });
  } catch (error) {
    return json({ error: publicError(error, "Secure checkout could not be started. Please try again.") }, 502);
  }
}
