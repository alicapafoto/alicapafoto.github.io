import { json, methodNotAllowed, publicError } from "../../_lib/http.js";
import { retrieveCheckoutSession } from "../../_lib/stripe.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed("GET");
  try {
    const sessionId = new URL(context.request.url).searchParams.get("session_id") || "";
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      return json({ confirmed: false, error: "The payment confirmation could not be verified." }, 400);
    }

    const session = await retrieveCheckoutSession(context.env, sessionId);
    const metadata = session.metadata || {};
    const confirmed = Boolean(
      session.payment_status === "paid"
      && metadata.order_type === "original-artwork"
      && metadata.artwork_id
      && metadata.reservation_id
    );
    if (!confirmed) {
      return json({ confirmed: false, error: "The artwork payment is not confirmed." }, 409);
    }

    return json({
      confirmed: true,
      artwork: {
        id: metadata.artwork_id,
        title: metadata.artwork || "Original artwork",
      },
      sessionId: session.id,
    });
  } catch (error) {
    return json({ confirmed: false, error: publicError(error, "The payment confirmation could not be verified.") }, 503);
  }
}
