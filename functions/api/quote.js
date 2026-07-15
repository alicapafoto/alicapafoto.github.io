import { ALLOWED_COUNTRY_CODES, getCurrentPriceCents, getProduct } from "../_lib/products.js";
import { assertSameOrigin, json, methodNotAllowed, publicError, readJson } from "../_lib/http.js";
import { calculateCustomerShippingCents, chooseBestQuote, getProdigiQuotes } from "../_lib/prodigi.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    const { productId, countryCode } = await readJson(context.request);
    const product = getProduct(productId);
    const country = String(countryCode || "").toUpperCase();
    if (!product || !product.active) return json({ error: "This print is not currently available." }, 404);
    if (!ALLOWED_COUNTRY_CODES.has(country)) return json({ error: "Delivery is not currently available for that country." }, 400);

    const payload = await getProdigiQuotes({ env: context.env, sku: product.sku, countryCode: country });
    const quote = chooseBestQuote(payload);
    const shipping = calculateCustomerShippingCents(quote, country, context.env);
    const priceCents = getCurrentPriceCents(product, context.env);

    return json({
      product: { id: product.id, title: product.title, size: product.size, paper: product.paper },
      countryCode: country,
      currency: "EUR",
      priceCents,
      shippingCents: shipping.customerCents,
      totalCents: priceCents + shipping.customerCents,
      shippingMethod: quote.method,
      fulfillmentCountry: quote.fulfillmentCountry,
      estimateNote: "Made to order. Production normally takes 36–72 hours before dispatch.",
    });
  } catch (error) {
    return json({ error: publicError(error, "A live shipping quote could not be calculated. Please try again.") }, 502);
  }
}
