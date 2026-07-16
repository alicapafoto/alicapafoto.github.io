import {
  COUNTRIES,
  PRODUCTS,
  getCurrentPriceCents,
  getPriceLabel,
  publicProductStatus,
} from "../_lib/products.js";
import { isCheckoutOperational, json, methodNotAllowed } from "../_lib/http.js";

export function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed("GET");
  const coreReady = isCheckoutOperational(context.env);
  const products = Object.values(PRODUCTS).map((product) => {
    const status = publicProductStatus(product, context.env);
    return {
      id: product.id,
      workId: product.work.id,
      title: product.work.title,
      label: product.label,
      size: product.size,
      paper: product.paper,
      priceCents: getCurrentPriceCents(product),
      priceLabel: getPriceLabel(product),
      availability: status.code,
      statusLabel: status.label,
      checkoutReady: Boolean(coreReady && status.checkoutReady),
      editionSize: product.editionSize || null,
      soldCount: product.soldCount || 0,
    };
  });
  return json({
    currency: "EUR",
    checkoutReady: coreReady && products.some((product) => product.checkoutReady),
    products,
    countries: COUNTRIES.map(([code, name]) => ({ code, name })),
  });
}
