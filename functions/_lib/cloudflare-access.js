import { fetchWithTimeout } from "./fetch.js";

const keyCache = new Map();
const CLOCK_SKEW_SECONDS = 60;
const KEY_CACHE_MS = 60 * 60 * 1000;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value) {
  const source = String(value || "");
  if (!source || !BASE64URL_PATTERN.test(source) || source.length % 4 === 1) {
    throw new Error("Private Access token is missing or malformed");
  }

  const normalized = source.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  let binary;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("Private Access token is missing or malformed");
  }

  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) output[index] = binary.charCodeAt(index);

  // JWT segments must use one canonical, unpadded Base64URL representation.
  // Reject alternate encodings that decode to the same bytes through unused padding bits.
  if (encodeBase64Url(output) !== source) {
    throw new Error("Private Access token is missing or malformed");
  }
  return output;
}

function decodeJsonPart(value) {
  try {
    const text = new TextDecoder().decode(decodeBase64Url(value));
    return JSON.parse(text);
  } catch (error) {
    if (String(error?.message || "").includes("malformed")) throw error;
    throw new Error("Private Access token is missing or malformed");
  }
}

function teamOrigin(env = {}) {
  const configured = String(env.CF_ACCESS_TEAM_DOMAIN || "").trim();
  if (!configured) throw new Error("Private Access is not configured");
  const origin = configured.startsWith("http://") || configured.startsWith("https://")
    ? new URL(configured).origin
    : `https://${configured.replace(/^\/+|\/+$/g, "")}`;
  if (!origin.endsWith(".cloudflareaccess.com")) throw new Error("Invalid Cloudflare Access team domain");
  return origin;
}

function expectedAudience(env = {}) {
  const audience = String(env.CF_ACCESS_AUD || "").trim();
  if (!audience) throw new Error("Private Access audience is not configured");
  return audience;
}

function allowedAdminEmail(env = {}) {
  const email = String(env.ORIGINAL_WORKS_ADMIN_EMAIL || "").trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Private admin email is not configured");
  return email;
}

async function loadSigningKeys(env = {}) {
  const origin = teamOrigin(env);
  const cached = keyCache.get(origin);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;

  const response = await fetchWithTimeout(`${origin}/cdn-cgi/access/certs`, {
    headers: { accept: "application/json" },
  }, 8_000, "Cloudflare Access signing-key lookup");
  if (!response.ok) throw new Error("Cloudflare Access signing keys are unavailable");
  const payload = await response.json().catch(() => ({}));
  if (!Array.isArray(payload.keys) || payload.keys.length === 0) {
    throw new Error("Cloudflare Access signing keys are invalid");
  }
  keyCache.set(origin, { keys: payload.keys, expiresAt: Date.now() + KEY_CACHE_MS });
  return payload.keys;
}

function audienceMatches(claim, expected) {
  if (Array.isArray(claim)) return claim.includes(expected);
  return claim === expected;
}

function validateClaims(payload, env = {}, nowSeconds = Math.floor(Date.now() / 1000)) {
  const issuer = teamOrigin(env);
  if (String(payload.iss || "").replace(/\/$/, "") !== issuer.replace(/\/$/, "")) {
    throw new Error("Private Access issuer mismatch");
  }
  if (!audienceMatches(payload.aud, expectedAudience(env))) {
    throw new Error("Private Access audience mismatch");
  }
  if (!Number.isFinite(Number(payload.exp)) || Number(payload.exp) < nowSeconds - CLOCK_SKEW_SECONDS) {
    throw new Error("Private Access token expired");
  }
  if (payload.nbf !== undefined && Number(payload.nbf) > nowSeconds + CLOCK_SKEW_SECONDS) {
    throw new Error("Private Access token is not active yet");
  }
  if (payload.iat !== undefined && Number(payload.iat) > nowSeconds + CLOCK_SKEW_SECONDS) {
    throw new Error("Private Access token has an invalid issue time");
  }
  const email = String(payload.email || "").trim().toLowerCase();
  if (email !== allowedAdminEmail(env)) throw new Error("Private admin identity is not allowed");
  return { ...payload, email };
}

export async function verifyCloudflareAccessJwt(token, env = {}, nowSeconds = Math.floor(Date.now() / 1000)) {
  const resolvedToken = await token;
  const parts = String(resolvedToken || "").split(".");
  if (parts.length !== 3) throw new Error("Private Access token is missing or malformed");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJsonPart(encodedHeader);
  const payload = decodeJsonPart(encodedPayload);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Private Access token algorithm is invalid");

  const keys = await loadSigningKeys(env);
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) throw new Error("Private Access signing key was not found");
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    cryptoKey,
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!valid) throw new Error("Private Access token signature is invalid");
  return validateClaims(payload, env, nowSeconds);
}

export async function requireOriginalWorksAdmin(request, env = {}) {
  const token = request.headers.get("cf-access-jwt-assertion");
  return verifyCloudflareAccessJwt(token, env);
}

export function clearCloudflareAccessKeyCacheForTests() {
  keyCache.clear();
}
