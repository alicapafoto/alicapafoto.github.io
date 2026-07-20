import { PRINT_CATALOG, findVariant, flattenVariants } from "../../catalog/prints.js";

// Stripe Checkout accepts these ISO destination codes. Prodigi still validates
// Dream Edition availability through its live quote API for the selected route.
export const COUNTRIES = Object.freeze([
  ["AF", "Afghanistan"],
  ["AL", "Albania"],
  ["DZ", "Algeria"],
  ["AD", "Andorra"],
  ["AO", "Angola"],
  ["AI", "Anguilla"],
  ["AQ", "Antarctica"],
  ["AG", "Antigua and Barbuda"],
  ["AR", "Argentina"],
  ["AM", "Armenia"],
  ["AW", "Aruba"],
  ["AC", "Ascension Island"],
  ["AU", "Australia"],
  ["AT", "Austria"],
  ["AZ", "Azerbaijan"],
  ["BS", "Bahamas"],
  ["BH", "Bahrain"],
  ["BD", "Bangladesh"],
  ["BB", "Barbados"],
  ["BY", "Belarus"],
  ["BE", "Belgium"],
  ["BZ", "Belize"],
  ["BJ", "Benin"],
  ["BM", "Bermuda"],
  ["BT", "Bhutan"],
  ["BO", "Bolivia"],
  ["BA", "Bosnia and Herzegovina"],
  ["BW", "Botswana"],
  ["BV", "Bouvet Island"],
  ["BR", "Brazil"],
  ["IO", "British Indian Ocean Territory"],
  ["BN", "Brunei Darussalam"],
  ["BG", "Bulgaria"],
  ["BF", "Burkina Faso"],
  ["BI", "Burundi"],
  ["KH", "Cambodia"],
  ["CM", "Cameroon"],
  ["CA", "Canada"],
  ["CV", "Cape Verde"],
  ["BQ", "Caribbean Netherlands"],
  ["KY", "Cayman Islands"],
  ["CF", "Central African Republic"],
  ["TD", "Chad"],
  ["CL", "Chile"],
  ["CN", "China"],
  ["CO", "Colombia"],
  ["KM", "Comoros"],
  ["CK", "Cook Islands"],
  ["CR", "Costa Rica"],
  ["HR", "Croatia"],
  ["CW", "Curaçao"],
  ["CY", "Cyprus"],
  ["CZ", "Czechia"],
  ["CD", "Democratic Republic of the Congo"],
  ["DK", "Denmark"],
  ["DJ", "Djibouti"],
  ["DM", "Dominica"],
  ["DO", "Dominican Republic"],
  ["EC", "Ecuador"],
  ["EG", "Egypt"],
  ["SV", "El Salvador"],
  ["GQ", "Equatorial Guinea"],
  ["ER", "Eritrea"],
  ["EE", "Estonia"],
  ["SZ", "Eswatini"],
  ["ET", "Ethiopia"],
  ["FK", "Falkland Islands (Malvinas)"],
  ["FO", "Faroe Islands"],
  ["FJ", "Fiji"],
  ["FI", "Finland"],
  ["FR", "France"],
  ["GF", "French Guiana"],
  ["PF", "French Polynesia"],
  ["TF", "French Southern Territories"],
  ["GA", "Gabon"],
  ["GM", "Gambia"],
  ["GE", "Georgia"],
  ["DE", "Germany"],
  ["GH", "Ghana"],
  ["GI", "Gibraltar"],
  ["GR", "Greece"],
  ["GL", "Greenland"],
  ["GD", "Grenada"],
  ["GP", "Guadeloupe"],
  ["GU", "Guam"],
  ["GT", "Guatemala"],
  ["GG", "Guernsey"],
  ["GN", "Guinea"],
  ["GW", "Guinea-Bissau"],
  ["GY", "Guyana"],
  ["HT", "Haiti"],
  ["HN", "Honduras"],
  ["HK", "Hong Kong"],
  ["HU", "Hungary"],
  ["IS", "Iceland"],
  ["IN", "India"],
  ["ID", "Indonesia"],
  ["IQ", "Iraq"],
  ["IE", "Ireland"],
  ["IM", "Isle of Man"],
  ["IL", "Israel"],
  ["IT", "Italy"],
  ["CI", "Ivory Coast"],
  ["JM", "Jamaica"],
  ["JP", "Japan"],
  ["JE", "Jersey"],
  ["JO", "Jordan"],
  ["KZ", "Kazakhstan"],
  ["KE", "Kenya"],
  ["KI", "Kiribati"],
  ["XK", "Kosovo"],
  ["KW", "Kuwait"],
  ["KG", "Kyrgyzstan"],
  ["LA", "Laos"],
  ["LV", "Latvia"],
  ["LB", "Lebanon"],
  ["LS", "Lesotho"],
  ["LR", "Liberia"],
  ["LY", "Libya"],
  ["LI", "Liechtenstein"],
  ["LT", "Lithuania"],
  ["LU", "Luxembourg"],
  ["MO", "Macao"],
  ["MG", "Madagascar"],
  ["MW", "Malawi"],
  ["MY", "Malaysia"],
  ["MV", "Maldives"],
  ["ML", "Mali"],
  ["MT", "Malta"],
  ["MQ", "Martinique"],
  ["MR", "Mauritania"],
  ["MU", "Mauritius"],
  ["YT", "Mayotte"],
  ["MX", "Mexico"],
  ["MD", "Moldova"],
  ["MC", "Monaco"],
  ["MN", "Mongolia"],
  ["ME", "Montenegro"],
  ["MS", "Montserrat"],
  ["MA", "Morocco"],
  ["MZ", "Mozambique"],
  ["MM", "Myanmar"],
  ["NA", "Namibia"],
  ["NR", "Nauru"],
  ["NP", "Nepal"],
  ["NL", "Netherlands"],
  ["NC", "New Caledonia"],
  ["NZ", "New Zealand"],
  ["NI", "Nicaragua"],
  ["NE", "Niger"],
  ["NG", "Nigeria"],
  ["NU", "Niue"],
  ["MK", "North Macedonia"],
  ["NO", "Norway"],
  ["OM", "Oman"],
  ["PK", "Pakistan"],
  ["PS", "Palestinian Territories"],
  ["PA", "Panama"],
  ["PG", "Papua New Guinea"],
  ["PY", "Paraguay"],
  ["PE", "Peru"],
  ["PH", "Philippines"],
  ["PN", "Pitcairn"],
  ["PL", "Poland"],
  ["PT", "Portugal"],
  ["PR", "Puerto Rico"],
  ["QA", "Qatar"],
  ["CG", "Republic of the Congo"],
  ["RO", "Romania"],
  ["RU", "Russia"],
  ["RW", "Rwanda"],
  ["RE", "Réunion"],
  ["BL", "Saint Barthélemy"],
  ["SH", "Saint Helena"],
  ["KN", "Saint Kitts and Nevis"],
  ["LC", "Saint Lucia"],
  ["MF", "Saint Martin"],
  ["PM", "Saint Pierre and Miquelon"],
  ["VC", "Saint Vincent and the Grenadines"],
  ["WS", "Samoa"],
  ["SM", "San Marino"],
  ["ST", "Sao Tome and Principe"],
  ["SA", "Saudi Arabia"],
  ["SN", "Senegal"],
  ["RS", "Serbia"],
  ["SC", "Seychelles"],
  ["SL", "Sierra Leone"],
  ["SG", "Singapore"],
  ["SX", "Sint Maarten"],
  ["SK", "Slovakia"],
  ["SI", "Slovenia"],
  ["SB", "Solomon Islands"],
  ["SO", "Somalia"],
  ["ZA", "South Africa"],
  ["GS", "South Georgia and the South Sandwich Islands"],
  ["KR", "South Korea"],
  ["SS", "South Sudan"],
  ["ES", "Spain"],
  ["LK", "Sri Lanka"],
  ["SD", "Sudan"],
  ["SR", "Suriname"],
  ["SJ", "Svalbard and Jan Mayen"],
  ["SE", "Sweden"],
  ["CH", "Switzerland"],
  ["TW", "Taiwan"],
  ["TJ", "Tajikistan"],
  ["TZ", "Tanzania"],
  ["TH", "Thailand"],
  ["TL", "Timor-Leste"],
  ["TG", "Togo"],
  ["TK", "Tokelau"],
  ["TO", "Tonga"],
  ["TT", "Trinidad and Tobago"],
  ["TA", "Tristan da Cunha"],
  ["TN", "Tunisia"],
  ["TM", "Turkmenistan"],
  ["TC", "Turks and Caicos Islands"],
  ["TV", "Tuvalu"],
  ["TR", "Türkiye"],
  ["UG", "Uganda"],
  ["UA", "Ukraine"],
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["UY", "Uruguay"],
  ["UZ", "Uzbekistan"],
  ["VU", "Vanuatu"],
  ["VA", "Vatican City"],
  ["VE", "Venezuela"],
  ["VN", "Vietnam"],
  ["VG", "Virgin Islands, British"],
  ["WF", "Wallis and Futuna"],
  ["EH", "Western Sahara"],
  ["YE", "Yemen"],
  ["ZM", "Zambia"],
  ["ZW", "Zimbabwe"],
  ["AX", "Åland Islands"],
]);

export const EU_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
  "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT",
  "RO", "SK", "SI", "ES", "SE",
]);
export const EFTA_COUNTRY_CODES = new Set(["IS", "LI", "NO", "CH"]);
export const ANZ_COUNTRY_CODES = new Set(["AU", "NZ"]);
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

export function getShippingRegion(countryCode) {
  const country = String(countryCode || "").toUpperCase();
  if (country === "GB") return "GB";
  if (country === "DE") return "DE";
  if (EU_COUNTRY_CODES.has(country)) return "EU";
  if (EFTA_COUNTRY_CODES.has(country)) return "EFTA";
  if (country === "US") return "US";
  if (country === "CA") return "CA";
  if (ANZ_COUNTRY_CODES.has(country)) return "ANZ";
  return "ROW";
}

export function getRegionalCents(config, countryCode) {
  const region = getShippingRegion(countryCode);
  const configured = config?.[region];
  return Number.isInteger(configured) && configured >= 0 ? configured : null;
}

export function getFixedShippingCents(product, countryCode, env = {}) {
  const prefix = product?.fulfillment?.envPrefix;
  const region = getShippingRegion(countryCode);
  const configured = getRegionalCents(product?.fulfillment?.shippingCents, countryCode);
  if (configured !== null) return configured;
  if (!prefix) return null;
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
    return ["GB", "DE", "PT", "NO", "US", "CA", "AU", "JP"]
      .every((countryCode) => getFixedShippingCents(product, countryCode, env) !== null);
  }
  return false;
}

export function publicProductStatus(product, env = {}) {
  if (isSoldOut(product)) return { code: "sold-out", label: "Sold out", checkoutReady: false };
  if (product?.availability === "upcoming") return { code: "upcoming", label: "Available soon", checkoutReady: false };
  if (!isProductCheckoutConfigured(product, env)) return { code: "shipping-setup", label: "Shipping setup in progress", checkoutReady: false };
  return { code: "available", label: "Checkout", checkoutReady: true };
}

export function getPublicWorks() {
  return PRINT_CATALOG;
}
