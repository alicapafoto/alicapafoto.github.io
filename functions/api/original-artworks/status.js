import {
  isOriginalWorksAcquisitionEnabled,
  listOriginalArtworkAvailability,
} from "../../_lib/original-artworks.js";
import { json, methodNotAllowed, publicError } from "../../_lib/http.js";

function publicStatus(row, acquisitionEnabled) {
  if (!acquisitionEnabled || row.status === "unavailable") {
    return { code: "opening-soon", label: "Acquisition opening soon", reservable: false };
  }
  if (row.status === "available") {
    return { code: "available", label: "Acquire this artwork", reservable: true };
  }
  if (row.status === "reserved") {
    return { code: "unavailable", label: "Currently unavailable", reservable: false };
  }
  return { code: "sold", label: "Sold", reservable: false };
}

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed("GET");
  try {
    const acquisitionEnabled = isOriginalWorksAcquisitionEnabled(context.env);
    const rows = await listOriginalArtworkAvailability(context.env);
    return json({
      currency: "EUR",
      reservationMinutes: 30,
      acquisitionEnabled,
      artworks: rows.map((row) => ({
        id: row.artwork_id,
        title: row.title,
        priceCents: row.price_cents,
        declaredValueCents: row.declared_value_cents,
        status: publicStatus(row, acquisitionEnabled),
      })),
    });
  } catch (error) {
    return json({ error: publicError(error, "Original artwork availability is temporarily unavailable.") }, 503);
  }
}
