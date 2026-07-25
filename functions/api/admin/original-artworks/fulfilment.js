import { requireOriginalWorksAdmin } from "../../../_lib/cloudflare-access.js";
import {
  getOriginalArtworkFulfilment,
  getOriginalWorksSenderConfiguration,
  listOriginalArtworkFulfilmentEvents,
  listOriginalArtworkFulfilments,
} from "../../../_lib/original-artwork-fulfilment.js";
import { json, methodNotAllowed, publicError } from "../../../_lib/http.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed("GET");
  try {
    const admin = await requireOriginalWorksAdmin(context.request, context.env);
    const url = new URL(context.request.url);
    const fulfilmentId = String(url.searchParams.get("fulfilmentId") || "").trim();
    const sender = getOriginalWorksSenderConfiguration(context.env);

    if (fulfilmentId) {
      const record = await getOriginalArtworkFulfilment(context.env, fulfilmentId);
      if (!record) return json({ error: "The fulfilment record could not be found." }, 404);
      const events = await listOriginalArtworkFulfilmentEvents(context.env, fulfilmentId);
      return json({
        adminEmail: admin.email,
        senderConfigured: sender.configured,
        record,
        events,
      });
    }

    return json({
      adminEmail: admin.email,
      senderConfigured: sender.configured,
      records: await listOriginalArtworkFulfilments(context.env),
    });
  } catch (error) {
    return json({ error: publicError(error, "Private fulfilment access was denied.") }, 403);
  }
}
