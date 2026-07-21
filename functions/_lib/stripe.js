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

async function postCheckoutSession(env, params, idempotencyKey, label = "Stripe Checkout session creation") {
  const response = await fetchWithTimeout("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: stripeHeaders(env, idempotencyKey),
    body: params,
  }, 15_000, label);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.url) {
    const message = payload?.error?.message || "Stripe could not create the checkout session";
    throw new Error(message);
  }
  return payload;
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
  append(params, "line_items[0][price_data][product_data][description]", `${product.size} · ${product.paper} · Unframed`);
  append(params, "line_items[0][price_data][product_data][images][0]", `${siteOrigin}${work.previewPath}`);

  append(params, "shipping_address_collection[allowed_countries][0]", countryCode);
  append(params, "shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  append(params, "shipping_options[0][shipping_rate_data][display_name]", `Shipping and handling · ${formatMethod(quote.method)}`);
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
    initial_status: "Paid — Awaiting Wise",
  };

  for (const [key, value] of Object.entries(metadata)) {
    append(params, `metadata[${key}]`, value);
    append(params, `payment_intent_data[metadata][${key}]`, value);
  }

  return postCheckoutSession(env, params, idempotencyKey);
}

export async function createOriginalArtworkCheckoutSession({
  env,
  siteOrigin,
  artwork,
  shippingAddress,
  shippingQuote,
  reservationId,
  idempotencyKey,
}) {
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
  const params = new URLSearchParams();
  append(params, "mode", "payment");
  append(params, "payment_method_types[0]", "card");
  append(params, "success_url", `${siteOrigin}/artwork-confirmed.html?session_id={CHECKOUT_SESSION_ID}`);
  append(params, "cancel_url", `${siteOrigin}/artwork-checkout-cancelled.html#${artwork.id}`);
  append(params, "client_reference_id", `aco_${crypto.randomUUID()}`);
  append(params, "customer_creation", "if_required");
  append(params, "billing_address_collection", "auto");
  append(params, "phone_number_collection[enabled]", "true");
  append(params, "consent_collection[terms_of_service]", "required");
  append(params, "submit_type", "pay");
  append(params, "expires_at", expiresAt);

  append(params, "line_items[0][quantity]", "1");
  append(params, "line_items[0][price_data][currency]", "eur");
  append(params, "line_items[0][price_data][unit_amount]", artwork.priceCents);
  append(params, "line_items[0][price_data][product_data][name]", `${artwork.title}, unique original artwork`);
  append(params, "line_items[0][price_data][product_data][description]", `${artwork.framed.widthCm} × ${artwork.framed.heightCm} cm framed · Photographic emulsion on wood, 24 karat gold, acrylic paint and varnish`);
  append(params, "line_items[0][price_data][product_data][images][0]", `${siteOrigin}/images/work-${artwork.id}-detail.jpg`);

  append(params, "shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  append(params, "shipping_options[0][shipping_rate_data][display_name]", `Insured delivery · ${shippingQuote.method}`);
  append(params, "shipping_options[0][shipping_rate_data][fixed_amount][amount]", shippingQuote.customerCents);
  append(params, "shipping_options[0][shipping_rate_data][fixed_amount][currency]", "eur");

  const providerShippingEur = (shippingQuote.carrierCents / 100).toFixed(2);
  const metadata = {
    schema_version: "4",
    order_type: "original-artwork",
    product_id: `original-${artwork.id}`,
    artwork_id: artwork.id,
    artwork: artwork.title,
    variant_label: "Unique original",
    store_sku: `ORIGINAL-${artwork.id.toUpperCase()}`,
    provider: "Ali Capa Foto",
    provider_sku: `ORIGINAL-${artwork.id.toUpperCase()}`,
    paper: "Original mixed media artwork",
    print_size: `${artwork.framed.widthCm} × ${artwork.framed.heightCm} cm framed`,
    edition_size: "1",
    destination_country: shippingAddress.countryCode,
    shipping_method: shippingQuote.method,
    shipping_quote_source: shippingQuote.source,
    provider_item_quote_eur: "0.00",
    provider_shipping_quote_eur: providerShippingEur,
    customer_shipping_cents: String(shippingQuote.customerCents),
    provider_tax_rate: "0.0000",
    provider_item_tax_cents: "0",
    provider_shipping_tax_cents: "0",
    estimated_provider_total_cents: String(shippingQuote.carrierCents),
    quote_created_at: shippingQuote.quoteCreatedAt,
    fulfillment_country: "PT",
    fulfillment_lab: "Ali Capa studio",
    store_price_cents: String(artwork.priceCents),
    declared_value_cents: String(artwork.declaredValueCents),
    reservation_id: reservationId,
    package_length_cm: String(artwork.parcel.lengthCm),
    package_width_cm: String(artwork.parcel.widthCm),
    package_height_cm: String(artwork.parcel.heightCm),
    package_weight_kg: String(artwork.parcel.weightKg),
    initial_status: "Paid — Original artwork awaiting shipment",
  };

  for (const [key, value] of Object.entries(metadata)) {
    append(params, `metadata[${key}]`, value);
    append(params, `payment_intent_data[metadata][${key}]`, value);
  }

  const session = await postCheckoutSession(env, params, idempotencyKey, "Original artwork Stripe Checkout creation");
  if (!session.expires_at) session.expires_at = expiresAt;
  return session;
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

export async function expireCheckoutSession(env, sessionId) {
  if (!sessionId) return null;
  const response = await fetchWithTimeout(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/expire`, {
    method: "POST",
    headers: stripeHeaders(env),
  }, 12_000, "Stripe Checkout session expiry");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && payload?.error?.code !== "checkout_session_not_open") {
    throw new Error(payload?.error?.message || "Stripe session could not be expired");
  }
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
