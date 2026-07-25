import { ALLOWED_COUNTRY_CODES, getShippingRegion } from "./products.js";

const POSTAL_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .\-/]{1,15}$/;
const DHL_LIVE_ADAPTER_IMPLEMENTED = false;

function shippingMode(env = {}) {
  return String(env.ORIGINAL_WORKS_SHIPPING_MODE || "disabled").toLowerCase();
}

function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function mockRates(env = {}) {
  if (!env.ORIGINAL_WORKS_MOCK_SHIPPING_CENTS_JSON) return null;
  try {
    const parsed = JSON.parse(env.ORIGINAL_WORKS_MOCK_SHIPPING_CENTS_JSON);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function normalizeOriginalArtworkShippingAddress(input = {}) {
  const countryCode = cleanText(input.countryCode, 2).toUpperCase();
  const postalCode = cleanText(input.postalCode, 16);
  const recipientName = cleanText(input.recipientName, 100);
  const addressLine1 = cleanText(input.addressLine1, 120);
  const addressLine2 = cleanText(input.addressLine2, 120);
  const city = cleanText(input.city, 80);
  const state = cleanText(input.state, 80);

  if (!ALLOWED_COUNTRY_CODES.has(countryCode)) throw new Error("Delivery is unavailable for that country.");
  if (!POSTAL_CODE_PATTERN.test(postalCode)) throw new Error("Enter a valid destination postal code.");
  if (recipientName.length < 2) throw new Error("Enter the recipient name.");
  if (addressLine1.length < 3) throw new Error("Enter the delivery address.");
  if (city.length < 2) throw new Error("Enter the delivery city.");

  return {
    recipientName,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    countryCode,
  };
}

export function isOriginalArtworkShippingConfigured(env = {}) {
  const mode = shippingMode(env);
  if (mode === "mock") {
    return String(env.STORE_ENV || "").toLowerCase() !== "live" && Boolean(mockRates(env));
  }
  if (mode === "dhl-live") {
    return Boolean(
      DHL_LIVE_ADAPTER_IMPLEMENTED
      && env.DHL_API_KEY
      && env.DHL_API_SECRET
      && env.DHL_ACCOUNT_NUMBER
      && env.DHL_ORIGIN_COUNTRY
      && env.DHL_ORIGIN_POSTAL_CODE
      && env.DHL_ORIGIN_CITY
    );
  }
  return false;
}

function configuredMockCents(env, countryCode) {
  const rates = mockRates(env);
  const region = getShippingRegion(countryCode);
  const value = rates?.[countryCode] ?? rates?.[region] ?? rates?.ROW;
  const cents = Number(value);
  if (!Number.isInteger(cents) || cents < 0) throw new Error("The test shipping rate is not configured for this destination.");
  return cents;
}

export async function quoteOriginalArtworkShipping({ artwork, shippingAddress, env = {} }) {
  const destination = normalizeOriginalArtworkShippingAddress(shippingAddress);
  const mode = shippingMode(env);
  if (!isOriginalArtworkShippingConfigured(env)) {
    throw new Error("Insured delivery is not configured yet.");
  }

  if (mode === "mock") {
    const customerCents = configuredMockCents(env, destination.countryCode);
    return {
      source: "mock",
      provider: "DHL",
      method: "DHL Express Worldwide",
      customerCents,
      carrierCents: customerCents,
      currency: "EUR",
      insuredValueCents: artwork.declaredValueCents,
      destinationCountry: destination.countryCode,
      parcel: { ...artwork.parcel },
      estimateNote: "Insured express delivery. Final transit time is confirmed by the carrier.",
      quoteCreatedAt: new Date().toISOString(),
    };
  }

  throw new Error("The DHL live quote adapter is awaiting approved credentials and implementation.");
}
