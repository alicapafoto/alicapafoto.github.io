const QUOTE_TOKEN_LIFETIME_MS = 10 * 60 * 1000;

function quoteSecret(env = {}) {
  return String(env.ORIGINAL_WORKS_QUOTE_SIGNING_SECRET || "");
}

export function isOriginalArtworkQuoteSigningConfigured(env = {}) {
  return quoteSecret(env).length >= 32;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeJson(value) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
}

async function importSigningKey(env = {}) {
  const secret = quoteSecret(env);
  if (secret.length < 32) throw new Error("Original Works quote signing is not configured");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signPayload(env, encodedPayload) {
  const key = await importSigningKey(env);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));
  return new Uint8Array(signature);
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function canonicalAddress(address = {}) {
  return JSON.stringify([
    String(address.recipientName || ""),
    String(address.addressLine1 || ""),
    String(address.addressLine2 || ""),
    String(address.city || ""),
    String(address.state || ""),
    String(address.postalCode || ""),
    String(address.countryCode || "").toUpperCase(),
  ]);
}

async function addressHash(address) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalAddress(address)));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function createOriginalArtworkQuoteToken(env = {}, {
  artworkId,
  shippingAddress,
  shippingCents,
  now = Date.now(),
} = {}) {
  const payload = {
    version: 1,
    artworkId: String(artworkId || "").toLowerCase(),
    addressHash: await addressHash(shippingAddress),
    shippingCents: Number(shippingCents),
    issuedAt: now,
    expiresAt: now + QUOTE_TOKEN_LIFETIME_MS,
    nonce: crypto.randomUUID(),
  };
  if (!payload.artworkId || !Number.isInteger(payload.shippingCents) || payload.shippingCents < 0) {
    throw new Error("The insured delivery quote cannot be signed");
  }
  const encodedPayload = encodeJson(payload);
  const signature = bytesToBase64Url(await signPayload(env, encodedPayload));
  return { token: `${encodedPayload}.${signature}`, expiresAt: payload.expiresAt };
}

export async function verifyOriginalArtworkQuoteToken(env = {}, {
  token,
  artworkId,
  shippingAddress,
  shippingCents,
  now = Date.now(),
} = {}) {
  try {
    const [encodedPayload, encodedSignature, extra] = String(token || "").split(".");
    if (!encodedPayload || !encodedSignature || extra) return { valid: false, reason: "malformed" };
    const expectedSignature = await signPayload(env, encodedPayload);
    const suppliedSignature = base64UrlToBytes(encodedSignature);
    if (!timingSafeEqual(expectedSignature, suppliedSignature)) return { valid: false, reason: "signature" };

    const payload = decodeJson(encodedPayload);
    if (payload.version !== 1) return { valid: false, reason: "version" };
    if (payload.artworkId !== String(artworkId || "").toLowerCase()) return { valid: false, reason: "artwork" };
    if (payload.shippingCents !== Number(shippingCents)) return { valid: false, reason: "amount" };
    if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= now) return { valid: false, reason: "expired" };
    if (!Number.isFinite(payload.issuedAt) || payload.issuedAt > now + 60_000) return { valid: false, reason: "issued-at" };
    if (payload.addressHash !== await addressHash(shippingAddress)) return { valid: false, reason: "address" };
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "invalid" };
  }
}
