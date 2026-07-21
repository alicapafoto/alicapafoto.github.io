import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  ensureOriginalArtworkCheckoutSchema,
  getOriginalArtworkOrderContext,
  markOriginalArtworkCheckoutSold,
  releaseExpiredPreCheckoutReservations,
  releaseOriginalArtworkCheckoutBySession,
} from "../functions/_lib/original-artwork-checkout.js";
import { verifyOriginalArtworkQuoteToken } from "../functions/_lib/original-artwork-quote-token.js";
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
const baseMockRates = { PT: 1500, EU: 3500, GB: 4000, EFTA: 4500, US: 7000, CA: 7500, ANZ: 9500, ROW: 8500 };
const env = {
  SITE_URL: "https://example.test",
  STORE_ENV: "test",
  ORDER_LEDGER,
  ORIGINAL_WORKS_ACQUISITION_ENABLED: "true",
  ORIGINAL_WORKS_SHIPPING_MODE: "mock",
  ORIGINAL_WORKS_MOCK_SHIPPING_CENTS_JSON: JSON.stringify(baseMockRates),
  ORIGINAL_WORKS_QUOTE_SIGNING_SECRET: "test-only-original-works-quote-signing-secret-2026",
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

function setPortugalMockRate(cents) {
  env.ORIGINAL_WORKS_MOCK_SHIPPING_CENTS_JSON = JSON.stringify({ ...baseMockRates, PT: cents });
}

async function quoteFor(artworkId, address = shippingAddress) {
  const response = await quoteEndpoint({
    request: new Request("https://example.test/api/original-artworks/quote", {
      method: "POST",
      headers: { origin: "https://example.test", "content-type": "application/json" },
      body: JSON.stringify({ artworkId, shippingAddress: address }),
    }),
    env,
  });
  const payload = await response.json();
  assert.equal(response.status, 200, payload.error);
  assert.ok(payload.quoteToken);
  return payload;
}

async function checkoutFor({ artworkId, checkoutAttemptId, quote, address = shippingAddress, quoteToken = quote?.quoteToken }) {
  const response = await checkoutEndpoint({
    request: new Request("https://example.test/api/original-artworks/reserve-and-checkout", {
      method: "POST",
      headers: { origin: "https://example.test", "content-type": "application/json" },
      body: JSON.stringify({
        artworkId,
        shippingAddress: address,
        expectedShippingCents: quote?.shipping?.customerCents,
        quoteToken,
        checkoutAttemptId,
      }),
    }),
    env,
  });
  return { response, payload: await response.json() };
}

await ensureOriginalArtworkCheckoutSchema(env);
ORDER_LEDGER.db.prepare("UPDATE original_artworks SET status = 'available'").run();
assert.equal(isOriginalArtworkShippingConfigured(env), true);
assert.equal(isOriginalArtworkShippingConfigured({ ...env, STORE_ENV: "live" }), false);
assert.equal(isOriginalArtworkShippingConfigured({
  ...env,
  ORIGINAL_WORKS_SHIPPING_MODE: "dhl-live",
  DHL_API_KEY: "key",
  DHL_API_SECRET: "secret",
  DHL_ACCOUNT_NUMBER: "account",
  DHL_ORIGIN_COUNTRY: "PT",
  DHL_ORIGIN_POSTAL_CODE: "3800-209",
  DHL_ORIGIN_CITY: "Aveiro",
}), false);

const statusResponse = await statusEndpoint({ request: new Request("https://example.test/api/original-artworks/status"), env });
const statusPayload = await statusResponse.json();
assert.equal(statusPayload.checkoutReady, true);
assert.equal(statusPayload.quoteSigningConfigured, true);
assert.ok(statusPayload.artworks.every((artwork) => artwork.status.reservable));
const unsignedStatus = await statusEndpoint({
  request: new Request("https://example.test/api/original-artworks/status"),
  env: { ...env, ORIGINAL_WORKS_QUOTE_SIGNING_SECRET: "" },
});
assert.equal((await unsignedStatus.json()).checkoutReady, false);

const quotePayload = await quoteFor("dusaemas");
assert.equal(quotePayload.artwork.priceCents, 20000);
assert.equal(quotePayload.shipping.customerCents, 1500);
assert.equal(quotePayload.shipping.insuredValueCents, 20000);
assert.equal(quotePayload.totalCents, 21500);
assert.ok(quotePayload.quoteExpiresAt > Date.now());
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'dusaemas'").get().status, "available");
const decodedQuotePayload = JSON.parse(new TextDecoder().decode(Uint8Array.from(
  atob(quotePayload.quoteToken.split(".")[0].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(quotePayload.quoteToken.split(".")[0].length / 4) * 4, "=")),
  (character) => character.charCodeAt(0),
)));
assert.equal(decodedQuotePayload.artworkId, "dusaemas");
assert.equal(decodedQuotePayload.shippingCents, 1500);
assert.equal(JSON.stringify(decodedQuotePayload).includes(shippingAddress.recipientName), false);
assert.equal(JSON.stringify(decodedQuotePayload).includes(shippingAddress.addressLine1), false);
const expiredQuoteCheck = await verifyOriginalArtworkQuoteToken(env, {
  token: quotePayload.quoteToken,
  artworkId: "dusaemas",
  shippingAddress,
  shippingCents: 1500,
  now: quotePayload.quoteExpiresAt + 1,
});
assert.deepEqual(expiredQuoteCheck, { valid: false, reason: "expired" });

const missingToken = await checkoutFor({
  artworkId: "dusaemas",
  checkoutAttemptId: "00000000-0000-4000-8000-000000000001",
  quote: quotePayload,
  quoteToken: "",
});
assert.equal(missingToken.response.status, 400);
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'dusaemas'").get().status, "available");

const changedAddress = { ...shippingAddress, addressLine1: "2 Rua Alterada" };
const addressTamper = await checkoutFor({
  artworkId: "dusaemas",
  checkoutAttemptId: "00000000-0000-4000-8000-000000000002",
  quote: quotePayload,
  address: changedAddress,
});
assert.equal(addressTamper.response.status, 409);
assert.equal(addressTamper.payload.quoteExpired, true);
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'dusaemas'").get().status, "available");

const tokenTamper = await checkoutFor({
  artworkId: "dusaemas",
  checkoutAttemptId: "00000000-0000-4000-8000-000000000003",
  quote: quotePayload,
  quoteToken: `${quotePayload.quoteToken.slice(0, -1)}x`,
});
assert.equal(tokenTamper.response.status, 409);
assert.equal(tokenTamper.payload.quoteExpired, true);

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
const firstCheckout = await checkoutFor({ artworkId: "dusaemas", checkoutAttemptId: firstAttemptId, quote: quotePayload });
assert.equal(firstCheckout.response.status, 201);
const checkoutPayload = firstCheckout.payload;
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
assert.equal(String(lastStripeParams).includes(quotePayload.quoteToken), false);
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

const duplicateCheckout = await checkoutFor({ artworkId: "dusaemas", checkoutAttemptId: firstAttemptId, quote: quotePayload });
assert.equal(duplicateCheckout.response.status, 200);
assert.equal(duplicateCheckout.payload.sessionId, checkoutPayload.sessionId);
assert.equal(stripeCreateCount, 1);

const competingCheckout = await checkoutFor({
  artworkId: "dusaemas",
  checkoutAttemptId: "22222222-2222-4222-8222-222222222222",
  quote: quotePayload,
});
assert.equal(competingCheckout.response.status, 409);

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

const goldQuoteBeforeChange = await quoteFor("gold");
setPortugalMockRate(1600);
const quoteChanged = await checkoutFor({
  artworkId: "gold",
  checkoutAttemptId: "33333333-3333-4333-8333-333333333333",
  quote: goldQuoteBeforeChange,
});
assert.equal(quoteChanged.response.status, 409);
assert.equal(quoteChanged.payload.quoteChanged, true);
assert.equal(quoteChanged.payload.shipping.customerCents, 1600);
assert.ok(quoteChanged.payload.quoteToken);
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'gold'").get().status, "available");
setPortugalMockRate(1500);

const goldFailureQuote = await quoteFor("gold");
failNextStripeCreate = true;
const failedCheckout = await checkoutFor({
  artworkId: "gold",
  checkoutAttemptId: "44444444-4444-4444-8444-444444444444",
  quote: goldFailureQuote,
});
assert.equal(failedCheckout.response.status, 502);
assert.equal(ORDER_LEDGER.db.prepare("SELECT status FROM original_artworks WHERE artwork_id = 'gold'").get().status, "available");
assert.equal(ORDER_LEDGER.db.prepare(
  "SELECT status FROM original_artwork_checkout_attempts WHERE checkout_attempt_id = ?",
).get("44444444-4444-4444-8444-444444444444").status, "failed");

const goldExpiryQuote = await quoteFor("gold");
const expiringCheckoutResult = await checkoutFor({
  artworkId: "gold",
  checkoutAttemptId: "55555555-5555-4555-8555-555555555555",
  quote: goldExpiryQuote,
});
assert.equal(expiringCheckoutResult.response.status, 201);
const expiringCheckout = expiringCheckoutResult.payload;
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

const untitledQuote = await quoteFor("untitled");
const soldCheckoutResult = await checkoutFor({
  artworkId: "untitled",
  checkoutAttemptId: "66666666-6666-4666-8666-666666666666",
  quote: untitledQuote,
});
assert.equal(soldCheckoutResult.response.status, 201);
const soldCheckout = soldCheckoutResult.payload;
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
console.log("Original Works signed quote-first checkout safety tests passed.");
