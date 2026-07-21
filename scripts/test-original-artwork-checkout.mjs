import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  ensureOriginalArtworkCheckoutSchema,
  getOriginalArtworkOrderContext,
  markOriginalArtworkCheckoutSold,
  releaseExpiredPreCheckoutReservations,
  releaseOriginalArtworkCheckoutBySession,
} from "../functions/_lib/original-artwork-checkout.js";
import { isOriginalArtworkShippingConfigured } from "../functions/_lib/original-artwork-shipping.js";
import { onRequest as statusEndpoint } from "../functions/api/original-artworks/status.js";
import { onRequest as quoteEndpoint } from "../functions/api/original-artworks/quote.js";
import { onRequest as checkoutEndpoint } from "../functions/api/original-artworks/reserve-and-checkout.js";
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
  STORE_ENV: "test",
  ORDER_LEDGER,
  ORIGINAL_WORKS_ACQUISITION_ENABLED: "true",
  ORIGINAL_WORKS_SHIPPING_MODE: "mock",
  ORIGINAL_WORKS_MOCK_SHIPPING_CENTS_JSON: JSON.stringify({ PT: 1500, EU: 3500, GB: 4000, EFTA: 4500, US: 7000, CA: 7500, ANZ: 9500, ROW: 8500 }),
  STRIPE_SECRET_KEY: "sk_test_original",
  STRIPE_WEBHOOK_SECRET: "whsec_original",
  GOOGLE_SHEET_ID: "sheet_original",
  GOOGLE_SERVICE_ACCOUNT_EMAIL: "service@example.test",
  GOOGLE_PRIVATE_KEY: "private-key",
};

const shippingAddress = {
  recipientName: "Collector Example",
  addressLine1: "1 Rua da Arte",
  addressLine2: "Apartment 2",
  city: "Aveiro",
  state: "Aveiro",
  postalCode: "3800-209",
  countryCode: "PT",
};

await ensureOriginalArtworkCheckoutSchema(env);
ORDER_LEDGER.db.prepare("UPDATE original_artworks SET status = 'available'").run();
assert.equal(isOriginalArtworkShippingConfigured(env), true);
assert.equal(isOriginalArtworkShippingConfigured({ ...env, STORE_ENV: "live" }), false);

const statusResponse = await statusEndpoint({ request: new Request("https://example.test/api/original-artworks/status"), env });
const statusPayload = await statusResponse.json();
assert.equal(statusPayload.checkoutReady, true);
assert.ok(statusPayload.artworks.every((artwork) => artwork.status.reservable));

const quoteResponse = await quoteEndpoint({
  request: new Request("https://example.test/api/original-artworks/quote", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({ artworkId: "dusaemas", shippingAddress }),
  }),
  env,
});
assert.equal(quoteResponse.status, 200);
const quotePayload = await quoteResponse.json();
assert.equal(quotePayload.artwork.priceCents, 20000);
assert.equal(quotePayload.shipping.customerCents, 1500);
assert.equal(quotePayload.shipping.insuredValueCents, 20000);
assert.equal(quotePayload.totalCents, 21500);
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'dusaemas'").get().status, "available");

let stripeCreateCount = 0;
let stripeExpireCount = 0;
let failNextStripeCreate = false;
let lastStripeParams = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const target = String(url);
  if (target.endsWith("/expire")) {
    stripeExpireCount += 1;
    return new Response(JSON.stringify({ id: target.split("/").at(-2), status: "expired" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  if (target === "https://api.stripe.com/v1/checkout/sessions") {
    stripeCreateCount += 1;
    lastStripeParams = new URLSearchParams(String(init.body || ""));
    if (failNextStripeCreate) {
      failNextStripeCreate = false;
      return new Response(JSON.stringify({ error: { message: "Simulated Stripe failure" } }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    const id = `cs_test_original_${stripeCreateCount}`;
    return new Response(JSON.stringify({
      id,
      url: `https://checkout.stripe.test/${id}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  throw new Error(`Unexpected fetch: ${target}`);
};

const firstAttemptId = "11111111-1111-4111-8111-111111111111";
const checkoutResponse = await checkoutEndpoint({
  request: new Request("https://example.test/api/original-artworks/reserve-and-checkout", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({
      artworkId: "dusaemas",
      shippingAddress,
      expectedShippingCents: 1500,
      checkoutAttemptId: firstAttemptId,
    }),
  }),
  env,
});
assert.equal(checkoutResponse.status, 201);
const checkoutPayload = await checkoutResponse.json();
assert.match(checkoutPayload.reservationId, /^owr_/);
assert.ok(checkoutPayload.reservationToken.length >= 40);
assert.equal(checkoutPayload.totalCents, 21500);
assert.equal(stripeCreateCount, 1);
assert.equal(lastStripeParams.get("metadata[order_type]"), "original-artwork");
assert.equal(lastStripeParams.get("metadata[artwork_id]"), "dusaemas");
assert.equal(lastStripeParams.get("metadata[reservation_id]"), checkoutPayload.reservationId);
assert.equal(lastStripeParams.get("metadata[declared_value_cents]"), "20000");
assert.equal(lastStripeParams.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]"), "1500");
assert.equal(lastStripeParams.has("shipping_address_collection[allowed_countries][0]"), false);
const stripeExpiry = Number(lastStripeParams.get("expires_at"));
assert.ok(stripeExpiry >= Math.floor(Date.now() / 1000) + 29 * 60);
assert.ok(stripeExpiry <= Math.floor(Date.now() / 1000) + 31 * 60);

const artworkAfterCheckout = ORDER_LEDGER.db.prepare(
  "SELECT status, checkout_session_id, reserved_until FROM original_artworks WHERE artwork_id = ?",
).get("dusaemas");
assert.equal(artworkAfterCheckout.status, "reserved");
assert.equal(artworkAfterCheckout.checkout_session_id, checkoutPayload.sessionId);
assert.equal(artworkAfterCheckout.reserved_until, checkoutPayload.reservedUntil);
assert.equal(ORDER_LEDGER.db.prepare(
  "SELECT status FROM original_artwork_reservations WHERE reservation_id = ?",
).get(checkoutPayload.reservationId).status, "checkout-created");
assert.equal(ORDER_LEDGER.db.prepare(
  "SELECT status FROM original_artwork_checkout_attempts WHERE checkout_attempt_id = ?",
).get(firstAttemptId).status, "checkout-created");

const duplicateResponse = await checkoutEndpoint({
  request: new Request("https://example.test/api/original-artworks/reserve-and-checkout", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({
      artworkId: "dusaemas",
      shippingAddress,
      expectedShippingCents: 1500,
      checkoutAttemptId: firstAttemptId,
    }),
  }),
  env,
});
assert.equal(duplicateResponse.status, 200);
assert.equal((await duplicateResponse.json()).sessionId, checkoutPayload.sessionId);
assert.equal(stripeCreateCount, 1);

const competingResponse = await checkoutEndpoint({
  request: new Request("https://example.test/api/original-artworks/reserve-and-checkout", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({
      artworkId: "dusaemas",
      shippingAddress,
      expectedShippingCents: 1500,
      checkoutAttemptId: "22222222-2222-4222-8222-222222222222",
    }),
  }),
  env,
});
assert.equal(competingResponse.status, 409);

const releaseResponse = await releaseEndpoint({
  request: new Request("https://example.test/api/original-artworks/release", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({
      artworkId: "dusaemas",
      reservationId: checkoutPayload.reservationId,
      reservationToken: checkoutPayload.reservationToken,
    }),
  }),
  env,
});
assert.equal(releaseResponse.status, 200);
assert.equal(stripeExpireCount, 1);
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'dusaemas'").get().status, "available");
assert.equal(ORDER_LEDGER.db.prepare(
  "SELECT status FROM original_artwork_checkout_attempts WHERE checkout_attempt_id = ?",
).get(firstAttemptId).status, "released");

const quoteChangedResponse = await checkoutEndpoint({
  request: new Request("https://example.test/api/original-artworks/reserve-and-checkout", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({
      artworkId: "gold",
      shippingAddress,
      expectedShippingCents: 1,
      checkoutAttemptId: "33333333-3333-4333-8333-333333333333",
    }),
  }),
  env,
});
assert.equal(quoteChangedResponse.status, 409);
assert.equal((await quoteChangedResponse.json()).quoteChanged, true);
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'gold'").get().status, "available");

failNextStripeCreate = true;
const failedCheckoutResponse = await checkoutEndpoint({
  request: new Request("https://example.test/api/original-artworks/reserve-and-checkout", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({
      artworkId: "gold",
      shippingAddress,
      expectedShippingCents: 1500,
      checkoutAttemptId: "44444444-4444-4444-8444-444444444444",
    }),
  }),
  env,
});
assert.equal(failedCheckoutResponse.status, 502);
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'gold'").get().status, "available");
assert.equal(ORDER_LEDGER.db.prepare(
  "SELECT status FROM original_artwork_checkout_attempts WHERE checkout_attempt_id = ?",
).get("44444444-4444-4444-8444-444444444444").status, "failed");

const expiringCheckoutResponse = await checkoutEndpoint({
  request: new Request("https://example.test/api/original-artworks/reserve-and-checkout", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({
      artworkId: "gold",
      shippingAddress,
      expectedShippingCents: 1500,
      checkoutAttemptId: "55555555-5555-4555-8555-555555555555",
    }),
  }),
  env,
});
assert.equal(expiringCheckoutResponse.status, 201);
const expiringCheckout = await expiringCheckoutResponse.json();
await releaseExpiredPreCheckoutReservations(env, expiringCheckout.reservedUntil + 1);
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'gold'").get().status, "reserved");
assert.equal(ORDER_LEDGER.db.prepare(
  "SELECT status FROM original_artwork_reservations WHERE reservation_id = ?",
).get(expiringCheckout.reservationId).status, "checkout-created");
const expiredRelease = await releaseOriginalArtworkCheckoutBySession(env, {
  artworkId: "gold",
  reservationId: expiringCheckout.reservationId,
  checkoutSessionId: expiringCheckout.sessionId,
  now: expiringCheckout.reservedUntil + 2,
});
assert.equal(expiredRelease.released, true);
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'gold'").get().status, "available");

const soldCheckoutResponse = await checkoutEndpoint({
  request: new Request("https://example.test/api/original-artworks/reserve-and-checkout", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({
      artworkId: "untitled",
      shippingAddress,
      expectedShippingCents: 1500,
      checkoutAttemptId: "66666666-6666-4666-8666-666666666666",
    }),
  }),
  env,
});
assert.equal(soldCheckoutResponse.status, 201);
const soldCheckout = await soldCheckoutResponse.json();
const orderContext = await getOriginalArtworkOrderContext(env, {
  artworkId: "untitled",
  reservationId: soldCheckout.reservationId,
  checkoutSessionId: soldCheckout.sessionId,
});
assert.equal(orderContext.shippingAddress.recipientName, shippingAddress.recipientName);
assert.equal(orderContext.shippingAddress.addressLine1, shippingAddress.addressLine1);
assert.equal(orderContext.quote.customerCents, 1500);
const soldResult = await markOriginalArtworkCheckoutSold(env, {
  artworkId: "untitled",
  reservationId: soldCheckout.reservationId,
  checkoutSessionId: soldCheckout.sessionId,
  paymentIntentId: "pi_test_original_sold",
});
assert.deepEqual(soldResult, { sold: true, duplicate: false });
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'untitled'").get().status, "sold");
assert.equal(ORDER_LEDGER.db.prepare(
  "SELECT status FROM original_artwork_checkout_attempts WHERE checkout_attempt_id = ?",
).get("66666666-6666-4666-8666-666666666666").status, "completed");
const duplicateSoldResult = await markOriginalArtworkCheckoutSold(env, {
  artworkId: "untitled",
  reservationId: soldCheckout.reservationId,
  checkoutSessionId: soldCheckout.sessionId,
  paymentIntentId: "pi_test_original_sold",
});
assert.deepEqual(duplicateSoldResult, { sold: true, duplicate: true });
const releaseAfterSale = await releaseOriginalArtworkCheckoutBySession(env, {
  artworkId: "untitled",
  reservationId: soldCheckout.reservationId,
  checkoutSessionId: soldCheckout.sessionId,
});
assert.equal(releaseAfterSale.released, false);
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'untitled'").get().status, "sold");

globalThis.fetch = realFetch;
console.log("Original Works quote-first checkout safety tests passed.");
