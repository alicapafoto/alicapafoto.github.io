import { findOriginalArtwork } from "../../../catalog/original-artworks.js";
import {
  attachOriginalArtworkCheckoutSession,
  failOriginalArtworkCheckout,
  getOriginalArtworkCheckoutAttempt,
  normalizeCheckoutAttemptId,
  reserveOriginalArtworkForCheckout,
  saveOriginalArtworkCheckoutQuote,
} from "../../_lib/original-artwork-checkout.js";
import { isOriginalWorksAcquisitionEnabled } from "../../_lib/original-artworks.js";
import {
  isOriginalArtworkShippingConfigured,
  normalizeOriginalArtworkShippingAddress,
  quoteOriginalArtworkShipping,
} from "../../_lib/original-artwork-shipping.js";
import {
  assertCheckoutOperational,
  assertSameOrigin,
  getSiteOrigin,
  json,
  methodNotAllowed,
  publicError,
  readJson,
} from "../../_lib/http.js";
import { createOriginalArtworkCheckoutSession, expireCheckoutSession } from "../../_lib/stripe.js";

function checkoutIdempotencyKey(checkoutAttemptId, artworkId) {
  return `ali-capa-original:${checkoutAttemptId}:${artworkId}`;
}

function duplicateAttemptPayload(attempt) {
  if (!attempt?.checkout_url || attempt.status !== "checkout-created") return null;
  return {
    url: attempt.checkout_url,
    sessionId: attempt.checkout_session_id,
    reservationId: attempt.reservation_id,
    reservedUntil: attempt.checkout_expires_at,
    duplicate: true,
  };
}

export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  let reservation = null;
  let session = null;
  try {
    assertSameOrigin(context.request, context.env);
    assertCheckoutOperational(context.env);
    if (!isOriginalWorksAcquisitionEnabled(context.env)) {
      return json({ error: "Original artwork acquisition is not open yet." }, 409);
    }
    if (!isOriginalArtworkShippingConfigured(context.env)) {
      return json({ error: "Insured delivery is still being prepared." }, 409);
    }

    const body = await readJson(context.request);
    const artwork = findOriginalArtwork(body.artworkId);
    if (!artwork) return json({ error: "The artwork could not be found." }, 404);
    const checkoutAttemptId = normalizeCheckoutAttemptId(body.checkoutAttemptId);
    const existingAttempt = await getOriginalArtworkCheckoutAttempt(context.env, checkoutAttemptId);
    const duplicatePayload = duplicateAttemptPayload(existingAttempt);
    if (duplicatePayload) return json(duplicatePayload);
    if (existingAttempt) {
      return json({ error: "Use a new checkout attempt and try again." }, 409);
    }

    const shippingAddress = normalizeOriginalArtworkShippingAddress(body.shippingAddress);
    const shippingQuote = await quoteOriginalArtworkShipping({
      artwork,
      shippingAddress,
      env: context.env,
    });
    const expectedShippingCents = Number(body.expectedShippingCents);
    if (Number.isInteger(expectedShippingCents) && expectedShippingCents !== shippingQuote.customerCents) {
      return json({
        error: "The insured delivery total changed. Review the updated total before continuing.",
        quoteChanged: true,
        artwork: { id: artwork.id, title: artwork.title, priceCents: artwork.priceCents },
        shipping: shippingQuote,
        totalCents: artwork.priceCents + shippingQuote.customerCents,
      }, 409);
    }

    reservation = await reserveOriginalArtworkForCheckout(context.env, {
      artworkId: artwork.id,
      checkoutAttemptId,
    });
    if (!reservation.acquired) {
      if (reservation.reason === "duplicate-attempt") {
        const payload = duplicateAttemptPayload(reservation.attempt);
        if (payload) return json(payload);
      }
      const sold = reservation.reason === "sold";
      return json({
        error: sold ? "This artwork has been sold." : "This artwork is currently unavailable.",
        status: sold ? "sold" : "unavailable",
      }, sold ? 410 : 409);
    }

    const quoteSaved = await saveOriginalArtworkCheckoutQuote(context.env, {
      artworkId: artwork.id,
      reservationId: reservation.reservationId,
      reservationToken: reservation.reservationToken,
      shippingAddress,
      quote: shippingQuote,
    });
    if (!quoteSaved.saved) throw new Error("The insured delivery quote could not be attached to the reservation.");

    session = await createOriginalArtworkCheckoutSession({
      env: context.env,
      siteOrigin: getSiteOrigin(context.request, context.env),
      artwork,
      shippingAddress,
      shippingQuote,
      reservationId: reservation.reservationId,
      idempotencyKey: checkoutIdempotencyKey(checkoutAttemptId, artwork.id),
    });

    const attached = await attachOriginalArtworkCheckoutSession(context.env, {
      artworkId: artwork.id,
      reservationId: reservation.reservationId,
      reservationToken: reservation.reservationToken,
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
      checkoutExpiresAt: session.expires_at,
    });
    if (!attached.attached) throw new Error("The secure checkout could not be attached to the artwork reservation.");

    return json({
      url: session.url,
      sessionId: session.id,
      artwork: { id: artwork.id, title: artwork.title, priceCents: artwork.priceCents },
      shipping: shippingQuote,
      totalCents: artwork.priceCents + shippingQuote.customerCents,
      reservationId: reservation.reservationId,
      reservationToken: reservation.reservationToken,
      reservedUntil: attached.reservedUntil,
      reservationMinutes: 30,
    }, 201);
  } catch (error) {
    if (session?.id) {
      try { await expireCheckoutSession(context.env, session.id); } catch (expiryError) { console.error("Stripe session cleanup failed", expiryError); }
    }
    if (reservation?.acquired) {
      try {
        await failOriginalArtworkCheckout(context.env, {
          artworkId: reservation.artwork.id,
          reservationId: reservation.reservationId,
          error,
        });
      } catch (releaseError) {
        console.error("Original artwork reservation cleanup failed", releaseError);
      }
    }
    return json({ error: publicError(error, "Secure artwork checkout could not be started.") }, 502);
  }
}
