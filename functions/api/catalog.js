import { COUNTRIES, PRODUCTS, getCurrentPriceCents, getPriceLabel } from "../_lib/products.js";
import { isCheckoutOperational, json, methodNotAllowed } from "../_lib/http.js";

export function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed("GET");
  const products = Object.values(PRODUCTS).map((product) => ({
    id: product.id,
    title: product.title,
    subtitle: product.subtitle,
    size: product.size,
    paper: product.paper,
    imagePath: product.imagePath,
    anchor: product.anchor,
    active: product.active,
    priceCents: getCurrentPriceCents(product, context.env),
    priceLabel: getPriceLabel(product, context.env),
  }));
  return json({
    currency: "EUR",
    checkoutReady: isCheckoutOperational(context.env),
    products,
    countries: COUNTRIES.map(([code, name]) => ({ code, name })),
  });
}
