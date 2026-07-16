import {
  ALLOWED_COUNTRY_CODES,
  getCurrentPriceCents,
  getProduct,
  isPubliclyAvailable,
  isProductCheckoutConfigured,
} from "../_lib/products.js";
import { assertSameOrigin, isCheckoutOperational, json, methodNotAllowed, publicError, readJson } from "../_lib/http.js";
import { quoteProduct } from "../_lib/fulfillment.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    const { productId, countryCode } = await readJson(context.request);
    const product = getProduct(productId);
    const country = String(countryCode || "").toUpperCase();
    if (!product || !isPubliclyAvailable(product)) return json({ error: "This print is not currently available." }, 404);
    if (!isCheckoutOperational(context.env) || !isProductCheckoutConfigured(product, context.env)) {
      return json({ error: "Checkout for this print is still being prepared." }, 409);
    }
    if (!ALLOWED_COUNTRY_CODES.has(country)) return json({ error: "Delivery is not currently available for that country." }, 400);

    const { quote, shipping, estimateNote } = await quoteProduct({ product, countryCode: country, env: context.env });
    const priceCents = getCurrentPriceCents(product);

    return json({
      product: {
        id: product.id,
        title: product.work.title,
        label: product.label,
        size: product.size,
        paper: product.paper,
      },
      countryCode: country,
      currency: "EUR",
      priceCents,
      shippingCents: shipping.customerCents,
      totalCents: priceCents + shipping.customerCents,
      shippingMethod: quote.method,
      fulfillmentCountry: quote.fulfillmentCountry,
      estimateNote,
    });
  } catch (error) {
    return json({ error: publicError(error, "A live shipping quote could not be calculated. Please try again.") }, 502);
  }
}
