import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  attachOriginalArtworkCheckoutSession,
  ensureOriginalArtworkCheckoutSchema,
  markOriginalArtworkCheckoutSold,
  reserveOriginalArtworkForCheckout,
  saveOriginalArtworkCheckoutQuote,
} from "../functions/_lib/original-artwork-checkout.js";
import {
  clearCloudflareAccessKeyCacheForTests,
  verifyCloudflareAccessJwt,
} from "../functions/_lib/cloudflare-access.js";
import {
  getOriginalArtworkFulfilment,
  getOriginalWorksSenderConfiguration,
  listOriginalArtworkFulfilmentEvents,
  listOriginalArtworkFulfilments,
  markOriginalArtworkReadyForLabel,
  saveOriginalArtworkPacking,
} from "../functions/_lib/original-artwork-fulfilment.js";
import { onRequest as fulfilmentEndpoint } from "../functions/api/admin/original-artworks/fulfilment.js";
import { onRequest as packingEndpoint } from "../functions/api/admin/original-artworks/packing.js";
import { onRequest as readyEndpoint } from "../functions/api/admin/original-artworks/ready-for-label.js";
import { onRequest as createShipmentEndpoint } from "../functions/api/admin/original-artworks/create-shipment.js";

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

function base64UrlBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlText(value) {
  return base64UrlBytes(new TextEncoder().encode(value));
}

async function createAccessFixture() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  publicJwk.kid = "test-access-key";
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";

  async function sign(payloadOverrides = {}) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", kid: publicJwk.kid, typ: "JWT" };
    const payload = {
      iss: "https://ali-capa-test.cloudflareaccess.com",
      aud: ["original-works-admin-aud"],
      email: "admin@example.test",
      iat: now - 10,
      exp: now + 300,
      ...payloadOverrides,
    };
    const encodedHeader = base64UrlText(JSON.stringify(header));
    const encodedPayload = base64UrlText(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      pair.privateKey,
      new TextEncoder().encode(signingInput),
    );
    return `${signingInput}.${base64UrlBytes(new Uint8Array(signature))}`;
  }

  return { publicJwk, sign };
}

const ORDER_LEDGER = new SqliteD1();
const env = {
  SITE_URL: "https://example.test",
  STORE_ENV: "test",
  ORDER_LEDGER,
  CF_ACCESS_TEAM_DOMAIN: "ali-capa-test.cloudflareaccess.com",
  CF_ACCESS_AUD: "original-works-admin-aud",
  ORIGINAL_WORKS_ADMIN_EMAIL: "admin@example.test",
};

await ensureOriginalArtworkCheckoutSchema(env);
ORDER_LEDGER.db.exec(readFileSync(new URL("../migrations/0004_original_artwork_fulfilment.sql", import.meta.url), "utf8"));
ORDER_LEDGER.db.prepare("UPDATE original_artworks SET status = 'available'").run();

const access = await createAccessFixture();
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  assert.equal(String(url), "https://ali-capa-test.cloudflareaccess.com/cdn-cgi/access/certs");
  return new Response(JSON.stringify({ keys: [access.publicJwk] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
clearCloudflareAccessKeyCacheForTests();
const validToken = await access.sign();
const verified = await verifyCloudflareAccessJwt(validToken, env);
assert.equal(verified.email, "admin@example.test");
await assert.rejects(() => verifyCloudflareAccessJwt(`${validToken.slice(0, -1)}x`, env), /signature|malformed/);
await assert.rejects(() => verifyCloudflareAccessJwt(access.sign({ aud: ["wrong-audience"] }), env), /audience/);
await assert.rejects(() => verifyCloudflareAccessJwt(access.sign({ email: "intruder@example.test" }), env), /identity/);
await assert.rejects(() => verifyCloudflareAccessJwt(access.sign({ exp: Math.floor(Date.now() / 1000) - 500 }), env), /expired/);

const shippingAddress = {
  recipientName: "Collector Example",
  addressLine1: "1 Collector Street",
  addressLine2: "",
  city: "Porto",
  state: "Porto",
  postalCode: "4000-100",
  countryCode: "PT",
};
const quote = {
  provider: "DHL",
  method: "DHL Express Worldwide",
  customerCents: 1500,
  carrierCents: 1500,
  currency: "EUR",
  insuredValueCents: 20000,
};
const reservation = await reserveOriginalArtworkForCheckout(env, {
  artworkId: "dusaemas",
  checkoutAttemptId: "77777777-7777-4777-8777-777777777777",
});
assert.equal(reservation.acquired, true);
const quoteSaved = await saveOriginalArtworkCheckoutQuote(env, {
  artworkId: "dusaemas",
  reservationId: reservation.reservationId,
  reservationToken: reservation.reservationToken,
  shippingAddress,
  quote,
});
assert.equal(quoteSaved.saved, true);
const checkoutExpiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
const attached = await attachOriginalArtworkCheckoutSession(env, {
  artworkId: "dusaemas",
  reservationId: reservation.reservationId,
  reservationToken: reservation.reservationToken,
  checkoutSessionId: "cs_test_fulfilment_1",
  checkoutUrl: "https://checkout.stripe.test/cs_test_fulfilment_1",
  checkoutExpiresAt,
});
assert.equal(attached.attached, true);
const sold = await markOriginalArtworkCheckoutSold(env, {
  artworkId: "dusaemas",
  reservationId: reservation.reservationId,
  checkoutSessionId: "cs_test_fulfilment_1",
  paymentIntentId: "pi_test_fulfilment_1",
});
assert.deepEqual(sold, { sold: true, duplicate: false });

let records = await listOriginalArtworkFulfilments(env);
assert.equal(records.length, 1);
assert.equal(records[0].status, "paid-awaiting-packing");
assert.equal(records[0].title, "DusaEmas");
assert.equal(records[0].shippingChargedCents, 1500);
assert.equal(records[0].declaredValueCents, 20000);
assert.equal(records[0].recipient.name, shippingAddress.recipientName);
assert.equal(records[0].recipient.address.addressLine1, shippingAddress.addressLine1);
assert.deepEqual(records[0].provisionalParcel, { lengthCm: 55, widthCm: 45, heightCm: 15, weightKg: 2.5 });
const fulfilmentId = records[0].fulfilmentId;

const duplicateSold = await markOriginalArtworkCheckoutSold(env, {
  artworkId: "dusaemas",
  reservationId: reservation.reservationId,
  checkoutSessionId: "cs_test_fulfilment_1",
  paymentIntentId: "pi_test_fulfilment_1",
});
assert.deepEqual(duplicateSold, { sold: true, duplicate: true });
assert.equal((await listOriginalArtworkFulfilments(env)).length, 1);
assert.equal((await listOriginalArtworkFulfilmentEvents(env, fulfilmentId)).filter((event) => event.type === "paid-handoff-created").length, 1);

await assert.rejects(() => saveOriginalArtworkPacking(env, {
  fulfilmentId,
  lengthCm: 55,
  widthCm: 45,
  heightCm: 15,
  weightKg: 3,
  addressReviewed: false,
  actorEmail: "admin@example.test",
}), /address/);
await assert.rejects(() => saveOriginalArtworkPacking(env, {
  fulfilmentId,
  lengthCm: -1,
  widthCm: 45,
  heightCm: 15,
  weightKg: 3,
  addressReviewed: true,
  actorEmail: "admin@example.test",
}), /length/);

const packed = await saveOriginalArtworkPacking(env, {
  fulfilmentId,
  lengthCm: 56,
  widthCm: 46,
  heightCm: 16,
  weightKg: 3.1,
  packingNotes: "Corner guards, rigid boards, bubble wrap and double-wall carton.",
  addressReviewed: true,
  actorEmail: "admin@example.test",
});
assert.equal(packed.status, "packed-measured");
assert.deepEqual(packed.actualParcel, { lengthCm: 56, widthCm: 46, heightCm: 16, weightKg: 3.1 });
assert.equal(getOriginalWorksSenderConfiguration(env).configured, false);
await assert.rejects(() => markOriginalArtworkReadyForLabel(env, {
  fulfilmentId,
  actorEmail: "admin@example.test",
}), /sender/);

Object.assign(env, {
  ORIGINAL_WORKS_SENDER_NAME: "Ali Capa Foto",
  ORIGINAL_WORKS_SENDER_ADDRESS_LINE1: "Private test address",
  ORIGINAL_WORKS_SENDER_CITY: "Aveiro",
  ORIGINAL_WORKS_SENDER_POSTAL_CODE: "3800-000",
  ORIGINAL_WORKS_SENDER_COUNTRY: "PT",
  ORIGINAL_WORKS_SENDER_PHONE_E164: "+351900000000",
});
assert.equal(getOriginalWorksSenderConfiguration(env).configured, true);
const ready = await markOriginalArtworkReadyForLabel(env, {
  fulfilmentId,
  actorEmail: "admin@example.test",
});
assert.equal(ready.status, "ready-for-label");

const deniedList = await fulfilmentEndpoint({
  request: new Request("https://example.test/api/admin/original-artworks/fulfilment"),
  env,
});
assert.equal(deniedList.status, 403);
const allowedList = await fulfilmentEndpoint({
  request: new Request("https://example.test/api/admin/original-artworks/fulfilment", {
    headers: { "cf-access-jwt-assertion": validToken },
  }),
  env,
});
assert.equal(allowedList.status, 200);
assert.equal((await allowedList.json()).records.length, 1);

const packingApi = await packingEndpoint({
  request: new Request("https://example.test/api/admin/original-artworks/packing", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "content-type": "application/json",
      "cf-access-jwt-assertion": validToken,
    },
    body: JSON.stringify({
      fulfilmentId,
      lengthCm: 57,
      widthCm: 47,
      heightCm: 17,
      weightKg: 3.2,
      packingNotes: "Final remeasurement.",
      addressReviewed: true,
    }),
  }),
  env,
});
assert.equal(packingApi.status, 400);

const readyAgain = await readyEndpoint({
  request: new Request("https://example.test/api/admin/original-artworks/ready-for-label", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "content-type": "application/json",
      "cf-access-jwt-assertion": validToken,
    },
    body: JSON.stringify({ fulfilmentId }),
  }),
  env,
});
assert.equal(readyAgain.status, 409);

const shipmentAttempt = await createShipmentEndpoint({
  request: new Request("https://example.test/api/admin/original-artworks/create-shipment", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "content-type": "application/json",
      "cf-access-jwt-assertion": validToken,
    },
    body: JSON.stringify({ fulfilmentId }),
  }),
  env,
});
assert.equal(shipmentAttempt.status, 409);
assert.match((await shipmentAttempt.json()).error, /awaiting the approved live adapter/);
assert.equal((await getOriginalArtworkFulfilment(env, fulfilmentId)).status, "ready-for-label");

globalThis.fetch = realFetch;
console.log("Original Works private fulfilment and Access tests passed.");
