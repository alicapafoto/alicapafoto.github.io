import { fetchWithTimeout } from "./fetch.js";

function stripeHeaders(env, idempotencyKey = "") {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  const headers = {
    authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    "content-type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return headers;
}

function append(params, key, value) {
  if (value === undefined || value === null) return;
  params.append(key, String(value));
}

export async function createStripeCheckoutSession({
  env,
  siteOrigin,
  product,
  priceCents,
  countryCode,
  shipping,
  quote,
  idempotencyKey,
}) {
  const work = product.work;
  const params = new URLSearchParams();
  append(params, "mode", "payment");
  append(params, "payment_method_types[0]", "card");
  append(params, "success_url", `${siteOrigin}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`);
  append(params, "cancel_url", `${siteOrigin}/checkout-cancelled.html#${work.id}`);
  append(params, "client_reference_id", `acf_${crypto.randomUUID()}`);
  append(params, "customer_creation", "if_required");
  append(params, "billing_address_collection", "auto");
  append(params, "phone_number_collection[enabled]", "true");
  append(params, "consent_collection[terms_of_service]", "required");
  append(params, "submit_type", "pay");
  append(params, "expires_at", Math.floor(Date.now() / 1000) + 60 * 60);

  append(params, "line_items[0][quantity]", "1");
  append(params, "line_items[0][price_data][currency]", "eur");
  append(params, "line_items[0][price_data][unit_amount]", priceCents);
  append(params, "line_items[0][price_data][product_data][name]", `${work.title}, ${product.label}`);
  append(params, "line_items[0][price_data][product_data][description]", product.productType === "book"
    ? `${product.size} Â· ${product.paper} Â· 132 interior pages`
    : `${product.size} Â· ${product.paper} Â· Unframed`);
  append(params, "line_items[0][price_data][product_data][images][0]", `${siteOrigin}${work.previewPath}`);

  append(params, "shipping_address_collection[allowed_countries][0]", countryCode);
  append(params, "shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  append(params, "shipping_options[0][shipping_rate_data][display_name]", `Shipping and handling Â· ${formatMethod(quote.method)}`);
  append(params, "shipping_options[0][shipping_rate_data][fixed_amount][amount]", shipping.customerCents);
  append(params, "shipping_options[0][shipping_rate_data][fixed_amount][currency]", "eur");

  const metadata = {
    schema_version: "3",
    product_id: product.id,
    artwork: work.title,
    variant_label: product.label,
    store_sku: product.storeSku,
    provider: product.provider,
    provider_sku: product.providerSku,
    paper: product.paper,
    print_size: product.size,
    product_type: product.productType || "print",
    edition_size: product.editionSize || "",
    destination_country: countryCode,
    shipping_method: quote.method,
    provider_item_quote_eur: quote.itemAmount.toFixed(2),
    provider_shipping_quote_eur: quote.shippingAmount.toFixed(2),
    customer_shipping_cents: String(shipping.customerCents),
    provider_tax_rate: shipping.taxRate.toFixed(4),
    provider_item_tax_cents: String(shipping.itemTaxCents),
    provider_shipping_tax_cents: String(shipping.shippingTaxCents),
    estimated_provider_total_cents: String(shipping.estimatedProviderTotalCents),
    quote_created_at: new Date().toISOString(),
    fulfillment_country: quote.fulfillmentCountry,
    fulfillment_lab: quote.labCode,
    store_price_cents: String(priceCents),
    initial_status: "Paid â€” Awaiting Wise",
  };

  for (const [key, value] of Object.entries(metadata)) {
    append(params, `metadata[${key}]`, value);
    append(params, `payment_intent_data[metadata][${key}]`, value);
  }

  const response = await fetchWithTimeout("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: stripeHeaders(env, idempotencyKey),
    body: params,
  }, 15_000, "Stripe Checkout session creation");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.url) {
    const message = payload?.error?.message || "Stripe could not create the checkout session";
    throw new Error(message);
  }
  return payload;
}

export async function retrieveCheckoutSession(env, sessionId) {
  const query = new URLSearchParams();
  query.append("expand[]", "line_items");
  query.append("expand[]", "payment_intent.latest_charge.balance_transaction");
  const response = await fetchWithTimeout(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?${query}`, {
    headers: stripeHeaders(env),
  }, 12_000, "Stripe Checkout session lookup");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "Stripe session lookup failed");
  return payload;
}

function formatMethod(method) {
  return String(method || "standard")
    .replace("standardplus", "Standard Plus")
    .replace(/^./, (character) => character.toUpperCase());
}

function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0) return new Uint8Array();
  const output = new Uint8Array(hex.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function verifyStripeWebhook({ payload, signatureHeader, secret, toleranceSeconds = 300 }) {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  ));

  return signatures.some((signature) => timingSafeEqual(digest, hexToBytes(signature)));
}

