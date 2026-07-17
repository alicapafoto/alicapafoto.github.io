const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function methodNotAllowed(allowed = "GET") {
  return json({ error: "Method not allowed" }, 405, { allow: allowed });
}

export async function readJson(request, maxBytes = 8_192) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes) throw new Error("Request body is too large");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new Error("Request body is too large");
  }
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new Error("Invalid JSON request");
  }
}

export function getSiteOrigin(request, env = {}) {
  if (env.SITE_URL) return String(env.SITE_URL).replace(/\/$/, "");
  return new URL(request.url).origin;
}

export function assertSameOrigin(request, env = {}) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = getSiteOrigin(request, env);
  if (origin !== expected) throw new Error("Origin not allowed");
}

export function publicError(error, fallback = "The request could not be completed.") {
  console.error(error);
  return fallback;
}

export function isCheckoutOperational(env = {}) {
  return Boolean(
    env.STRIPE_SECRET_KEY
    && env.STRIPE_WEBHOOK_SECRET
    && env.GOOGLE_SHEET_ID
    && env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    && env.GOOGLE_PRIVATE_KEY
    && env.ORDER_EVENTS
  );
}

export function assertCheckoutOperational(env = {}) {
  if (!isCheckoutOperational(env)) throw new Error("Checkout is not fully configured");
}
