import { findOriginalArtwork } from "../../catalog/original-artworks.js";
import {
  ORIGINAL_ARTWORK_RESERVATION_MS,
  ensureOriginalArtworkSchema,
  markOriginalArtworkSold,
} from "./original-artworks.js";

function requireDatabase(env = {}) {
  if (!env.ORDER_LEDGER) throw new Error("ORDER_LEDGER database is not configured");
  return env.ORDER_LEDGER;
}

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(token || "")));
  return bytesToHex(new Uint8Array(digest));
}

function createReservationToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function normalizeCheckoutAttemptId(value) {
  const attemptId = String(value || "").trim();
  if (!/^[a-f0-9-]{20,80}$/i.test(attemptId)) throw new Error("Invalid checkout attempt.");
  return attemptId;
}

export async function ensureOriginalArtworkCheckoutSchema(env = {}) {
  const db = await ensureOriginalArtworkSchema(env);
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS original_artwork_checkout_attempts (
      checkout_attempt_id TEXT PRIMARY KEY,
      artwork_id TEXT NOT NULL,
      reservation_id TEXT UNIQUE,
      checkout_session_id TEXT UNIQUE,
      checkout_url TEXT,
      checkout_expires_at INTEGER,
      status TEXT NOT NULL CHECK (status IN ('reserving', 'checkout-created', 'completed', 'expired', 'released', 'failed')),
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (artwork_id) REFERENCES original_artworks(artwork_id),
      FOREIGN KEY (reservation_id) REFERENCES original_artwork_reservations(reservation_id)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS original_artwork_checkout_attempts_status_idx ON original_artwork_checkout_attempts(status, checkout_expires_at)"),
  ]);
  return db;
}

export async function releaseExpiredPreCheckoutReservations(env = {}, now = Date.now()) {
  const db = await ensureOriginalArtworkCheckoutSchema(env);
  const timestamp = nowIso(now);
  await db.batch([
    db.prepare(`
      UPDATE original_artwork_reservations
      SET status = 'expired', updated_at = ?
      WHERE status = 'active' AND reserved_until <= ?
    `).bind(timestamp, now),
    db.prepare(`
      UPDATE original_artworks
      SET status = 'available', reservation_id = NULL, reservation_token_hash = NULL,
          reserved_until = NULL, checkout_session_id = NULL, updated_at = ?
      WHERE status = 'reserved'
        AND reservation_id IN (
          SELECT reservation_id FROM original_artwork_reservations
          WHERE status = 'expired' AND reserved_until <= ?
        )
    `).bind(timestamp, now),
    db.prepare(`
      UPDATE original_artwork_checkout_attempts
      SET status = 'expired', updated_at = ?
      WHERE status = 'reserving' AND checkout_expires_at <= ?
    `).bind(timestamp, now),
  ]);
}

export async function listOriginalArtworkAvailabilityForCheckout(env = {}) {
  const db = await ensureOriginalArtworkCheckoutSchema(env);
  await releaseExpiredPreCheckoutReservations(env);
  const result = await db.prepare(`
    SELECT artwork_id, title, price_cents, declared_value_cents, currency,
           package_length_cm, package_width_cm, package_height_cm, package_weight_kg,
           status, reserved_until, sold_at
    FROM original_artworks
    ORDER BY CASE artwork_id
      WHEN 'dusaemas' THEN 1
      WHEN 'gold' THEN 2
      WHEN 'study' THEN 3
      WHEN 'untitled' THEN 4
      ELSE 99 END
  `).all();
  return result.results || [];
}

export async function getOriginalArtworkCheckoutAttempt(env = {}, checkoutAttemptId) {
  const db = await ensureOriginalArtworkCheckoutSchema(env);
  return db.prepare(`
    SELECT checkout_attempt_id, artwork_id, reservation_id, checkout_session_id,
           checkout_url, checkout_expires_at, status, last_error
    FROM original_artwork_checkout_attempts
    WHERE checkout_attempt_id = ?
  `).bind(normalizeCheckoutAttemptId(checkoutAttemptId)).first();
}

export async function reserveOriginalArtworkForCheckout(env = {}, {
  artworkId,
  checkoutAttemptId,
  now = Date.now(),
} = {}) {
  const artwork = findOriginalArtwork(artworkId);
  if (!artwork) return { acquired: false, reason: "not-found" };
  const attemptId = normalizeCheckoutAttemptId(checkoutAttemptId);
  const db = await ensureOriginalArtworkCheckoutSchema(env);
  await releaseExpiredPreCheckoutReservations(env, now);

  const existingAttempt = await db.prepare(`
    SELECT checkout_attempt_id, artwork_id, reservation_id, checkout_session_id,
           checkout_url, checkout_expires_at, status
    FROM original_artwork_checkout_attempts WHERE checkout_attempt_id = ?
  `).bind(attemptId).first();
  if (existingAttempt) {
    if (existingAttempt.artwork_id !== artwork.id) return { acquired: false, reason: "attempt-conflict" };
    return { acquired: false, reason: "duplicate-attempt", attempt: existingAttempt };
  }

  const reservationId = `owr_${crypto.randomUUID()}`;
  const token = createReservationToken();
  const tokenHash = await hashToken(token);
  const reservedUntil = now + ORIGINAL_ARTWORK_RESERVATION_MS;
  const timestamp = nowIso(now);

  const results = await db.batch([
    db.prepare(`
      UPDATE original_artworks
      SET status = 'reserved', reservation_id = ?, reservation_token_hash = ?,
          reserved_until = ?, checkout_session_id = NULL, updated_at = ?
      WHERE artwork_id = ? AND status = 'available'
    `).bind(reservationId, tokenHash, reservedUntil, timestamp, artwork.id),
    db.prepare(`
      INSERT INTO original_artwork_reservations (
        reservation_id, artwork_id, token_hash, status, reserved_until, created_at, updated_at
      )
      SELECT ?, ?, ?, 'active', ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM original_artworks
        WHERE artwork_id = ? AND reservation_id = ? AND status = 'reserved'
      )
    `).bind(reservationId, artwork.id, tokenHash, reservedUntil, timestamp, timestamp, artwork.id, reservationId),
    db.prepare(`
      INSERT INTO original_artwork_checkout_attempts (
        checkout_attempt_id, artwork_id, reservation_id, checkout_expires_at,
        status, created_at, updated_at
      )
      SELECT ?, ?, ?, ?, 'reserving', ?, ?
      WHERE EXISTS (
        SELECT 1 FROM original_artworks
        WHERE artwork_id = ? AND reservation_id = ? AND status = 'reserved'
      )
    `).bind(attemptId, artwork.id, reservationId, reservedUntil, timestamp, timestamp, artwork.id, reservationId),
    db.prepare(`
      INSERT INTO original_artwork_events (
        artwork_id, reservation_id, event_type, event_json, created_at
      )
      SELECT ?, ?, 'reserved-for-checkout', ?, ?
      WHERE EXISTS (
        SELECT 1 FROM original_artworks
        WHERE artwork_id = ? AND reservation_id = ? AND status = 'reserved'
      )
    `).bind(artwork.id, reservationId, JSON.stringify({ reservedUntil, checkoutAttemptId: attemptId }), timestamp, artwork.id, reservationId),
  ]);

  if (Number(results[0]?.meta?.changes || 0) !== 1) {
    const current = await db.prepare("SELECT status, reserved_until, sold_at FROM original_artworks WHERE artwork_id = ?")
      .bind(artwork.id).first();
    return {
      acquired: false,
      reason: current?.status || "unavailable",
      reservedUntil: current?.reserved_until || null,
      soldAt: current?.sold_at || null,
    };
  }

  return {
    acquired: true,
    artwork,
    checkoutAttemptId: attemptId,
    reservationId,
    reservationToken: token,
    reservedUntil,
  };
}

export async function saveOriginalArtworkCheckoutQuote(env = {}, {
  artworkId,
  reservationId,
  reservationToken,
  shippingAddress,
  quote,
  now = Date.now(),
} = {}) {
  const context = await validateOriginalArtworkCheckoutReservation(env, {
    artworkId,
    reservationId,
    reservationToken,
    now,
  });
  if (!context.valid) return { saved: false, reason: "invalid-reservation" };
  const db = requireDatabase(env);
  const timestamp = nowIso(now);
  const payload = JSON.stringify({ shippingAddress, quote });
  const result = await db.prepare(`
    UPDATE original_artwork_reservations
    SET destination_country = ?, shipping_quote_json = ?, updated_at = ?
    WHERE reservation_id = ? AND artwork_id = ?
      AND status = 'active' AND reserved_until > ?
  `).bind(
    shippingAddress.countryCode,
    payload,
    timestamp,
    reservationId,
    String(artworkId || "").toLowerCase(),
    now,
  ).run();
  return { saved: Number(result.meta?.changes || 0) === 1 };
}

export async function validateOriginalArtworkCheckoutReservation(env = {}, {
  artworkId,
  reservationId,
  reservationToken,
  now = Date.now(),
  allowExpiredCheckout = false,
} = {}) {
  const db = await ensureOriginalArtworkCheckoutSchema(env);
  await releaseExpiredPreCheckoutReservations(env, now);
  const tokenHash = await hashToken(reservationToken);
  const row = await db.prepare(`
    SELECT a.artwork_id, a.title, a.price_cents, a.declared_value_cents, a.currency,
           a.package_length_cm, a.package_width_cm, a.package_height_cm, a.package_weight_kg,
           a.status, a.reservation_id, a.reservation_token_hash, a.reserved_until,
           a.checkout_session_id, a.sold_at,
           r.status AS reservation_status, r.shipping_quote_json,
           t.checkout_attempt_id, t.checkout_url, t.checkout_expires_at
    FROM original_artworks a
    LEFT JOIN original_artwork_reservations r ON r.reservation_id = a.reservation_id
    LEFT JOIN original_artwork_checkout_attempts t ON t.reservation_id = a.reservation_id
    WHERE a.artwork_id = ?
  `).bind(String(artworkId || "").toLowerCase()).first();
  const activeStatus = row?.reservation_status === "active" || row?.reservation_status === "checkout-created";
  const withinTime = Number(row?.reserved_until || 0) > now || (allowExpiredCheckout && row?.reservation_status === "checkout-created");
  const valid = Boolean(
    row
    && row.status === "reserved"
    && row.reservation_id === reservationId
    && row.reservation_token_hash === tokenHash
    && activeStatus
    && withinTime
  );
  return { valid, row };
}

export async function attachOriginalArtworkCheckoutSession(env = {}, {
  artworkId,
  reservationId,
  reservationToken,
  checkoutSessionId,
  checkoutUrl,
  checkoutExpiresAt,
  now = Date.now(),
} = {}) {
  const validation = await validateOriginalArtworkCheckoutReservation(env, {
    artworkId,
    reservationId,
    reservationToken,
    now,
  });
  if (!validation.valid) return { attached: false, reason: "invalid-reservation" };
  const db = requireDatabase(env);
  const id = String(artworkId || "").toLowerCase();
  const expiresAtMs = Number(checkoutExpiresAt) * 1000;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) return { attached: false, reason: "invalid-expiry" };
  const timestamp = nowIso(now);
  const results = await db.batch([
    db.prepare(`
      UPDATE original_artwork_reservations
      SET status = 'checkout-created', checkout_session_id = ?, reserved_until = ?, updated_at = ?
      WHERE reservation_id = ? AND artwork_id = ?
        AND status = 'active' AND reserved_until > ?
    `).bind(checkoutSessionId, expiresAtMs, timestamp, reservationId, id, now),
    db.prepare(`
      UPDATE original_artworks
      SET checkout_session_id = ?, reserved_until = ?, updated_at = ?
      WHERE artwork_id = ? AND reservation_id = ? AND status = 'reserved'
    `).bind(checkoutSessionId, expiresAtMs, timestamp, id, reservationId),
    db.prepare(`
      UPDATE original_artwork_checkout_attempts
      SET status = 'checkout-created', checkout_session_id = ?, checkout_url = ?,
          checkout_expires_at = ?, updated_at = ?
      WHERE reservation_id = ? AND artwork_id = ? AND status = 'reserving'
    `).bind(checkoutSessionId, checkoutUrl, expiresAtMs, timestamp, reservationId, id),
  ]);
  return { attached: results.every((result) => Number(result.meta?.changes || 0) === 1), reservedUntil: expiresAtMs };
}

export async function failOriginalArtworkCheckout(env = {}, {
  artworkId,
  reservationId,
  error,
  now = Date.now(),
} = {}) {
  const db = await ensureOriginalArtworkCheckoutSchema(env);
  const id = String(artworkId || "").toLowerCase();
  const timestamp = nowIso(now);
  const message = String(error?.message || error || "Checkout creation failed").slice(0, 500);
  await db.batch([
    db.prepare(`
      UPDATE original_artworks
      SET status = 'available', reservation_id = NULL, reservation_token_hash = NULL,
          reserved_until = NULL, checkout_session_id = NULL, updated_at = ?
      WHERE artwork_id = ? AND reservation_id = ? AND status = 'reserved'
    `).bind(timestamp, id, reservationId),
    db.prepare(`
      UPDATE original_artwork_reservations
      SET status = 'failed', last_error = ?, updated_at = ?
      WHERE reservation_id = ? AND artwork_id = ?
        AND status IN ('active', 'checkout-created')
    `).bind(message, timestamp, reservationId, id),
    db.prepare(`
      UPDATE original_artwork_checkout_attempts
      SET status = 'failed', last_error = ?, updated_at = ?
      WHERE reservation_id = ? AND artwork_id = ?
        AND status IN ('reserving', 'checkout-created')
    `).bind(message, timestamp, reservationId, id),
    db.prepare(`
      INSERT INTO original_artwork_events (
        artwork_id, reservation_id, event_type, event_json, created_at
      ) VALUES (?, ?, 'checkout-failed', ?, ?)
    `).bind(id, reservationId, JSON.stringify({ error: message }), timestamp),
  ]);
}

export async function releaseOriginalArtworkCheckoutWithToken(env = {}, {
  artworkId,
  reservationId,
  reservationToken,
  now = Date.now(),
} = {}) {
  const validation = await validateOriginalArtworkCheckoutReservation(env, {
    artworkId,
    reservationId,
    reservationToken,
    now,
    allowExpiredCheckout: true,
  });
  if (!validation.valid) return { released: false, reason: "invalid-reservation" };
  const db = requireDatabase(env);
  const id = String(artworkId || "").toLowerCase();
  const timestamp = nowIso(now);
  const results = await db.batch([
    db.prepare(`
      UPDATE original_artworks
      SET status = 'available', reservation_id = NULL, reservation_token_hash = NULL,
          reserved_until = NULL, checkout_session_id = NULL, updated_at = ?
      WHERE artwork_id = ? AND reservation_id = ? AND status = 'reserved'
    `).bind(timestamp, id, reservationId),
    db.prepare(`
      UPDATE original_artwork_reservations
      SET status = 'released', updated_at = ?
      WHERE reservation_id = ? AND artwork_id = ?
        AND status IN ('active', 'checkout-created')
    `).bind(timestamp, reservationId, id),
    db.prepare(`
      UPDATE original_artwork_checkout_attempts
      SET status = 'released', updated_at = ?
      WHERE reservation_id = ? AND artwork_id = ?
        AND status IN ('reserving', 'checkout-created')
    `).bind(timestamp, reservationId, id),
    db.prepare(`
      INSERT INTO original_artwork_events (
        artwork_id, reservation_id, event_type, event_json, created_at
      ) VALUES (?, ?, 'released', '{}', ?)
    `).bind(id, reservationId, timestamp),
  ]);
  return {
    released: Number(results[0]?.meta?.changes || 0) === 1,
    checkoutSessionId: validation.row.checkout_session_id || "",
  };
}

export async function releaseOriginalArtworkCheckoutBySession(env = {}, {
  artworkId,
  reservationId,
  checkoutSessionId,
  now = Date.now(),
} = {}) {
  const db = await ensureOriginalArtworkCheckoutSchema(env);
  const id = String(artworkId || "").toLowerCase();
  const timestamp = nowIso(now);
  const results = await db.batch([
    db.prepare(`
      UPDATE original_artworks
      SET status = 'available', reservation_id = NULL, reservation_token_hash = NULL,
          reserved_until = NULL, checkout_session_id = NULL, updated_at = ?
      WHERE artwork_id = ? AND reservation_id = ? AND checkout_session_id = ? AND status = 'reserved'
    `).bind(timestamp, id, reservationId, checkoutSessionId),
    db.prepare(`
      UPDATE original_artwork_reservations
      SET status = 'expired', updated_at = ?
      WHERE reservation_id = ? AND artwork_id = ? AND checkout_session_id = ?
        AND status = 'checkout-created'
    `).bind(timestamp, reservationId, id, checkoutSessionId),
    db.prepare(`
      UPDATE original_artwork_checkout_attempts
      SET status = 'expired', updated_at = ?
      WHERE reservation_id = ? AND artwork_id = ? AND checkout_session_id = ?
        AND status = 'checkout-created'
    `).bind(timestamp, reservationId, id, checkoutSessionId),
    db.prepare(`
      INSERT INTO original_artwork_events (
        artwork_id, reservation_id, event_type, event_json, created_at
      ) VALUES (?, ?, 'checkout-expired', ?, ?)
    `).bind(id, reservationId, JSON.stringify({ checkoutSessionId }), timestamp),
  ]);
  return { released: Number(results[0]?.meta?.changes || 0) === 1 };
}

export async function getOriginalArtworkOrderContext(env = {}, {
  artworkId,
  reservationId,
  checkoutSessionId,
} = {}) {
  const db = await ensureOriginalArtworkCheckoutSchema(env);
  const row = await db.prepare(`
    SELECT a.artwork_id, a.title, a.price_cents, a.declared_value_cents,
           a.package_length_cm, a.package_width_cm, a.package_height_cm, a.package_weight_kg,
           a.status AS artwork_status, a.reservation_id, a.checkout_session_id,
           r.status AS reservation_status, r.shipping_quote_json
    FROM original_artworks a
    JOIN original_artwork_reservations r ON r.reservation_id = a.reservation_id
    WHERE a.artwork_id = ? AND a.reservation_id = ? AND a.checkout_session_id = ?
  `).bind(String(artworkId || "").toLowerCase(), reservationId, checkoutSessionId).first();
  if (!row) return null;
  let delivery = {};
  try { delivery = JSON.parse(row.shipping_quote_json || "{}"); } catch { delivery = {}; }
  return { ...row, shippingAddress: delivery.shippingAddress || {}, quote: delivery.quote || {} };
}

export async function markOriginalArtworkCheckoutSold(env = {}, details = {}) {
  const result = await markOriginalArtworkSold(env, details);
  if (!result.sold) return result;
  const db = requireDatabase(env);
  const timestamp = nowIso(details.now || Date.now());
  await db.prepare(`
    UPDATE original_artwork_checkout_attempts
    SET status = 'completed', updated_at = ?
    WHERE reservation_id = ? AND artwork_id = ? AND checkout_session_id = ?
      AND status IN ('reserving', 'checkout-created', 'completed')
  `).bind(
    timestamp,
    details.reservationId,
    String(details.artworkId || "").toLowerCase(),
    details.checkoutSessionId,
  ).run();
  return result;
}
