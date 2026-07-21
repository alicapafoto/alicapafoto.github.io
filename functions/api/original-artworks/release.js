import { releaseOriginalArtworkReservation } from "../../_lib/original-artworks.js";
import { assertSameOrigin, json, methodNotAllowed, publicError, readJson } from "../../_lib/http.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    const { artworkId, reservationId, reservationToken } = await readJson(context.request);
    const result = await releaseOriginalArtworkReservation(context.env, {
      artworkId,
      reservationId,
      reservationToken,
    });
    if (!result.released) return json({ error: "The reservation is no longer active." }, 409);
    return json({ released: true });
  } catch (error) {
    return json({ error: publicError(error, "The reservation could not be released.") }, 503);
  }
}
