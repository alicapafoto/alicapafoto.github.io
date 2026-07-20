const STALE_CLAIM_MS = 10 * 60 * 1000;

function databaseSession(database) {
  if (!database) throw new Error("ORDER_DB is not configured");
  return typeof database.withSession === "function"
    ? database.withSession("first-primary")
    : database;
}

function changes(result) {
  return Number(result?.meta?.changes || 0);
}

export async function claimCheckoutSession(env, { sessionId, eventId }) {
  if (!sessionId) throw new Error("Missing Checkout Session ID");
  const db = databaseSession(env.ORDER_DB);
  const now = Date.now();
  const token = crypto.randomUUID();

  const inserted = await db.prepare(`
    INSERT OR IGNORE INTO checkout_event_claims
      (session_id, event_id, status, claim_token, claimed_at, processed_at)
    VALUES (?, ?, 'processing', ?, ?, NULL)
  `).bind(sessionId, eventId || "", token, now).run();

  if (changes(inserted) === 1) return { acquired: true, token, duplicate: false };

  const existing = await db.prepare(`
    SELECT status, claim_token, claimed_at
    FROM checkout_event_claims
    WHERE session_id = ?
  `).bind(sessionId).first();

  if (existing?.status === "processed") {
    return { acquired: false, duplicate: true, busy: false };
  }

  const claimedAt = Number(existing?.claimed_at || 0);
  if (existing?.status === "processing" && claimedAt > now - STALE_CLAIM_MS) {
    return { acquired: false, duplicate: false, busy: true };
  }

  const reclaimed = await db.prepare(`
    UPDATE checkout_event_claims
    SET event_id = ?, status = 'processing', claim_token = ?, claimed_at = ?, processed_at = NULL
    WHERE session_id = ?
      AND status = 'processing'
      AND claim_token = ?
      AND claimed_at = ?
  `).bind(eventId || "", token, now, sessionId, existing?.claim_token || "", claimedAt).run();

  return changes(reclaimed) === 1
    ? { acquired: true, token, duplicate: false }
    : { acquired: false, duplicate: false, busy: true };
}

export async function markCheckoutProcessed(env, { sessionId, token }) {
  const db = databaseSession(env.ORDER_DB);
  const result = await db.prepare(`
    UPDATE checkout_event_claims
    SET status = 'processed', processed_at = ?
    WHERE session_id = ? AND claim_token = ? AND status = 'processing'
  `).bind(Date.now(), sessionId, token).run();
  if (changes(result) !== 1) throw new Error("Checkout claim could not be completed");
}

export async function releaseCheckoutClaim(env, { sessionId, token }) {
  const db = databaseSession(env.ORDER_DB);
  await db.prepare(`
    DELETE FROM checkout_event_claims
    WHERE session_id = ? AND claim_token = ? AND status = 'processing'
  `).bind(sessionId, token).run();
}
