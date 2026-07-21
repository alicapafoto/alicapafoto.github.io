import assert from 'node:assert/strict';
import { onRequest as catalog } from '../functions/api/catalog.js';
import { onRequest as quote } from '../functions/api/quote.js';
import { onRequest as checkout } from '../functions/api/create-checkout.js';
import { verifyStripeWebhook } from '../functions/_lib/stripe.js';
import { onRequest as stripeWebhook } from '../functions/api/stripe-webhook.js';

class MemoryD1 {
  constructor() {
    this.rows = new Map();
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

    if (upper.startsWith('INSERT OR IGNORE INTO ORDER_EVENTS')) {
      const [sessionId, eventId, eventType, leaseExpiresAt, createdAt, updatedAt] = this.args;
      if (this.db.rows.has(sessionId)) return { meta: { changes: 0 } };
      this.db.rows.set(sessionId, {
        session_id: sessionId,
        event_id: eventId,
        event_type: eventType,
        status: 'processing',
        sheet_synced: 0,
        attempt_count: 1,
        lease_expires_at: leaseExpiresAt,
        order_json: null,
        last_error: null,
        created_at: createdAt,
        updated_at: updatedAt,
        completed_at: null,
      });
      return { meta: { changes: 1 } };
    }

    if (upper.includes("SET EVENT_ID = ?") && upper.includes("STATUS = 'PROCESSING'")) {
      const [eventId, eventType, leaseExpiresAt, updatedAt, sessionId, now] = this.args;
      const row = this.db.rows.get(sessionId);
      if (!row || row.status === 'completed' || (row.status !== 'failed' && row.lease_expires_at > now)) {
        return { meta: { changes: 0 } };
      }
      Object.assign(row, {
        event_id: eventId,
        event_type: eventType,
        status: 'processing',
        attempt_count: row.attempt_count + 1,
        lease_expires_at: leaseExpiresAt,
        last_error: null,
        updated_at: updatedAt,
      });
      return { meta: { changes: 1 } };
    }

    if (upper.includes('SET ORDER_JSON = ?')) {
      const [orderJson, leaseExpiresAt, updatedAt, sessionId] = this.args;
      const row = this.db.rows.get(sessionId);
      if (!row || row.status !== 'processing') return { meta: { changes: 0 } };
      Object.assign(row, { order_json: orderJson, lease_expires_at: leaseExpiresAt, updated_at: updatedAt });
      return { meta: { changes: 1 } };
    }

    if (upper.includes("SET STATUS = 'COMPLETED'")) {
      const [sheetSynced, updatedAt, completedAt, sessionId] = this.args;
      const row = this.db.rows.get(sessionId);
      if (!row || row.status === 'completed') return { meta: { changes: 0 } };
      Object.assign(row, {
        status: 'completed',
        sheet_synced: sheetSynced,
        lease_expires_at: 0,
        last_error: null,
        updated_at: updatedAt,
        completed_at: completedAt,
      });
      return { meta: { changes: 1 } };
    }

    if (upper.includes("SET STATUS = 'FAILED'")) {
      const [lastError, updatedAt, sessionId] = this.args;
      const row = this.db.rows.get(sessionId);
      if (!row || row.status === 'completed') return { meta: { changes: 0 } };
      Object.assign(row, { status: 'failed', lease_expires_at: 0, last_error: lastError, updated_at: updatedAt });
      return { meta: { changes: 1 } };
    }

    throw new Error(`Unsupported MemoryD1 run query: ${this.sql}`);
  }

  async first() {
    const sessionId = this.args[0];
    const row = this.db.rows.get(sessionId);
    return row ? { ...row } : null;
  }
}

const prodigiPayload = {
  outcome: 'Created',
  quotes: [
    { shipmentMethod: 'Budget', costSummary: { items: { amount: '8.00', currency: 'EUR' }, shipping: { amount: '10.30', currency: 'EUR' } }, shipments: [{ fulfillmentLocation: { countryCode: 'NL', labCode: 'nl1' }, carrier: { name: 'test', service: 'Budget' } }] },
    { shipmentMethod: 'Standard', costSummary: { items: { amount: '8.00', currency: 'EUR' }, shipping: { amount: '9.45', currency: 'EUR' } }, shipments: [{ fulfillmentLocation: { countryCode: 'NL', labCode: 'nl1' }, carrier: { name: 'test', service: 'Standard' } }] },
  ],
};

const env = {
  SITE_URL: 'https://example.test',
  STRIPE_SECRET_KEY: 'sk_test_example',
  PRODIGI_API_KEY: 'prodigi_test',
  STRIPE_WEBHOOK_SECRET: 'whsec_example',
  GOOGLE_SHEET_ID: 'sheet_example',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'service@example.test',
  GOOGLE_PRIVATE_KEY: 'example',
  ORDER_LEDGER: new MemoryD1(),
  ORDER_EVENTS: { get: async () => null, put: async () => undefined },
  STORE_PRICE_MODE: 'launch',
  PRODIGI_DEFAULT_TAX_RATE: '0.20',
  PRODIGI_TAX_RATES_JSON: '{"US":0}',
  SHIPPING_PROCESSING_RATE: '0.035',
  SHIPPING_HANDLING_CENTS: '50',
  KAISAR_PRESENCE_SHIPPING_EU_CENTS: '2500',
  KAISAR_PRESENCE_SHIPPING_US_CENTS: '4500',
  KAISAR_IMMERSION_SHIPPING_EU_CENTS: '3500',
  KAISAR_IMMERSION_SHIPPING_US_CENTS: '5500',
  MERANO_REVERIE_SHIPPING_EU_CENTS: '2500',
  MERANO_REVERIE_SHIPPING_US_CENTS: '4500',
};

const catalogResponse = await catalog({ request: new Request('https://example.test/api/catalog'), env });
const catalogPayload = await catalogResponse.json();
assert.equal(catalogPayload.checkoutReady, true);
assert.equal(catalogPayload.products.find((p) => p.id === 'ataquas-open').priceCents, 3000);
assert.equal(catalogPayload.products.find((p) => p.id === 'eclaircisse-open').priceCents, 3500);
assert.equal(catalogPayload.products.find((p) => p.id === 'kaisar-presence').checkoutReady, true);
assert.equal(catalogPayload.products.find((p) => p.id === 'raabta-veil').checkoutReady, true);
assert.ok(catalogPayload.countries.length > 200);
assert.ok(catalogPayload.countries.some((country) => country.code === 'CA'));
assert.ok(catalogPayload.countries.some((country) => country.code === 'JP'));
assert.ok(catalogPayload.countries.some((country) => country.code === 'AU'));

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  if (String(url).includes('prodigi.com')) return new Response(JSON.stringify(prodigiPayload), { status: 200, headers: { 'content-type': 'application/json' } });
  throw new Error(`Unexpected fetch: ${url}`);
};
const quoteResponse = await quote({
  request: new Request('https://example.test/api/quote', { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'ataquas-open', countryCode: 'PT', priceCents: 1 }) }),
  env,
});
const quotePayload = await quoteResponse.json();
assert.equal(quotePayload.priceCents, 3000);
assert.equal(quotePayload.shippingMethod, 'standard');
assert.ok(quotePayload.shippingCents > 945);
const usQuoteResponse = await quote({
  request: new Request('https://example.test/api/quote', { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'ataquas-open', countryCode: 'US' }) }),
  env,
});
const usQuotePayload = await usQuoteResponse.json();
assert.ok(usQuotePayload.shippingCents < quotePayload.shippingCents);
const collectorQuoteResponse = await quote({
  request: new Request('https://example.test/api/quote', { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'kaisar-presence', countryCode: 'PT' }) }),
  env,
});
const collectorQuotePayload = await collectorQuoteResponse.json();
assert.equal(collectorQuotePayload.priceCents, 25000);
assert.equal(collectorQuotePayload.shippingCents, 1900);
assert.equal(collectorQuotePayload.totalCents, 26900);
for (const [countryCode, expectedShipping] of [['GB', 900], ['DE', 900], ['NO', 2100], ['US', 3100], ['CA', 4400], ['AU', 8200], ['JP', 8200]]) {
  const response = await quote({
    request: new Request('https://example.test/api/quote', { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'kaisar-presence', countryCode }) }),
    env,
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).shippingCents, expectedShipping);
}

let stripeBody = '';
let stripeIdempotencyKey = '';
globalThis.fetch = async (url, init = {}) => {
  if (String(url).includes('prodigi.com')) return new Response(JSON.stringify(prodigiPayload), { status: 200, headers: { 'content-type': 'application/json' } });
  if (String(url).includes('api.stripe.com')) {
    stripeBody = String(init.body);
    stripeIdempotencyKey = init.headers?.['Idempotency-Key'] || '';
    return new Response(JSON.stringify({ id: 'cs_test_123', url: 'https://checkout.stripe.test/session' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  throw new Error(`Unexpected fetch: ${url}`);
};
const checkoutResponse = await checkout({
  request: new Request('https://example.test/api/create-checkout', { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'ataquas-open', countryCode: 'PT', priceCents: 1, shippingCents: 1, checkoutAttemptId: '11111111-1111-4111-8111-111111111111' }) }),
  env,
});
assert.equal(checkoutResponse.status, 200);
const checkoutPayload = await checkoutResponse.json();
const stripeParams = new URLSearchParams(stripeBody);
assert.equal(stripeParams.get('line_items[0][price_data][unit_amount]'), '3000');
assert.equal(stripeParams.get('shipping_address_collection[allowed_countries][0]'), 'PT');
assert.notEqual(stripeParams.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '1');
assert.match(stripeIdempotencyKey, /11111111-1111-4111-8111-111111111111/);
assert.equal(checkoutPayload.priceCents, 3000);
assert.equal(checkoutPayload.shippingCents, Number(stripeParams.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]')));
assert.equal(checkoutPayload.totalCents, checkoutPayload.priceCents + checkoutPayload.shippingCents);
const collectorCheckoutResponse = await checkout({
  request: new Request('https://example.test/api/create-checkout', { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify({ productId: 'kaisar-presence', countryCode: 'PT', checkoutAttemptId: '22222222-2222-4222-8222-222222222222' }) }),
  env,
});
assert.equal(collectorCheckoutResponse.status, 200);
const collectorStripeParams = new URLSearchParams(stripeBody);
assert.equal(collectorStripeParams.get('line_items[0][price_data][unit_amount]'), '25000');
assert.equal(collectorStripeParams.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '1900');
assert.equal(collectorStripeParams.get('metadata[store_sku]'), 'KSR-PRL-PRESENCE-60X90');

const payload = JSON.stringify({ id: 'evt_test' });
const timestamp = Math.floor(Date.now() / 1000);
const secret = 'whsec_test';
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
const hex = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
assert.equal(await verifyStripeWebhook({ payload, signatureHeader: `t=${timestamp},v1=${hex}`, secret }), true);
assert.equal(await verifyStripeWebhook({ payload, signatureHeader: `t=${timestamp},v1=00`, secret }), false);

// End-to-end webhook ledger test: verified Stripe event, atomic D1 claim, RAW Sheets append, and duplicate suppression.
const rsaKeys = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', rsaKeys.privateKey));
const pemBody = Buffer.from(pkcs8).toString('base64').match(/.{1,64}/g).join('\n');
const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${pemBody}\n-----END PRIVATE KEY-----\n`;
const eventStore = new Map();
const webhookEnv = {
  ...env,
  ORDER_LEDGER: new MemoryD1(),
  STRIPE_WEBHOOK_SECRET: secret,
  GOOGLE_SHEET_ID: 'sheet_test',
  GOOGLE_SHEET_NAME: 'Orders',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'orders@example.iam.gserviceaccount.com',
  GOOGLE_PRIVATE_KEY: privateKeyPem,
  ORDER_EVENTS: {
    get: async (keyName) => eventStore.get(keyName) || null,
    put: async (keyName, value) => { eventStore.set(keyName, value); },
  },
};
const session = {
  id: 'cs_test_paid',
  created: timestamp,
  client_reference_id: 'acf_test',
  payment_status: 'paid',
  amount_subtotal: 3000,
  amount_total: 4200,
  total_details: { amount_shipping: 1200 },
  metadata: {
    product_id: 'ataquas-open', artwork: 'AtaquaS', variant_label: 'Dream Edition', store_sku: 'ATQ-LPP-30X45', provider: 'Prodigi', provider_sku: 'GLOBAL-PAP-12X18',
    print_size: '30 × 45 cm / 12 × 18 in', paper: 'LPP 240 gsm', store_price_cents: '3000',
    customer_shipping_cents: '1200', prodigi_item_quote_eur: '8.00', prodigi_shipping_quote_eur: '9.45',
    prodigi_item_tax_cents: '160', prodigi_shipping_tax_cents: '189', estimated_provider_total_cents: '2094',
    prodigi_shipping_method: 'standard', fulfillment_country: 'NL', fulfillment_lab: 'nl1', destination_country: 'PT',
  },
  payment_intent: { id: 'pi_test', latest_charge: { balance_transaction: { fee: 88 } } },
  line_items: { data: [{ quantity: 1, description: 'AtaquaS' }] },
  collected_information: { shipping_details: { name: '=HYPERLINK("https://bad.example","x")', address: { country: 'PT', line1: 'Rua Teste 1', city: 'Coimbra', postal_code: '3000-000' } } },
  customer_details: { email: 'collector@example.com', phone: '+351000000000' },
};
let sheetAppendCount = 0;
let sheetRequestUrl = '';
let sheetRequestBody = null;
const sheetSessions = new Set();
globalThis.fetch = async (url, init = {}) => {
  const target = String(url);
  if (target.includes('/v1/checkout/sessions/cs_test_paid')) return new Response(JSON.stringify(session), { status: 200, headers: { 'content-type': 'application/json' } });
  if (target === 'https://oauth2.googleapis.com/token') return new Response(JSON.stringify({ access_token: 'google_test_token' }), { status: 200, headers: { 'content-type': 'application/json' } });
  if (target.includes('sheets.googleapis.com') && String(init.method || 'GET').toUpperCase() === 'GET') {
    return new Response(JSON.stringify({ values: [[...sheetSessions]] }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (target.includes('sheets.googleapis.com')) {
    sheetAppendCount += 1;
    sheetRequestUrl = target;
    sheetRequestBody = JSON.parse(String(init.body));
    sheetSessions.add(String(sheetRequestBody.values[0][2]));
    return new Response(JSON.stringify({ updates: { updatedRows: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  throw new Error(`Unexpected webhook fetch: ${target}`);
};
const eventPayload = JSON.stringify({ id: 'evt_paid', type: 'checkout.session.completed', data: { object: { id: session.id } } });
const eventDigest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${eventPayload}`)));
const eventHex = [...eventDigest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const webhookRequest = () => new Request('https://example.test/api/stripe-webhook', {
  method: 'POST', body: eventPayload, headers: { 'stripe-signature': `t=${timestamp},v1=${eventHex}` },
});
const webhookResponse = await stripeWebhook({ request: webhookRequest(), env: webhookEnv });
assert.equal(webhookResponse.status, 200);
assert.equal(sheetAppendCount, 1);
assert.match(sheetRequestUrl, /valueInputOption=RAW/);
assert.equal(sheetRequestBody.values[0].length, 43);
assert.match(sheetRequestBody.values[0][29], /^=HYPERLINK/);
const ledgerRow = webhookEnv.ORDER_LEDGER.rows.get(session.id);
assert.equal(ledgerRow.status, 'completed');
assert.equal(ledgerRow.sheet_synced, 1);
assert.ok(ledgerRow.order_json.includes('ataquas-open'));
const duplicateResponse = await stripeWebhook({ request: webhookRequest(), env: webhookEnv });
assert.equal((await duplicateResponse.json()).duplicate, true);
assert.equal(sheetAppendCount, 1);

globalThis.fetch = realFetch;
console.log('Storefront unit tests passed.');
