import { json, methodNotAllowed, readJson } from "../_lib/http.js";
import { isAllowedAnalyticsEvent, sanitizeAnalyticsDetails, writeAnalyticsEvent } from "../_lib/analytics.js";

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");

  const requestOrigin = new URL(context.request.url).origin;
  const origin = context.request.headers.get("origin");
  const fetchSite = context.request.headers.get("sec-fetch-site");
  if ((origin && origin !== requestOrigin) || (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite))) {
    return json({ accepted: false }, 403);
  }

  try {
    const payload = await readJson(context.request, 2_048);
    if (!isAllowedAnalyticsEvent(payload.event)) return json({ accepted: false }, 400);
    const details = sanitizeAnalyticsDetails(payload);
    const accepted = writeAnalyticsEvent(context.env, payload.event, details);
    return json({ accepted }, accepted ? 202 : 200);
  } catch {
    return json({ accepted: false }, 400);
  }
}
