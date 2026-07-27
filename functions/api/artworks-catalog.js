import { getArtworkInventoryStatus } from "../_lib/artwork-inventory.js";
import { isCheckoutOperational, json, methodNotAllowed } from "../_lib/http.js";
import { getOriginalArtworkCountries, ORIGINAL_ARTWORK_PRODUCTS } from "../_lib/original-artworks.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed("GET");

  const coreReady = isCheckoutOperational(context.env);
  const products = [];
  for (const product of ORIGINAL_ARTWORK_PRODUCTS) {
    const inventory = await getArtworkInventoryStatus(context.env, product.id);
    products.push({
      id: product.id,
      title: product.title,
      label: product.label,
      size: product.size,
      medium: product.medium,
      presentation: product.presentation,
      priceCents: product.priceCents,
      availability: inventory.code,
      checkoutReady: Boolean(coreReady && inventory.checkoutReady),
    });
  }

  return json({
    currency: "EUR",
    checkoutReady: coreReady && products.some((product) => product.checkoutReady),
    products,
    countries: getOriginalArtworkCountries(),
  });
}
