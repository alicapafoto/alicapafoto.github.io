import {
  attachArtworkCheckoutSession,
  releaseArtworkReservation,
  reserveArtwork,
} from "../_lib/artwork-inventory.js";
import { createOriginalArtworkCheckoutSession } from "../_lib/artwork-stripe.js";
import {
  assertCheckoutOperational,
  assertSameOrigin,
  getSiteOrigin,
  json,
  methodNotAllowed,
  publicError,
  readJson,
} from "../_lib/http.js";
import { getOriginalArtwork, isOriginalArtworkCountryAllowed, quoteOriginalArtwork } from "../_lib/original-artworks.js";

function validReservationToken(value) {
  const token = String(value || "");
  return /^[a-f0-9-]{20,80}$/i.test(token) ? token : crypto.randomUUID();
}

function checkoutIdempotencyKey(reservationToken, productId, countryCode) {
  return `ali-capa-artwork:${reservationToken}:${productId}:${countryCode}`;
}

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");

  let reservation = null;
  let sessionCreated = false;
  try {
    assertSameOrigin(context.request, context.env);
    assertCheckoutOperational(context.env);

    const { productId, countryCode, reservationToken } = await readJson(context.request);
    const product = getOriginalArtwork(productId);
    const country = String(countryCode || "").toUpperCase();
    const token = validReservationToken(reservationToken);

    if (!product) return json({ error: "This artwork is not currently available." }, 404);
    if (!isOriginalArtworkCountryAllowed(country)) {
      return json({ error: "Delivery is currently unavailable for that destination." }, 400);
    }

    reservation = { productId: product.id, reservationToken: token };
    const hold = await reserveArtwork(context.env, reservation);
    if (!hold.acquired) {
      const message = hold.code === "sold"
        ? "This original artwork has been sold."
        : "This original artwork is temporarily reserved by another collector.";
      return json({ error: message }, 409);
    }

    const quote = quoteOriginalArtwork(product, country);
    const session = await createOriginalArtworkCheckoutSession({
      env: context.env,
      siteOrigin: getSiteOrigin(context.request, context.env),
      product,
      countryCode: country,
      quote,
      reservationToken: token,
      idempotencyKey: checkoutIdempotencyKey(token, product.id, country),
    });
    sessionCreated = true;

    await attachArtworkCheckoutSession(context.env, {
      ...reservation,
      sessionId: session.id,
    });

    return json({
      url: session.url,
      sessionId: session.id,
      reservationToken: token,
      reservationExpiresAt: hold.expiresAt,
      currency: "EUR",
      priceCents: quote.priceCents,
      shippingCents: quote.shippingCents,
      totalCents: quote.totalCents,
      shippingMethod: quote.shippingMethod,
      estimateNote: quote.estimateNote,
    });
  } catch (error) {
    if (reservation && !sessionCreated) {
      try {
        await releaseArtworkReservation(context.env, reservation);
      } catch (releaseError) {
        console.error("Artwork reservation could not be released", releaseError);
      }
    }
    return json({ error: publicError(error, "Secure artwork checkout could not be started. Please try again.") }, 502);
  }
}
