import { requireOriginalWorksAdmin } from "../../../_lib/cloudflare-access.js";
import { markOriginalArtworkReadyForLabel } from "../../../_lib/original-artwork-fulfilment.js";
import { assertSameOrigin, json, methodNotAllowed, publicError, readJson } from "../../../_lib/http.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  try {
    assertSameOrigin(context.request, context.env);
    const admin = await requireOriginalWorksAdmin(context.request, context.env);
    const body = await readJson(context.request);
    const record = await markOriginalArtworkReadyForLabel(context.env, {
      fulfilmentId: body.fulfilmentId,
      actorEmail: admin.email,
    });
    return json({ ready: true, record });
  } catch (error) {
    return json({ error: publicError(error, "The shipment is not ready for label creation.") }, 409);
  }
}
