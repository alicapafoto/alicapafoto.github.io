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

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    assertCheckoutOperational(context.env);
    const { productId, countryCode } = await readJson(context.request);
    const product = getProduct(productId);
    const country = String(countryCode || "").toUpperCase();
    if (!product || !isPubliclyAvailable(product)) return json({ error: "This print is not currently available." }, 404);
    if (!isProductCheckoutConfigured(product, context.env)) return json({ error: "Checkout for this print is still being prepared." }, 409);
    if (!ALLOWED_COUNTRY_CODES.has(country)) return json({ error: "Delivery is not currently available for that country." }, 400);

    // Re-quote server-side so a browser cannot alter product or shipping amounts.
    const { quote, shipping } = await quoteProduct({ product, countryCode: country, env: context.env });
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
    });
    return json({ url: session.url, sessionId: session.id });
  } catch (error) {
    return json({ error: publicError(error, "Secure checkout could not be started. Please try again.") }, 502);
  }
}
