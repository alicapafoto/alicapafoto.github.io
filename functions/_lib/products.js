import { PRINT_CATALOG, findVariant, flattenVariants } from "../../catalog/prints.js";

export const COUNTRIES = Object.freeze([
  ["AT", "Austria"], ["BE", "Belgium"], ["BG", "Bulgaria"], ["HR", "Croatia"],
  ["CY", "Cyprus"], ["CZ", "Czechia"], ["DK", "Denmark"], ["EE", "Estonia"],
  ["FI", "Finland"], ["FR", "France"], ["DE", "Germany"], ["GR", "Greece"],
  ["HU", "Hungary"], ["IE", "Ireland"], ["IT", "Italy"], ["LV", "Latvia"],
  ["LT", "Lithuania"], ["LU", "Luxembourg"], ["MT", "Malta"], ["NL", "Netherlands"],
  ["PL", "Poland"], ["PT", "Portugal"], ["RO", "Romania"], ["SK", "Slovakia"],
  ["SI", "Slovenia"], ["ES", "Spain"], ["SE", "Sweden"], ["US", "United States"],
]);

export const EU_COUNTRY_CODES = new Set(COUNTRIES.map(([code]) => code).filter((code) => code !== "US"));
export const ALLOWED_COUNTRY_CODES = new Set(COUNTRIES.map(([code]) => code));
export const PRODUCTS = Object.freeze(Object.fromEntries(flattenVariants().map((entry) => [entry.id, Object.freeze(entry)])));

export function getProduct(productId) {
  return PRODUCTS[productId] || findVariant(productId);
}

export function getCurrentPriceCents(product) {
  return Number.isInteger(product?.priceCents) ? product.priceCents : null;
}

export function getPriceLabel(product) {
  if (product?.editionSize) return product.label;
  return "Price";
}

export function isSoldOut(product) {
  return Number.isInteger(product?.editionSize)
    && Number(product.soldCount || 0) >= product.editionSize;
}

export function isPubliclyAvailable(product) {
  return product?.availability === "available" && !isSoldOut(product);
}

export function getFixedShippingCents(product, countryCode, env = {}) {
  const prefix = product?.fulfillment?.envPrefix;
  if (!prefix) return null;
  const region = EU_COUNTRY_CODES.has(countryCode) ? "EU" : countryCode === "US" ? "US" : null;
  if (!region) return null;
  const raw = env[`${prefix}_SHIPPING_${region}_CENTS`];
  if (raw === undefined || raw === null || raw === "") return null;
  const cents = Number.parseInt(String(raw), 10);
  return Number.isFinite(cents) && cents >= 0 ? cents : null;
}

export function isProductCheckoutConfigured(product, env = {}) {
  if (!isPubliclyAvailable(product)) return false;
  const mode = product?.fulfillment?.mode;
  if (mode === "prodigi-live") return Boolean(env.PRODIGI_API_KEY && product.providerSku);
  if (mode === "configured-fixed") {
    return getFixedShippingCents(product, "PT", env) !== null
      && getFixedShippingCents(product, "US", env) !== null;
  }
  return false;
}

export function publicProductStatus(product, env = {}) {
  if (isSoldOut(product)) return { code: "sold-out", label: "Sold out", checkoutReady: false };
  if (product?.availability === "upcoming") return { code: "upcoming", label: "Available soon", checkoutReady: false };
  if (product?.availability === "proof-hold") return { code: "proof-hold", label: "Awaiting print approval", checkoutReady: false };
  if (!isProductCheckoutConfigured(product, env)) return { code: "shipping-setup", label: "Shipping setup in progress", checkoutReady: false };
  return { code: "available", label: "Choose destination", checkoutReady: true };
}

export function getPublicWorks() {
  return PRINT_CATALOG;
}
