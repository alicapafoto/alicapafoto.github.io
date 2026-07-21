import { ORIGINAL_ARTWORK_CATALOG, findOriginalArtwork } from "../../catalog/original-artworks.js";

export const ORIGINAL_ARTWORK_RESERVATION_MS = 30 * 60 * 1000;

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

function artworkSeedStatement(db, artwork, timestamp) {
  return db.prepare(`
    INSERT OR IGNORE INTO original_artworks (
      artwork_id, title, price_cents, declared_value_cents, currency,
      package_length_cm, package_width_cm, package_height_cm, package_weight_kg,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unavailable', ?, ?)
  `).bind(
    artwork.id,
    artwork.title,
    artwork.priceCents,
    artwork.declaredValueCents,
    artwork.currency,
    artwork.parcel.lengthCm,
    artwork.parcel.widthCm,
    artwork.parcel.heightCm,
    artwork.parcel.weightKg,
    timestamp,
    timestamp,
  );
}

export function isOriginalWorksAcquisitionEnabled(env = {}) {
  return String(env.ORIGINAL_WORKS_ACQUISITION_ENABLED || "").toLowerCase() === "true";
}

export async function ensureOriginalArtworkSchema(env = {}) {
  const db = requireDatabase(env);
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS original_artworks (
      artwork_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK (price_cents > 0),
      declared_value_cents INTEGER NOT NULL CHECK (declared_value_cents > 0),
      currency TEXT NOT NULL DEFAULT 'EUR',
      package_length_cm REAL NOT NULL CHECK (package_length_cm > 0),
      package_width_cm REAL NOT NULL CHECK (package_width_cm > 0),
      package_height_cm REAL NOT NULL CHECK (package_height_cm > 0),
      package_weight_kg REAL NOT NULL CHECK (package_weight_kg > 0),
      status TEXT NOT NULL CHECK (status IN ('unavailable', 'available', 'reserved', 'sold')),
      reservation_id TEXT,
      reservation_token_hash TEXT,
      reserved_until INTEGER,
      checkout_session_id TEXT UNIQUE,
      payment_intent_id TEXT,
      sold_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS original_artworks_status_idx ON original_artworks(status, reserved_until)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS original_artwork_reservations (
      reservation_id TEXT PRIMARY KEY,
      artwork_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'checkout-created', 'completed', 'expired', 'released', 'failed')),
      reserved_until INTEGER NOT NULL,
      destination_country TEXT,
      shipping_quote_json TEXT,
      checkout_session_id TEXT UNIQUE,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (artwork_id) REFERENCES original_artworks(artwork_id)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS original_artwork_reservations_artwork_idx ON original_artwork_reservations(artwork_id, status, reserved_until)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS original_artwork_events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      artwork_id TEXT NOT NULL,
      reservation_id TEXT,
      event_type TEXT NOT NULL,
      event_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (artwork_id) REFERENCES original_artworks(artwork_id)
    )`),
  ]);

  const timestamp = nowIso();
  await db.batch(ORIGINAL_ARTWORK_CATALOG.map((artwork) => artworkSeedStatement(db, artwork, timestamp)));
  return db;
}

export async function releaseExpiredOriginalArtworkReservations(env = {}, now = Date.now()) {
  const db = await ensureOriginalArtworkSchema(env);
  const timestamp = nowIso(now);
  await db.batch([
    db.prepare(`
      UPDATE original_artwork_reservations
      SET status = 'expired', updated_at = ?
      WHERE status IN ('active', 'checkout-created') AND reserved_until <= ?
    `).bind(timestamp, now),
    db.prepare(`
      UPDATE original_artworks
      SET status = 'available', reservation_id = NULL, reservation_token_hash = NULL,
          reserved_until = NULL, updated_at = ?
      WHERE status = 'reserved' AND reserved_until <= ?
    `).bind(timestamp, now),
  ]);
}

export async function listOriginalArtworkAvailability(env = {}) {
  const db = await ensureOriginalArtworkSchema(env);
  await releaseExpiredOriginalArtworkReservations(env);
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

export async function reserveOriginalArtwork(env = {}, artworkId, now = Date.now()) {
  const artwork = findOriginalArtwork(artworkId);
  if (!artwork) return { acquired: false, reason: "not-found" };

  const db = await ensureOriginalArtworkSchema(env);
  await releaseExpiredOriginalArtworkReservations(env, now);

  const reservationId = `owr_${crypto.randomUUID()}`;
  const token = createReservationToken();
  const tokenHash = await hashToken(token);
  const reservedUntil = now + ORIGINAL_ARTWORK_RESERVATION_MS;
  const timestamp = nowIso(now);

  const update = await db.prepare(`
    UPDATE original_artworks
    SET status = 'reserved', reservation_id = ?, reservation_token_hash = ?,
        reserved_until = ?, updated_at = ?
    WHERE artwork_id = ? AND status = 'available'
  `).bind(reservationId, tokenHash, reservedUntil, timestamp, artwork.id).run();

  if (Number(update.meta?.changes || 0) !== 1) {
    const current = await db.prepare(`
      SELECT status, reserved_until, sold_at
      FROM original_artworks WHERE artwork_id = ?
    `).bind(artwork.id).first();
    return {
      acquired: false,
      reason: current?.status || "unavailable",
      reservedUntil: current?.reserved_until || null,
      soldAt: current?.sold_at || null,
    };
  }

  await db.batch([
    db.prepare(`
      INSERT INTO original_artwork_reservations (
        reservation_id, artwork_id, token_hash, status, reserved_until, created_at, updated_at
      ) VALUES (?, ?, ?, 'active', ?, ?, ?)
    `).bind(reservationId, artwork.id, tokenHash, reservedUntil, timestamp, timestamp),
    db.prepare(`
      INSERT INTO original_artwork_events (
        artwork_id, reservation_id, event_type, event_json, created_at
      ) VALUES (?, ?, 'reserved', ?, ?)
    `).bind(artwork.id, reservationId, JSON.stringify({ reservedUntil }), timestamp),
  ]);

  return {
    acquired: true,
    artwork,
    reservationId,
    reservationToken: token,
    reservedUntil,
  };
}

export async function validateOriginalArtworkReservation(env = {}, {
  artworkId,
  reservationId,
  reservationToken,
  now = Date.now(),
} = {}) {
  const db = await ensureOriginalArtworkSchema(env);
  await releaseExpiredOriginalArtworkReservations(env, now);
  const tokenHash = await hashToken(reservationToken);
  const row = await db.prepare(`
    SELECT artwork_id, title, price_cents, declared_value_cents, currency,
           package_length_cm, package_width_cm, package_height_cm, package_weight_kg,
           status, reservation_id, reservation_token_hash, reserved_until,
           checkout_session_id, sold_at
    FROM original_artworks
    WHERE artwork_id = ?
  `).bind(String(artworkId || "").toLowerCase()).first();

  const valid = Boolean(
    row
    && row.status === "reserved"
    && row.reservation_id === reservationId
    && row.reservation_token_hash === tokenHash
    && Number(row.reserved_until || 0) > now
  );
  return { valid, row };
}

export async function saveOriginalArtworkQuote(env = {}, {
  artworkId,
  reservationId,
  reservationToken,
  destinationCountry,
  quote,
  now = Date.now(),
} = {}) {
  const validation = await validateOriginalArtworkReservation(env, {
    artworkId,
    reservationId,
    reservationToken,
    now,
  });
  if (!validation.valid) return { saved: false, reason: "invalid-reservation" };

  const db = requireDatabase(env);
  const timestamp = nowIso(now);
  const result = await db.prepare(`
    UPDATE original_artwork_reservations
    SET destination_country = ?, shipping_quote_json = ?, updated_at = ?
    WHERE reservation_id = ? AND artwork_id = ?
      AND status = 'active' AND reserved_until > ?
  `).bind(
    String(destinationCountry || "").toUpperCase(),
    JSON.stringify(quote || {}),
    timestamp,
    reservationId,
    String(artworkId || "").toLowerCase(),
    now,
  ).run();
  return { saved: Number(result.meta?.changes || 0) === 1 };
}

export async function attachOriginalArtworkCheckout(env = {}, {
  artworkId,
  reservationId,
  reservationToken,
  checkoutSessionId,
  now = Date.now(),
} = {}) {
  const validation = await validateOriginalArtworkReservation(env, {
    artworkId,
    reservationId,
    reservationToken,
    now,
  });
  if (!validation.valid) return { attached: false, reason: "invalid-reservation" };

  const db = requireDatabase(env);
  const timestamp = nowIso(now);
  const results = await db.batch([
    db.prepare(`
      UPDATE original_artwork_reservations
      SET status = 'checkout-created', checkout_session_id = ?, updated_at = ?
      WHERE reservation_id = ? AND artwork_id = ?
        AND status IN ('active', 'checkout-created') AND reserved_until > ?
    `).bind(checkoutSessionId, timestamp, reservationId, String(artworkId || "").toLowerCase(), now),
    db.prepare(`
      UPDATE original_artworks
      SET checkout_session_id = ?, updated_at = ?
      WHERE artwork_id = ? AND reservation_id = ? AND status = 'reserved'
    `).bind(checkoutSessionId, timestamp, String(artworkId || "").toLowerCase(), reservationId),
  ]);
  return { attached: results.every((result) => Number(result.meta?.changes || 0) === 1) };
}

export async function releaseOriginalArtworkReservation(env = {}, {
  artworkId,
  reservationId,
  reservationToken,
  now = Date.now(),
} = {}) {
  const validation = await validateOriginalArtworkReservation(env, {
    artworkId,
    reservationId,
    reservationToken,
    now,
  });
  if (!validation.valid) return { released: false, reason: "invalid-reservation" };

  const db = requireDatabase(env);
  const timestamp = nowIso(now);
  const results = await db.batch([
    db.prepare(`
      UPDATE original_artworks
      SET status = 'available', reservation_id = NULL, reservation_token_hash = NULL,
          reserved_until = NULL, checkout_session_id = NULL, updated_at = ?
      WHERE artwork_id = ? AND reservation_id = ? AND status = 'reserved'
    `).bind(timestamp, String(artworkId || "").toLowerCase(), reservationId),
    db.prepare(`
      UPDATE original_artwork_reservations
      SET status = 'released', updated_at = ?
      WHERE reservation_id = ? AND artwork_id = ?
        AND status IN ('active', 'checkout-created')
    `).bind(timestamp, reservationId, String(artworkId || "").toLowerCase()),
    db.prepare(`
      INSERT INTO original_artwork_events (
        artwork_id, reservation_id, event_type, event_json, created_at
      ) VALUES (?, ?, 'released', '{}', ?)
    `).bind(String(artworkId || "").toLowerCase(), reservationId, timestamp),
  ]);
  return { released: Number(results[0].meta?.changes || 0) === 1 };
}

export async function markOriginalArtworkSold(env = {}, {
  artworkId,
  reservationId,
  checkoutSessionId,
  paymentIntentId = "",
  now = Date.now(),
} = {}) {
  const db = await ensureOriginalArtworkSchema(env);
  const id = String(artworkId || "").toLowerCase();
  const timestamp = nowIso(now);
  const sold = await db.prepare(`
    UPDATE original_artworks
    SET status = 'sold', checkout_session_id = ?, payment_intent_id = ?,
        reservation_token_hash = NULL, reserved_until = NULL,
        sold_at = ?, updated_at = ?
    WHERE artwork_id = ? AND reservation_id = ?
      AND status = 'reserved'
      AND (checkout_session_id IS NULL OR checkout_session_id = ?)
  `).bind(
    checkoutSessionId,
    paymentIntentId,
    timestamp,
    timestamp,
    id,
    reservationId,
    checkoutSessionId,
  ).run();

  if (Number(sold.meta?.changes || 0) !== 1) {
    const current = await db.prepare(`
      SELECT status, checkout_session_id FROM original_artworks WHERE artwork_id = ?
    `).bind(id).first();
    if (current?.status === "sold" && current.checkout_session_id === checkoutSessionId) {
      return { sold: true, duplicate: true };
    }
    return { sold: false, reason: current?.status || "not-found" };
  }

  await db.batch([
    db.prepare(`
      UPDATE original_artwork_reservations
      SET status = 'completed', checkout_session_id = ?, updated_at = ?, completed_at = ?
      WHERE reservation_id = ? AND artwork_id = ?
        AND status IN ('active', 'checkout-created')
    `).bind(checkoutSessionId, timestamp, timestamp, reservationId, id),
    db.prepare(`
      INSERT INTO original_artwork_events (
        artwork_id, reservation_id, event_type, event_json, created_at
      ) VALUES (?, ?, 'sold', ?, ?)
    `).bind(id, reservationId, JSON.stringify({ checkoutSessionId, paymentIntentId }), timestamp),
  ]);
  return { sold: true, duplicate: false };
}
