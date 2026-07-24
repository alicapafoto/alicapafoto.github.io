const ALLOWED_EVENTS = new Set([
  "acquire_print_clicked",
  "print_variant_selected",
  "print_detail_viewed",
  "original_artwork_viewed",
  "delivery_quote_requested",
  "delivery_quote_succeeded",
  "delivery_quote_failed",
  "checkout_started",
  "checkout_session_created",
  "checkout_completed",
  "checkout_returned_success",
  "checkout_cancelled",
  "patreon_clicked",
  "nine_purchase_clicked",
]);

const FIELD_LIMITS = Object.freeze({
  page: 120,
  product: 80,
  variant: 80,
  outcome: 40,
  source: 80,
  country: 8,
});

function clean(value, maxLength) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/[\r\n\t]/g, " ").trim().slice(0, maxLength);
}

export function isAllowedAnalyticsEvent(event) {
  return ALLOWED_EVENTS.has(String(event || ""));
}

export function sanitizeAnalyticsDetails(details = {}) {
  const sanitized = {};
  for (const [field, maxLength] of Object.entries(FIELD_LIMITS)) {
    sanitized[field] = clean(details[field], maxLength);
  }
  return sanitized;
}

export function writeAnalyticsEvent(env = {}, event, details = {}) {
  const name = String(event || "");
  if (!isAllowedAnalyticsEvent(name)) return false;
  const dataset = env.ANALYTICS_ENGINE;
  if (!dataset || typeof dataset.writeDataPoint !== "function") return false;

  const safe = sanitizeAnalyticsDetails(details);
  const environment = clean(env.ANALYTICS_MODE || env.STORE_ENV || "unknown", 24);
  dataset.writeDataPoint({
    indexes: [name],
    blobs: [
      name,
      environment,
      safe.page,
      safe.product,
      safe.variant,
      safe.outcome,
      safe.source,
      safe.country,
    ],
    doubles: [1],
  });
  return true;
}
