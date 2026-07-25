import { requireOriginalWorksAdmin } from "../../../_lib/cloudflare-access.js";
import { saveOriginalArtworkPacking } from "../../../_lib/original-artwork-fulfilment.js";
import { assertSameOrigin, json, methodNotAllowed, publicError, readJson } from "../../../_lib/http.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    const admin = await requireOriginalWorksAdmin(context.request, context.env);
    const body = await readJson(context.request);
    const record = await saveOriginalArtworkPacking(context.env, {
      fulfilmentId: body.fulfilmentId,
      lengthCm: body.lengthCm,
      widthCm: body.widthCm,
      heightCm: body.heightCm,
      weightKg: body.weightKg,
      packingNotes: body.packingNotes,
      addressReviewed: body.addressReviewed,
      actorEmail: admin.email,
    });
    return json({ saved: true, record });
  } catch (error) {
    return json({ error: publicError(error, "Packing details could not be saved.") }, 400);
  }
}
