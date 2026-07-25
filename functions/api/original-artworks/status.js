import { listOriginalArtworkAvailabilityForCheckout } from "../../_lib/original-artwork-checkout.js";
import { isOriginalWorksAcquisitionEnabled } from "../../_lib/original-artworks.js";
import { isOriginalArtworkQuoteSigningConfigured } from "../../_lib/original-artwork-quote-token.js";
import { isOriginalArtworkShippingConfigured } from "../../_lib/original-artwork-shipping.js";
import { COUNTRIES } from "../../_lib/products.js";
import { isCheckoutOperational, json, methodNotAllowed, publicError } from "../../_lib/http.js";

function publicStatus(row, checkoutReady) {
  if (row.status === "sold") {
    return { code: "sold", label: "Sold", reservable: false };
  }
  if (row.status === "reserved") {
    return { code: "unavailable", label: "Currently unavailable", reservable: false };
  }
  if (!checkoutReady || row.status === "unavailable") {
    return { code: "opening-soon", label: "Acquisition opening soon", reservable: false };
  }
  return { code: "available", label: "Acquire this artwork", reservable: true };
}

export async function onRequest(context) {
  if (context.request.method !== "GET") return methodNotAllowed("GET");
  try {
    const acquisitionEnabled = isOriginalWorksAcquisitionEnabled(context.env);
    const shippingConfigured = isOriginalArtworkShippingConfigured(context.env);
    const quoteSigningConfigured = isOriginalArtworkQuoteSigningConfigured(context.env);
    const checkoutReady = Boolean(
      acquisitionEnabled
      && shippingConfigured
      && quoteSigningConfigured
      && isCheckoutOperational(context.env)
    );
    const rows = await listOriginalArtworkAvailabilityForCheckout(context.env);
    return json({
      currency: "EUR",
      reservationMinutes: 30,
      acquisitionEnabled,
      shippingConfigured,
      quoteSigningConfigured,
      checkoutReady,
      artworks: rows.map((row) => ({
        id: row.artwork_id,
        title: row.title,
        priceCents: row.price_cents,
        declaredValueCents: row.declared_value_cents,
        status: publicStatus(row, checkoutReady),
      })),
      countries: COUNTRIES.map(([code, name]) => ({ code, name })),
    });
  } catch (error) {
    return json({ error: publicError(error, "Original artwork availability is temporarily unavailable.") }, 503);
  }
}
