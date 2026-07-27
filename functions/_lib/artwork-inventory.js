import { ensureOrderLedger } from "./order-ledger.js";

const RESERVATION_TTL_MS = 35 * 60 * 1000;

function requireDatabase(env = {}) {
  if (!env.ORDER_LEDGER) throw new Error("ORDER_LEDGER database is not configured");
  return env.ORDER_LEDGER;
}

export async function ensureArtworkInventory(env = {}) {
  const db = await ensureOrderLedger(env);
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS artwork_inventory (
      product_id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('reserved', 'sold')),
      reservation_token TEXT,
      checkout_session_id TEXT,
      expires_at INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sold_at TEXT
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS artwork_inventory_status_idx ON artwork_inventory(status, expires_at)"),
  ]);
  return db;
}

async function paidOrderExists(db, productId) {
  const row = await db.prepare(`
    SELECT session_id
    FROM order_events
    WHERE order_json IS NOT NULL
      AND json_extract(order_json, '$.productId') = ?
    LIMIT 1
  `).bind(productId).first();
  return Boolean(row?.session_id);
}

export async function getArtworkInventoryStatus(env, productId) {
  const db = await ensureArtworkInventory(env);
  if (await paidOrderExists(db, productId)) return { code: "sold", checkoutReady: false };

  const now = Date.now();
  await db.prepare(`
    DELETE FROM artwork_inventory
    WHERE product_id = ? AND status = 'reserved' AND expires_at <= ?
  `).bind(productId, now).run();

  const row = await db.prepare(`
    SELECT product_id, status, reservation_token, checkout_session_id, expires_at
    FROM artwork_inventory
    WHERE product_id = ?
  `).bind(productId).first();

  if (!row) return { code: "available", checkoutReady: true };
  if (row.status === "sold") return { code: "sold", checkoutReady: false };
  return {
    code: "reserved",
    checkoutReady: false,
    expiresAt: Number(row.expires_at || 0),
  };
}

export async function reserveArtwork(env, { productId, reservationToken }) {
  const db = await ensureArtworkInventory(env);
  if (await paidOrderExists(db, productId)) return { acquired: false, code: "sold" };

  const now = Date.now();
  const expiresAt = now + RESERVATION_TTL_MS;
  const nowIso = new Date(now).toISOString();

  await db.prepare(`
    INSERT OR IGNORE INTO artwork_inventory (
      product_id, status, reservation_token, checkout_session_id,
      expires_at, created_at, updated_at, sold_at
    ) VALUES (?, 'reserved', ?, NULL, ?, ?, ?, NULL)
  `).bind(productId, reservationToken, expiresAt, nowIso, nowIso).run();

  await db.prepare(`
    UPDATE artwork_inventory
    SET status = 'reserved', reservation_token = ?, checkout_session_id = NULL,
        expires_at = ?, updated_at = ?, sold_at = NULL
    WHERE product_id = ?
      AND status = 'reserved'
      AND (expires_at <= ? OR reservation_token = ?)
  `).bind(reservationToken, expiresAt, nowIso, productId, now, reservationToken).run();

  const row = await db.prepare(`
    SELECT status, reservation_token, expires_at
    FROM artwork_inventory
    WHERE product_id = ?
  `).bind(productId).first();

  if (row?.status === "reserved" && row.reservation_token === reservationToken) {
    return { acquired: true, code: "reserved", expiresAt: Number(row.expires_at || expiresAt) };
  }
  return { acquired: false, code: row?.status === "sold" ? "sold" : "reserved" };
}

export async function attachArtworkCheckoutSession(env, { productId, reservationToken, sessionId }) {
  const db = requireDatabase(env);
  const result = await db.prepare(`
    UPDATE artwork_inventory
    SET checkout_session_id = ?, updated_at = ?
    WHERE product_id = ? AND status = 'reserved' AND reservation_token = ?
  `).bind(sessionId, new Date().toISOString(), productId, reservationToken).run();
  if (Number(result.meta?.changes || 0) !== 1) throw new Error("Artwork reservation could not be linked to checkout");
}

export async function releaseArtworkReservation(env, { productId, reservationToken }) {
  const db = requireDatabase(env);
  await db.prepare(`
    DELETE FROM artwork_inventory
    WHERE product_id = ? AND status = 'reserved' AND reservation_token = ?
  `).bind(productId, reservationToken).run();
}
