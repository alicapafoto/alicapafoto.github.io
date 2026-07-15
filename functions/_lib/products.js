export const PRODUCTS = Object.freeze({
  "ataquas-open": Object.freeze({
    id: "ataquas-open",
    title: "AtaquaS",
    subtitle: "Open-edition photographic print",
    provider: "Prodigi",
    sku: "GLOBAL-PAP-12X18",
    paper: "Lustre Photo Paper (LPP), 240 gsm",
    size: "30 × 45 cm / 12 × 18 in",
    aspectRatio: "2:3 portrait",
    imagePath: "/images/prints/ataquas.jpg",
    anchor: "ataquas",
    launchPriceCents: 3000,
    regularPriceCents: 3500,
    active: true,
  }),
  "eclaircisse-open": Object.freeze({
    id: "eclaircisse-open",
    title: "EclaircissE",
    subtitle: "Open-edition photographic print",
    provider: "Prodigi",
    sku: "GLOBAL-PAP-16X20",
    paper: "Lustre Photo Paper (LPP), 240 gsm",
    size: "40 × 50 cm / 16 × 20 in",
    aspectRatio: "4:5 portrait",
    imagePath: "/images/prints/eclaircisse.jpg",
    anchor: "eclaircisse",
    launchPriceCents: 3000,
    regularPriceCents: 3500,
    active: true,
  }),
  "oppia-open": Object.freeze({
    id: "oppia-open",
    title: "Öppiä",
    subtitle: "Open-edition collage print",
    provider: "Prodigi",
    sku: "GLOBAL-PAP-12X16",
    paper: "Lustre Photo Paper (LPP), 240 gsm",
    size: "30 × 40 cm / 12 × 16 in",
    aspectRatio: "4:3 landscape",
    imagePath: "/images/prints/oppia.jpg",
    anchor: "oppia",
    launchPriceCents: 3000,
    regularPriceCents: 3500,
    active: false,
  }),
  "independienta-open": Object.freeze({
    id: "independienta-open",
    title: "IndepenDienta",
    subtitle: "Open-edition collage print",
    provider: "Prodigi",
    sku: "GLOBAL-PAP-12X16",
    paper: "Lustre Photo Paper (LPP), 240 gsm",
    size: "30 × 40 cm / 12 × 16 in",
    aspectRatio: "4:3 landscape",
    imagePath: "/images/prints/independienta.jpg",
    anchor: "independienta",
    launchPriceCents: 3000,
    regularPriceCents: 3500,
    active: false,
  }),
});

export const COUNTRIES = Object.freeze([
  ["AT", "Austria"], ["BE", "Belgium"], ["BG", "Bulgaria"], ["HR", "Croatia"],
  ["CY", "Cyprus"], ["CZ", "Czechia"], ["DK", "Denmark"], ["EE", "Estonia"],
  ["FI", "Finland"], ["FR", "France"], ["DE", "Germany"], ["GR", "Greece"],
  ["HU", "Hungary"], ["IE", "Ireland"], ["IT", "Italy"], ["LV", "Latvia"],
  ["LT", "Lithuania"], ["LU", "Luxembourg"], ["MT", "Malta"], ["NL", "Netherlands"],
  ["PL", "Poland"], ["PT", "Portugal"], ["RO", "Romania"], ["SK", "Slovakia"],
  ["SI", "Slovenia"], ["ES", "Spain"], ["SE", "Sweden"], ["US", "United States"],
]);

export const ALLOWED_COUNTRY_CODES = new Set(COUNTRIES.map(([code]) => code));

export function getProduct(productId) {
  return PRODUCTS[productId] || null;
}

export function getCurrentPriceCents(product, env = {}) {
  const explicitMode = String(env.STORE_PRICE_MODE || "").toLowerCase();
  if (explicitMode === "regular") return product.regularPriceCents;
  if (explicitMode === "launch") return product.launchPriceCents;

  const endValue = env.INTRO_PRICE_END;
  if (endValue) {
    const end = Date.parse(endValue);
    if (Number.isFinite(end)) {
      return Date.now() <= end ? product.launchPriceCents : product.regularPriceCents;
    }
  }

  return product.launchPriceCents;
}

export function getPriceLabel(product, env = {}) {
  return getCurrentPriceCents(product, env) === product.launchPriceCents
    ? "Introductory price"
    : "Regular price";
}
