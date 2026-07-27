import { COUNTRIES } from "./products.js";

const EU_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
  "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT",
  "RO", "SK", "SI", "ES", "SE",
]);

const SHIPPING_CENTS = Object.freeze({
  PT: 2500,
  ES: 4000,
  EU: 6500,
  GB: 10000,
  US: 7000,
  CA: 7000,
});

const DELIVERY_NOTES = Object.freeze({
  PT: "Tracked protective delivery from Aveiro. Estimated transit is usually 1 to 3 business days.",
  ES: "Tracked protective delivery from Aveiro. Estimated transit is usually 1 to 3 business days.",
  EU: "Tracked protective delivery from Aveiro. Estimated transit is usually 3 to 7 business days.",
  GB: "Tracked protective delivery from Aveiro. Estimated transit is usually 5 to 9 business days; customs processing may add time.",
  US: "Tracked protective delivery from Aveiro. Estimated transit is usually 4 to 8 business days; customs processing may add time.",
  CA: "Tracked protective delivery from Aveiro. Estimated transit is usually 4 to 8 business days; customs processing may add time.",
});

function artwork({ id, title, size, imagePath, storeSku }) {
  return Object.freeze({
    id,
    kind: "original-artwork",
    title,
    label: "Unique original",
    storeSku,
    provider: "Ali Capa Foto",
    providerSku: "",
    priceCents: 25000,
    availability: "available",
    unique: true,
    year: 2022,
    size,
    medium: "Photographic emulsion on wood, 24 karat gold, acrylic paint and varnish",
    presentation: "Original solid wood frame and glass",
    previewPath: imagePath,
  });
}

export const ORIGINAL_ARTWORK_PRODUCTS = Object.freeze([
  artwork({
    id: "original-dusaemas",
    title: "DusaEmas",
    size: "30 × 40 cm, framed",
    imagePath: "/images/work-dusaemas-detail.jpg",
    storeSku: "ART-DUSAEMAS-2022",
  }),
  artwork({
    id: "original-gold",
    title: "Gold",
    size: "40 × 30 cm, framed",
    imagePath: "/images/work-gold-detail.jpg",
    storeSku: "ART-GOLD-2022",
  }),
  artwork({
    id: "original-study",
    title: "Study",
    size: "40 × 30 cm, framed",
    imagePath: "/images/work-study-detail.jpg",
    storeSku: "ART-STUDY-2022",
  }),
  artwork({
    id: "original-untitled",
    title: "Untitled",
    size: "30 × 40 cm, framed",
    imagePath: "/images/work-untitled-detail.jpg",
    storeSku: "ART-UNTITLED-2022",
  }),
]);

const ARTWORKS_BY_ID = new Map(ORIGINAL_ARTWORK_PRODUCTS.map((product) => [product.id, product]));

export function getOriginalArtwork(productId) {
  return ARTWORKS_BY_ID.get(String(productId || "")) || null;
}

export function getOriginalArtworkShippingKey(countryCode) {
  const country = String(countryCode || "").toUpperCase();
  if (["PT", "ES", "GB", "US", "CA"].includes(country)) return country;
  if (EU_COUNTRY_CODES.has(country)) return "EU";
  return null;
}

export function getOriginalArtworkShippingCents(countryCode) {
  const key = getOriginalArtworkShippingKey(countryCode);
  return key ? SHIPPING_CENTS[key] : null;
}

export function getOriginalArtworkDeliveryNote(countryCode) {
  const key = getOriginalArtworkShippingKey(countryCode);
  return key ? DELIVERY_NOTES[key] : "Delivery is currently unavailable for this destination.";
}

export function isOriginalArtworkCountryAllowed(countryCode) {
  return getOriginalArtworkShippingCents(countryCode) !== null;
}

export function getOriginalArtworkCountries() {
  return COUNTRIES
    .filter(([code]) => isOriginalArtworkCountryAllowed(code))
    .map(([code, name]) => ({ code, name }));
}

export function quoteOriginalArtwork(product, countryCode) {
  const shippingCents = getOriginalArtworkShippingCents(countryCode);
  if (!product || shippingCents === null) throw new Error("Delivery is not configured for that destination");
  return {
    productId: product.id,
    countryCode: String(countryCode || "").toUpperCase(),
    currency: "EUR",
    priceCents: product.priceCents,
    shippingCents,
    totalCents: product.priceCents + shippingCents,
    shippingMethod: "tracked-protective",
    estimateNote: getOriginalArtworkDeliveryNote(countryCode),
  };
}
