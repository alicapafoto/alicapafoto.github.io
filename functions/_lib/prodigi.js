import { fetchWithTimeout } from "./fetch.js";

const METHODS = ["budget", "standard", "standardplus", "express", "overnight"];

function prodigiBase(env) {
  if (env.PRODIGI_API_BASE) return String(env.PRODIGI_API_BASE).replace(/\/$/, "");
  return String(env.STORE_ENV || "test").toLowerCase() === "live"
    ? "https://api.prodigi.com/v4.0"
    : "https://api.sandbox.prodigi.com/v4.0";
}

export async function getProdigiQuotes({ env, sku, countryCode, quantity = 1, attributes = {} }) {
  if (!env.PRODIGI_API_KEY) throw new Error("Prodigi API is not configured");

  const response = await fetchWithTimeout(`${prodigiBase(env)}/quotes`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.PRODIGI_API_KEY,
    },
    body: JSON.stringify({
      destinationCountryCode: countryCode,
      currencyCode: "EUR",
      items: [{
        sku,
        copies: quantity,
        attributes,
        assets: [{ printArea: "default" }],
      }],
    }),
  }, 12_000, "Prodigi delivery quote");

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.quotes) || payload.quotes.length === 0) {
    const description = payload?.data?.description || payload?.statusText || "No shipping quote is available";
    throw new Error(`Prodigi quote failed: ${description}`);
  }

  return payload;
}

export function chooseBestQuote(payload) {
  const valid = payload.quotes
    .filter((quote) => quote?.costSummary?.shipping?.currency === "EUR")
    .map((quote) => ({
      raw: quote,
      method: String(quote.shipmentMethod || "").toLowerCase(),
      itemAmount: Number.parseFloat(quote.costSummary.items.amount),
      shippingAmount: Number.parseFloat(quote.costSummary.shipping.amount),
    }))
    .filter((quote) => Number.isFinite(quote.shippingAmount) && Number.isFinite(quote.itemAmount));

  if (valid.length === 0) throw new Error("Prodigi returned no usable EUR quote");

  valid.sort((a, b) => {
    const aTotal = a.itemAmount + a.shippingAmount;
    const bTotal = b.itemAmount + b.shippingAmount;
    if (aTotal !== bTotal) return aTotal - bTotal;
    return METHODS.indexOf(a.method) - METHODS.indexOf(b.method);
  });

  const selected = valid[0];
  const shipment = selected.raw.shipments?.[0] || {};
  return {
    method: selected.method || "standard",
    itemAmount: selected.itemAmount,
    shippingAmount: selected.shippingAmount,
    currency: "EUR",
    carrier: shipment.carrier?.name || "Prodigi fulfilment partner",
    service: shipment.carrier?.service || selected.method,
    fulfillmentCountry: shipment.fulfillmentLocation?.countryCode || "",
    labCode: shipment.fulfillmentLocation?.labCode || "",
    issues: payload.issues || [],
  };
}

function getTaxRate(countryCode, env = {}) {
  let overrides = {};
  try {
    overrides = JSON.parse(env.PRODIGI_TAX_RATES_JSON || "{}");
  } catch {
    throw new Error("PRODIGI_TAX_RATES_JSON must be valid JSON");
  }

  const normalized = String(countryCode || "").toUpperCase();
  const override = Number.parseFloat(overrides[normalized]);
  if (Number.isFinite(override)) return Math.min(1, Math.max(0, override));

  const fallback = Number.parseFloat(env.PRODIGI_DEFAULT_TAX_RATE || "0.20");
  return Number.isFinite(fallback) ? Math.min(1, Math.max(0, fallback)) : 0.20;
}

export function calculateCustomerShippingCents(quote, countryCode, env = {}) {
  const taxRate = getTaxRate(countryCode, env);
  const processingRate = Math.min(0.20, Math.max(0, Number.parseFloat(env.SHIPPING_PROCESSING_RATE || "0.035")));
  const handlingCents = Math.max(0, Number.parseInt(env.SHIPPING_HANDLING_CENTS || "50", 10));

  const itemBaseCents = Math.round(quote.itemAmount * 100);
  const shippingBaseCents = Math.round(quote.shippingAmount * 100);
  const itemTaxCents = Math.ceil(itemBaseCents * taxRate);
  const shippingTaxCents = Math.ceil(shippingBaseCents * taxRate);
  const shippingWithTaxCents = shippingBaseCents + shippingTaxCents;
  const grossedUpCents = Math.ceil(shippingWithTaxCents / (1 - processingRate));

  return {
    taxRate,
    itemBaseCents,
    shippingBaseCents,
    itemTaxCents,
    shippingTaxCents,
    estimatedProviderTotalCents: itemBaseCents + shippingBaseCents + itemTaxCents + shippingTaxCents,
    processingRate,
    handlingCents,
    customerCents: grossedUpCents + handlingCents,
  };
}
