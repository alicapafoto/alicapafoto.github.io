import { requireOriginalWorksAdmin } from "../../../_lib/cloudflare-access.js";
import {
  getOriginalArtworkFulfilment,
  getOriginalWorksSenderConfiguration,
} from "../../../_lib/original-artwork-fulfilment.js";
import { assertSameOrigin, json, methodNotAllowed, publicError, readJson } from "../../../_lib/http.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    await requireOriginalWorksAdmin(context.request, context.env);
    const body = await readJson(context.request);
    const record = await getOriginalArtworkFulfilment(context.env, body.fulfilmentId);
    if (!record) return json({ error: "The fulfilment record could not be found." }, 404);
    if (record.status !== "ready-for-label") {
      return json({ error: "Packing measurements and address review must be completed first." }, 409);
    }
    if (!record.actualParcel) return json({ error: "Actual parcel measurements are missing." }, 409);
    const sender = getOriginalWorksSenderConfiguration(context.env);
    if (!sender.configured) return json({ error: "The private sender configuration is incomplete." }, 409);

    // Intentionally fail closed. The approved DHL product, credentials, quote recheck,
    // shipment purchase, label storage and tracking response must be implemented and
    // tested before this endpoint can mutate fulfilment state.
    return json({ error: "DHL shipment creation is awaiting the approved live adapter." }, 409);
  } catch (error) {
    return json({ error: publicError(error, "Private shipment creation was denied.") }, 403);
  }
}
