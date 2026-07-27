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

export async function createOriginalArtworkCheckoutSession({
  env,
  siteOrigin,
  product,
  countryCode,
  quote,
  reservationToken,
  idempotencyKey,
}) {
  const params = new URLSearchParams();
  append(params, "mode", "payment");
  append(params, "payment_method_types[0]", "card");
  append(params, "success_url", `${siteOrigin}/artwork-checkout-success.html?session_id={CHECKOUT_SESSION_ID}`);
  append(params, "cancel_url", `${siteOrigin}/artworks.html#${product.id.replace(/^original-/, "")}`);
  append(params, "client_reference_id", `acf_art_${crypto.randomUUID()}`);
  append(params, "customer_creation", "if_required");
  append(params, "billing_address_collection", "auto");
  append(params, "phone_number_collection[enabled]", "true");
  append(params, "consent_collection[terms_of_service]", "required");
  append(params, "submit_type", "pay");
  append(params, "expires_at", Math.floor(Date.now() / 1000) + 30 * 60);

  append(params, "line_items[0][quantity]", "1");
  append(params, "line_items[0][price_data][currency]", "eur");
  append(params, "line_items[0][price_data][unit_amount]", product.priceCents);
  append(params, "line_items[0][price_data][product_data][name]", `${product.title}, unique original`);
  append(params, "line_items[0][price_data][product_data][description]", `${product.size} · ${product.medium} · ${product.presentation}`);
  append(params, "line_items[0][price_data][product_data][images][0]", `${siteOrigin}${product.previewPath}`);

  append(params, "shipping_address_collection[allowed_countries][0]", countryCode);
  append(params, "shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  append(params, "shipping_options[0][shipping_rate_data][display_name]", "Tracked protective delivery");
  append(params, "shipping_options[0][shipping_rate_data][fixed_amount][amount]", quote.shippingCents);
  append(params, "shipping_options[0][shipping_rate_data][fixed_amount][currency]", "eur");

  const providerShippingEur = (quote.shippingCents / 100).toFixed(2);
  const metadata = {
    schema_version: "4",
    product_kind: "original-artwork",
    product_id: product.id,
    artwork: product.title,
    variant_label: product.label,
    store_sku: product.storeSku,
    provider: product.provider,
    provider_sku: product.providerSku,
    paper: "Original mixed-media artwork",
    print_size: product.size,
    edition_size: "1",
    destination_country: countryCode,
    shipping_method: quote.shippingMethod,
    provider_item_quote_eur: "0.00",
    provider_shipping_quote_eur: providerShippingEur,
    customer_shipping_cents: String(quote.shippingCents),
    provider_tax_rate: "0.0000",
    provider_item_tax_cents: "0",
    provider_shipping_tax_cents: "0",
    estimated_provider_total_cents: String(quote.shippingCents),
    quote_created_at: new Date().toISOString(),
    fulfillment_country: "PT",
    fulfillment_lab: "Ali Capa studio",
    store_price_cents: String(product.priceCents),
    reservation_token: reservationToken,
    initial_status: "Paid — Awaiting Wise",
  };

  for (const [key, value] of Object.entries(metadata)) {
    append(params, `metadata[${key}]`, value);
    append(params, `payment_intent_data[metadata][${key}]`, value);
  }

  const response = await fetchWithTimeout("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: stripeHeaders(env, idempotencyKey),
    body: params,
  }, 15_000, "Original artwork Stripe Checkout session creation");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.url) {
    throw new Error(payload?.error?.message || "Stripe could not create the artwork checkout session");
  }
  return payload;
}
