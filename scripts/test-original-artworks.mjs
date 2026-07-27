import assert from 'node:assert/strict';
import { onRequest as artworkCatalog } from '../functions/api/artworks-catalog.js';
import { onRequest as artworkQuote } from '../functions/api/artworks-quote.js';
import { onRequest as artworkCheckout } from '../functions/api/artworks-checkout.js';

class MemoryD1 {
  constructor() {
    this.inventory = new Map();
    this.orders = new Map();
  }

  prepare(sql) {
    return new MemoryStatement(this, sql);
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

class MemoryStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, ' ').trim();
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async run() {
    const upper = this.sql.toUpperCase();
    if (upper.startsWith('CREATE TABLE') || upper.startsWith('CREATE INDEX')) {
      return { meta: { changes: 0 } };
    }

    if (upper.startsWith('DELETE FROM ARTWORK_INVENTORY') && upper.includes('EXPIRES_AT <= ?')) {
      const [productId, now] = this.args;
      const row = this.db.inventory.get(productId);
      if (row?.status === 'reserved' && row.expires_at <= now) {
        this.db.inventory.delete(productId);
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }

    if (upper.startsWith('INSERT OR IGNORE INTO ARTWORK_INVENTORY')) {
      const [productId, reservationToken, expiresAt, createdAt, updatedAt] = this.args;
      if (this.db.inventory.has(productId)) return { meta: { changes: 0 } };
      this.db.inventory.set(productId, {
        product_id: productId,
        status: 'reserved',
        reservation_token: reservationToken,
        checkout_session_id: null,
        expires_at: expiresAt,
        created_at: createdAt,
        updated_at: updatedAt,
        sold_at: null,
      });
      return { meta: { changes: 1 } };
    }

    if (upper.startsWith('UPDATE ARTWORK_INVENTORY') && upper.includes("SET STATUS = 'RESERVED'")) {
      const [reservationToken, expiresAt, updatedAt, productId, now, matchingToken] = this.args;
      const row = this.db.inventory.get(productId);
      if (!row || row.status !== 'reserved' || (row.expires_at > now && row.reservation_token !== matchingToken)) {
        return { meta: { changes: 0 } };
      }
      Object.assign(row, {
        status: 'reserved',
        reservation_token: reservationToken,
        checkout_session_id: null,
        expires_at: expiresAt,
        updated_at: updatedAt,
        sold_at: null,
      });
      return { meta: { changes: 1 } };
    }

    if (upper.startsWith('UPDATE ARTWORK_INVENTORY') && upper.includes('SET CHECKOUT_SESSION_ID = ?')) {
      const [sessionId, updatedAt, productId, reservationToken] = this.args;
      const row = this.db.inventory.get(productId);
      if (!row || row.status !== 'reserved' || row.reservation_token !== reservationToken) {
        return { meta: { changes: 0 } };
      }
      Object.assign(row, { checkout_session_id: sessionId, updated_at: updatedAt });
      return { meta: { changes: 1 } };
    }

    if (upper.startsWith('DELETE FROM ARTWORK_INVENTORY') && upper.includes('RESERVATION_TOKEN = ?')) {
      const [productId, reservationToken] = this.args;
      const row = this.db.inventory.get(productId);
      if (row?.status === 'reserved' && row.reservation_token === reservationToken) {
        this.db.inventory.delete(productId);
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }

    throw new Error(`Unsupported MemoryD1 run query: ${this.sql}`);
  }

  async first() {
    const upper = this.sql.toUpperCase();
    if (upper.includes('FROM ORDER_EVENTS') && upper.includes("STATUS = 'COMPLETED'")) {
      const [productId] = this.args;
      for (const [sessionId, order] of this.db.orders) {
        if (order.status === 'completed' && order.productId === productId) return { session_id: sessionId };
      }
      return null;
    }

    if (upper.includes('FROM ARTWORK_INVENTORY')) {
      const [productId] = this.args;
      const row = this.db.inventory.get(productId);
      return row ? { ...row } : null;
    }

    return null;
  }
}

const env = {
  SITE_URL: 'https://example.test',
  STRIPE_SECRET_KEY: 'sk_test_example',
  STRIPE_WEBHOOK_SECRET: 'whsec_example',
  GOOGLE_SHEET_ID: 'sheet_example',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'service@example.test',
  GOOGLE_PRIVATE_KEY: 'example',
  ORDER_LEDGER: new MemoryD1(),
};

const catalogResponse = await artworkCatalog({
  request: new Request('https://example.test/api/artworks-catalog'),
  env,
});
assert.equal(catalogResponse.status, 200);
const catalogPayload = await catalogResponse.json();
assert.equal(catalogPayload.products.length, 4);
assert.ok(catalogPayload.products.every((product) => product.priceCents === 25000));
assert.ok(catalogPayload.products.every((product) => product.checkoutReady));
assert.ok(catalogPayload.countries.some((country) => country.code === 'PT'));
assert.ok(catalogPayload.countries.some((country) => country.code === 'ES'));
assert.ok(catalogPayload.countries.some((country) => country.code === 'FR'));
assert.ok(catalogPayload.countries.some((country) => country.code === 'GB'));
assert.ok(catalogPayload.countries.some((country) => country.code === 'US'));
assert.ok(catalogPayload.countries.some((country) => country.code === 'CA'));
assert.ok(!catalogPayload.countries.some((country) => country.code === 'AU'));

for (const [countryCode, expectedShipping] of [['PT', 2500], ['ES', 4000], ['FR', 6500], ['GB', 10000], ['US', 7000], ['CA', 7000]]) {
  const response = await artworkQuote({
    request: new Request('https://example.test/api/artworks-quote', {
      method: 'POST',
      headers: { origin: 'https://example.test', 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'original-dusaemas', countryCode }),
    }),
    env,
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.priceCents, 25000);
  assert.equal(payload.shippingCents, expectedShipping);
  assert.equal(payload.totalCents, 25000 + expectedShipping);
}

const unsupportedResponse = await artworkQuote({
  request: new Request('https://example.test/api/artworks-quote', {
    method: 'POST',
    headers: { origin: 'https://example.test', 'content-type': 'application/json' },
    body: JSON.stringify({ productId: 'original-dusaemas', countryCode: 'AU' }),
  }),
  env,
});
assert.equal(unsupportedResponse.status, 400);

let stripeBody = '';
let stripeIdempotencyKey = '';
globalThis.fetch = async (url, init = {}) => {
  if (String(url).includes('api.stripe.com')) {
    stripeBody = String(init.body);
    stripeIdempotencyKey = init.headers?.['Idempotency-Key'] || '';
    return new Response(JSON.stringify({ id: 'cs_art_test_123', url: 'https://checkout.stripe.test/artwork' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  throw new Error(`Unexpected fetch: ${url}`);
};

const reservationToken = '33333333-3333-4333-8333-333333333333';
const checkoutResponse = await artworkCheckout({
  request: new Request('https://example.test/api/artworks-checkout', {
    method: 'POST',
    headers: { origin: 'https://example.test', 'content-type': 'application/json' },
    body: JSON.stringify({ productId: 'original-dusaemas', countryCode: 'US', reservationToken }),
  }),
  env,
});
assert.equal(checkoutResponse.status, 200);
const checkoutPayload = await checkoutResponse.json();
assert.equal(checkoutPayload.priceCents, 25000);
assert.equal(checkoutPayload.shippingCents, 7000);
assert.equal(checkoutPayload.totalCents, 32000);
assert.match(stripeIdempotencyKey, /33333333-3333-4333-8333-333333333333/);

const stripeParams = new URLSearchParams(stripeBody);
assert.equal(stripeParams.get('line_items[0][price_data][unit_amount]'), '25000');
assert.equal(stripeParams.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '7000');
assert.equal(stripeParams.get('shipping_address_collection[allowed_countries][0]'), 'US');
assert.equal(stripeParams.get('metadata[product_kind]'), 'original-artwork');
assert.equal(stripeParams.get('metadata[store_sku]'), 'ART-DUSAEMAS-2022');
assert.match(stripeParams.get('success_url'), /artwork-checkout-success\.html/);
const expiresAt = Number(stripeParams.get('expires_at'));
const secondsFromNow = expiresAt - Math.floor(Date.now() / 1000);
assert.ok(secondsFromNow >= 29 * 60 && secondsFromNow <= 31 * 60);

const competingCheckout = await artworkCheckout({
  request: new Request('https://example.test/api/artworks-checkout', {
    method: 'POST',
    headers: { origin: 'https://example.test', 'content-type': 'application/json' },
    body: JSON.stringify({
      productId: 'original-dusaemas',
      countryCode: 'US',
      reservationToken: '44444444-4444-4444-8444-444444444444',
    }),
  }),
  env,
});
assert.equal(competingCheckout.status, 409);
assert.match((await competingCheckout.json()).error, /temporarily reserved/i);

const reservedCatalogResponse = await artworkCatalog({
  request: new Request('https://example.test/api/artworks-catalog'),
  env,
});
const reservedCatalog = await reservedCatalogResponse.json();
const reservedProduct = reservedCatalog.products.find((product) => product.id === 'original-dusaemas');
assert.equal(reservedProduct.availability, 'reserved');
assert.equal(reservedProduct.checkoutReady, false);

console.log('Original artwork checkout tests passed.');
