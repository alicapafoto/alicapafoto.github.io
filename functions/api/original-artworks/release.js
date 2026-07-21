import {
  releaseOriginalArtworkCheckoutWithToken,
  validateOriginalArtworkCheckoutReservation,
} from "../../_lib/original-artwork-checkout.js";
import { assertSameOrigin, json, methodNotAllowed, publicError, readJson } from "../../_lib/http.js";
import { expireCheckoutSession } from "../../_lib/stripe.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    const { artworkId, reservationId, reservationToken } = await readJson(context.request);
    const validation = await validateOriginalArtworkCheckoutReservation(context.env, {
      artworkId,
      reservationId,
      reservationToken,
      allowExpiredCheckout: true,
    });
    if (!validation.valid) return json({ error: "The reservation is no longer active." }, 409);

    if (validation.row.checkout_session_id) {
      await expireCheckoutSession(context.env, validation.row.checkout_session_id);
    }

    const result = await releaseOriginalArtworkCheckoutWithToken(context.env, {
      artworkId,
      reservationId,
      reservationToken,
    });
    if (!result.released) return json({ error: "The reservation is no longer active." }, 409);
    return json({ released: true });
  } catch (error) {
    return json({ error: publicError(error, "The reservation could not be released safely.") }, 503);
  }
}
