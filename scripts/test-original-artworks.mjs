import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  ORIGINAL_ARTWORK_RESERVATION_MS,
  ensureOriginalArtworkSchema,
  listOriginalArtworkAvailability,
  markOriginalArtworkSold,
  releaseExpiredOriginalArtworkReservations,
  reserveOriginalArtwork,
  validateOriginalArtworkReservation,
} from "../functions/_lib/original-artworks.js";
import { onRequest as statusEndpoint } from "../functions/api/original-artworks/status.js";
import { onRequest as reserveEndpoint } from "../functions/api/original-artworks/reserve.js";
import { onRequest as releaseEndpoint } from "../functions/api/original-artworks/release.js";

class SqliteD1 {
  constructor() {
    this.db = new DatabaseSync(":memory:");
    this.db.exec("PRAGMA foreign_keys = ON");
  }

  prepare(sql) {
    return new SqliteD1Statement(this.db, sql);
  }

  async batch(statements) {
    this.db.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

class SqliteD1Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async run() {
    const result = this.db.prepare(this.sql).run(...this.args);
    return { meta: { changes: Number(result.changes || 0) } };
  }

  async first() {
    return this.db.prepare(this.sql).get(...this.args) || null;
  }

  async all() {
    return { results: this.db.prepare(this.sql).all(...this.args) };
  }
}

const ORDER_LEDGER = new SqliteD1();
const env = {
  SITE_URL: "https://example.test",
  ORDER_LEDGER,
  ORIGINAL_WORKS_ACQUISITION_ENABLED: "false",
};

await ensureOriginalArtworkSchema(env);
let rows = await listOriginalArtworkAvailability(env);
assert.equal(rows.length, 4);
assert.ok(rows.every((row) => row.status === "unavailable"));
assert.ok(rows.every((row) => row.price_cents === 20000));
assert.ok(rows.every((row) => row.declared_value_cents === 20000));

const statusResponse = await statusEndpoint({
  request: new Request("https://example.test/api/original-artworks/status"),
  env,
});
assert.equal(statusResponse.status, 200);
const statusPayload = await statusResponse.json();
assert.equal(statusPayload.acquisitionEnabled, false);
assert.ok(statusPayload.artworks.every((artwork) => artwork.status.code === "opening-soon"));
assert.ok(statusPayload.artworks.every((artwork) => artwork.status.reservable === false));

const disabledReserve = await reserveEndpoint({
  request: new Request("https://example.test/api/original-artworks/reserve", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({ artworkId: "dusaemas" }),
  }),
  env,
});
assert.equal(disabledReserve.status, 409);

ORDER_LEDGER.db.prepare("UPDATE original_artworks SET status = 'available'").run();
env.ORIGINAL_WORKS_ACQUISITION_ENABLED = "true";

const firstReserve = await reserveEndpoint({
  request: new Request("https://example.test/api/original-artworks/reserve", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({ artworkId: "dusaemas" }),
  }),
  env,
});
assert.equal(firstReserve.status, 201);
const firstReservation = await firstReserve.json();
assert.match(firstReservation.reservationId, /^owr_/);
assert.ok(firstReservation.reservationToken.length >= 40);
assert.equal(firstReservation.reservationMinutes, 30);

const reservedRow = ORDER_LEDGER.db.prepare(
  "SELECT status, reservation_id, reservation_token_hash, reserved_until FROM original_artworks WHERE artwork_id = ?",
).get("dusaemas");
assert.equal(reservedRow.status, "reserved");
assert.equal(reservedRow.reservation_id, firstReservation.reservationId);
assert.notEqual(reservedRow.reservation_token_hash, firstReservation.reservationToken);
assert.ok(reservedRow.reserved_until > Date.now());

const losingReserve = await reserveEndpoint({
  request: new Request("https://example.test/api/original-artworks/reserve", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({ artworkId: "dusaemas" }),
  }),
  env,
});
assert.equal(losingReserve.status, 409);

const wrongToken = await validateOriginalArtworkReservation(env, {
  artworkId: "dusaemas",
  reservationId: firstReservation.reservationId,
  reservationToken: "wrong-token",
});
assert.equal(wrongToken.valid, false);

const correctToken = await validateOriginalArtworkReservation(env, {
  artworkId: "dusaemas",
  reservationId: firstReservation.reservationId,
  reservationToken: firstReservation.reservationToken,
});
assert.equal(correctToken.valid, true);

const releaseResponse = await releaseEndpoint({
  request: new Request("https://example.test/api/original-artworks/release", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({
      artworkId: "dusaemas",
      reservationId: firstReservation.reservationId,
      reservationToken: firstReservation.reservationToken,
    }),
  }),
  env,
});
assert.equal(releaseResponse.status, 200);
assert.equal(ORDER_LEDGER.db.prepare(
  "SELECT status FROM original_artworks WHERE artwork_id = ?",
).get("dusaemas").status, "available");

const expiryStart = 1_000_000;
const expiring = await reserveOriginalArtwork(env, "gold", expiryStart);
assert.equal(expiring.acquired, true);
await releaseExpiredOriginalArtworkReservations(env, expiryStart + ORIGINAL_ARTWORK_RESERVATION_MS + 1);
assert.equal(ORDER_LEDGER.db.prepare(
  "SELECT status FROM original_artworks WHERE artwork_id = ?",
).get("gold").status, "available");
assert.equal(ORDER_LEDGER.db.prepare(
  "SELECT status FROM original_artwork_reservations WHERE reservation_id = ?",
).get(expiring.reservationId).status, "expired");

const saleStart = 2_000_000;
const saleReservation = await reserveOriginalArtwork(env, "study", saleStart);
assert.equal(saleReservation.acquired, true);
const sold = await markOriginalArtworkSold(env, {
  artworkId: "study",
  reservationId: saleReservation.reservationId,
  checkoutSessionId: "cs_test_original_1",
  paymentIntentId: "pi_test_original_1",
  now: saleStart + 1_000,
});
assert.deepEqual(sold, { sold: true, duplicate: false });
const soldRow = ORDER_LEDGER.db.prepare(
  "SELECT status, checkout_session_id, payment_intent_id, sold_at FROM original_artworks WHERE artwork_id = ?",
).get("study");
assert.equal(soldRow.status, "sold");
assert.equal(soldRow.checkout_session_id, "cs_test_original_1");
assert.equal(soldRow.payment_intent_id, "pi_test_original_1");
assert.ok(soldRow.sold_at);

const duplicateSold = await markOriginalArtworkSold(env, {
  artworkId: "study",
  reservationId: saleReservation.reservationId,
  checkoutSessionId: "cs_test_original_1",
  paymentIntentId: "pi_test_original_1",
  now: saleStart + 2_000,
});
assert.deepEqual(duplicateSold, { sold: true, duplicate: true });

const soldReserveAttempt = await reserveOriginalArtwork(env, "study", saleStart + 3_000);
assert.equal(soldReserveAttempt.acquired, false);
assert.equal(soldReserveAttempt.reason, "sold");

console.log("Original Works reservation tests passed.");
