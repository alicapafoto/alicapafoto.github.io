import { fetchWithTimeout } from "./fetch-timeout.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlText(text) {
  return base64Url(new TextEncoder().encode(text));
}

function pemToArrayBuffer(pem) {
  const normalized = pem.replace(/\\n/g, "\n");
  const base64 = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function createServiceAccountToken(env) {
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Google Sheets service account is not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlText(JSON.stringify({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(env.GOOGLE_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetchWithTimeout(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  }, 10_000, "Google authentication");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload?.error_description || "Could not authenticate with Google Sheets");
  }
  return payload.access_token;
}

function sheetRange(env, columns) {
  const sheetName = env.GOOGLE_SHEET_NAME || "Orders";
  return encodeURIComponent(`'${sheetName.replace(/'/g, "''")}'!${columns}`);
}

export async function hasOrderSession(env, sessionId) {
  if (!env.GOOGLE_SHEET_ID) throw new Error("GOOGLE_SHEET_ID is not configured");
  if (!sessionId) return false;
  const token = await createServiceAccountToken(env);
  const range = sheetRange(env, "C:C");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEET_ID)}/values/${range}?majorDimension=COLUMNS`;
  const response = await fetchWithTimeout(url, {
    headers: { authorization: `Bearer ${token}` },
  }, 10_000, "Google Sheets duplicate check");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "Could not check the order ledger");
  const values = Array.isArray(payload.values?.[0]) ? payload.values[0] : [];
  return values.some((value) => String(value) === String(sessionId));
}

export async function appendOrderRow(env, values) {
  if (!env.GOOGLE_SHEET_ID) throw new Error("GOOGLE_SHEET_ID is not configured");
  const token = await createServiceAccountToken(env);
  const range = sheetRange(env, "A:AZ");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEET_ID)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ majorDimension: "ROWS", values: [values] }),
  }, 12_000, "Google Sheets order append");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "Could not append the order to Google Sheets");
  return payload;
}
