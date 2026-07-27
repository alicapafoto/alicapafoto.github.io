import { getArtworkInventoryStatus } from "../_lib/artwork-inventory.js";
import { assertSameOrigin, isCheckoutOperational, json, methodNotAllowed, publicError, readJson } from "../_lib/http.js";
import { getOriginalArtwork, isOriginalArtworkCountryAllowed, quoteOriginalArtwork } from "../_lib/original-artworks.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    const { productId, countryCode } = await readJson(context.request);
    const product = getOriginalArtwork(productId);
    const country = String(countryCode || "").toUpperCase();

    if (!product) return json({ error: "This artwork is not currently available." }, 404);
    if (!isCheckoutOperational(context.env)) return json({ error: "Artwork checkout is temporarily unavailable." }, 409);
    if (!isOriginalArtworkCountryAllowed(country)) {
      return json({ error: "Delivery is currently unavailable for that destination." }, 400);
    }

    const inventory = await getArtworkInventoryStatus(context.env, product.id);
    if (inventory.code === "sold") return json({ error: "This original artwork has been sold." }, 409);
    if (inventory.code === "reserved") return json({ error: "This original artwork is temporarily reserved." }, 409);

    return json(quoteOriginalArtwork(product, country));
  } catch (error) {
    return json({ error: publicError(error, "A delivery quote could not be calculated. Please try again.") }, 502);
  }
}
