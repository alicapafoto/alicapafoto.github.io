import { findOriginalArtwork } from "../../../catalog/original-artworks.js";
import { isOriginalWorksAcquisitionEnabled } from "../../_lib/original-artworks.js";
import {
  isOriginalArtworkShippingConfigured,
  normalizeOriginalArtworkShippingAddress,
  quoteOriginalArtworkShipping,
} from "../../_lib/original-artwork-shipping.js";
import { assertSameOrigin, json, methodNotAllowed, publicError, readJson } from "../../_lib/http.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    if (!isOriginalWorksAcquisitionEnabled(context.env)) {
      return json({ error: "Original artwork acquisition is not open yet." }, 409);
    }
    if (!isOriginalArtworkShippingConfigured(context.env)) {
      return json({ error: "Insured delivery is still being prepared." }, 409);
    }

    const { artworkId, shippingAddress } = await readJson(context.request);
    const artwork = findOriginalArtwork(artworkId);
    if (!artwork) return json({ error: "The artwork could not be found." }, 404);
    const normalizedAddress = normalizeOriginalArtworkShippingAddress(shippingAddress);
    const quote = await quoteOriginalArtworkShipping({
      artwork,
      shippingAddress: normalizedAddress,
      env: context.env,
    });

    return json({
      artwork: {
        id: artwork.id,
        title: artwork.title,
        priceCents: artwork.priceCents,
        declaredValueCents: artwork.declaredValueCents,
      },
      shippingAddress: normalizedAddress,
      shipping: quote,
      totalCents: artwork.priceCents + quote.customerCents,
    });
  } catch (error) {
    return json({ error: publicError(error, "An insured delivery quote could not be calculated.") }, 400);
  }
}
