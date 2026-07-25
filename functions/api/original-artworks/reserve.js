import { json, methodNotAllowed } from "../../_lib/http.js";

export function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  return json({
    error: "Standalone reservations are disabled. Obtain an insured delivery quote before creating checkout.",
  }, 410);
}
