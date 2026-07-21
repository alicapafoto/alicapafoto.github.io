const LEASE_MS = 5 * 60 * 1000;

function requireDatabase(env = {}) {
  if (!env.ORDER_LEDGER) throw new Error("ORDER_LEDGER database is not configured");
  return env.ORDER_LEDGER;
}

export async function ensureOrderLedger(env = {}) {
  const db = requireDatabase(env);
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS order_events (
      session_id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
      sheet_synced INTEGER NOT NULL DEFAULT 0 CHECK (sheet_synced IN (0, 1)),
      attempt_count INTEGER NOT NULL DEFAULT 1,
      lease_expires_at INTEGER NOT NULL,
      order_json TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS order_events_status_idx ON order_events(status, lease_expires_at)"),
  ]);
  return db;
}

export async function claimOrderEvent(env, { sessionId, eventId, eventType }) {
  const db = await ensureOrderLedger(env);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const leaseExpiresAt = now + LEASE_MS;
  const insert = await db.prepare(`
    INSERT OR IGNORE INTO order_events (
      session_id, event_id, event_type, status, sheet_synced,
      attempt_count, lease_expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, 'processing', 0, 1, ?, ?, ?)
  `).bind(sessionId, eventId, eventType, leaseExpiresAt, nowIso, nowIso).run();

  if (Number(insert.meta?.changes || 0) === 1) {
    return { acquired: true, reason: "new", leaseExpiresAt };
  }

  const existing = await db.prepare(`
    SELECT session_id, status, sheet_synced, attempt_count, lease_expires_at
    FROM order_events WHERE session_id = ?
  `).bind(sessionId).first();

  if (!existing) throw new Error("Order ledger claim could not be verified");
  if (existing.status === "completed") {
    return { acquired: false, duplicate: true, sheetSynced: Boolean(existing.sheet_synced) };
  }
  if (existing.status === "processing" && Number(existing.lease_expires_at || 0) > now) {
    return { acquired: false, inProgress: true, retryAfterMs: Number(existing.lease_expires_at) - now };
  }

  const takeover = await db.prepare(`
    UPDATE order_events
    SET event_id = ?, event_type = ?, status = 'processing',
        attempt_count = attempt_count + 1, lease_expires_at = ?,
        last_error = NULL, updated_at = ?
    WHERE session_id = ?
      AND status != 'completed'
      AND (status = 'failed' OR lease_expires_at <= ?)
  `).bind(eventId, eventType, leaseExpiresAt, nowIso, sessionId, now).run();

  if (Number(takeover.meta?.changes || 0) === 1) {
    return { acquired: true, reason: "retry", leaseExpiresAt };
  }

  const current = await db.prepare(`
    SELECT status, sheet_synced, lease_expires_at
    FROM order_events WHERE session_id = ?
  `).bind(sessionId).first();
  if (current?.status === "completed") {
    return { acquired: false, duplicate: true, sheetSynced: Boolean(current.sheet_synced) };
  }
  return {
    acquired: false,
    inProgress: true,
    retryAfterMs: Math.max(1_000, Number(current?.lease_expires_at || leaseExpiresAt) - now),
  };
}

export async function saveOrderSnapshot(env, sessionId, order) {
  const db = requireDatabase(env);
  const now = Date.now();
  const result = await db.prepare(`
    UPDATE order_events
    SET order_json = ?, lease_expires_at = ?, updated_at = ?
    WHERE session_id = ? AND status = 'processing'
  `).bind(JSON.stringify(order), now + LEASE_MS, new Date(now).toISOString(), sessionId).run();
  if (Number(result.meta?.changes || 0) !== 1) throw new Error("Order ledger snapshot was not saved");
}

export async function markOrderCompleted(env, sessionId, { sheetSynced = true } = {}) {
  const db = requireDatabase(env);
  const nowIso = new Date().toISOString();
  const result = await db.prepare(`
    UPDATE order_events
    SET status = 'completed', sheet_synced = ?, lease_expires_at = 0,
        last_error = NULL, updated_at = ?, completed_at = ?
    WHERE session_id = ? AND status != 'completed'
  `).bind(sheetSynced ? 1 : 0, nowIso, nowIso, sessionId).run();
  if (Number(result.meta?.changes || 0) === 0) {
    const row = await db.prepare("SELECT status FROM order_events WHERE session_id = ?").bind(sessionId).first();
    if (row?.status !== "completed") throw new Error("Order ledger completion was not recorded");
  }
}

export async function markOrderFailed(env, sessionId, error) {
  const db = requireDatabase(env);
  const message = String(error?.message || error || "Order processing failed").slice(0, 500);
  await db.prepare(`
    UPDATE order_events
    SET status = 'failed', lease_expires_at = 0, last_error = ?, updated_at = ?
    WHERE session_id = ? AND status != 'completed'
  `).bind(message, new Date().toISOString(), sessionId).run();
}
