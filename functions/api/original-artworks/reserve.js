import {
  isOriginalWorksAcquisitionEnabled,
  reserveOriginalArtwork,
} from "../../_lib/original-artworks.js";
import { assertSameOrigin, json, methodNotAllowed, publicError, readJson } from "../../_lib/http.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    if (!isOriginalWorksAcquisitionEnabled(context.env)) {
      return json({ error: "Original artwork acquisition is not open yet." }, 409);
    }

    const { artworkId } = await readJson(context.request);
    const reservation = await reserveOriginalArtwork(context.env, artworkId);
    if (!reservation.acquired) {
      const sold = reservation.reason === "sold";
      return json({
        error: sold ? "This artwork has been sold." : "This artwork is currently unavailable.",
        status: sold ? "sold" : "unavailable",
      }, sold ? 410 : 409);
    }

    return json({
      artwork: {
        id: reservation.artwork.id,
        title: reservation.artwork.title,
        priceCents: reservation.artwork.priceCents,
        declaredValueCents: reservation.artwork.declaredValueCents,
      },
      reservationId: reservation.reservationId,
      reservationToken: reservation.reservationToken,
      reservedUntil: reservation.reservedUntil,
      reservationMinutes: 30,
    }, 201);
  } catch (error) {
    return json({ error: publicError(error, "The artwork could not be reserved. Please try again.") }, 503);
  }
}
