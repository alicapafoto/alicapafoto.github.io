const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const DIGEST_PREFIX = "order-digest:";
const SHEET_COLUMNS = 43;

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduledDigest(controller.scheduledTime, env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, service: "Ali Capa daily order digest" });
    }
    if (request.method !== "POST" || url.pathname !== "/send") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const authorization = request.headers.get("authorization") || "";
    if (!env.DIGEST_MANUAL_TOKEN || authorization !== `Bearer ${env.DIGEST_MANUAL_TOKEN}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const force = url.searchParams.get("force") === "1";
    const result = await sendDigestForDate(new Date(), env, { force });
    return Response.json(result);
  },
};

async function runScheduledDigest(scheduledTime, env) {
  const date = new Date(scheduledTime || Date.now());
  const local = localParts(date, env.ORDER_DIGEST_TIME_ZONE || "Europe/Lisbon");
  if (local.hour !== 22) return { skipped: true, reason: "Not 22:00 in Lisbon" };
  return sendDigestForDate(date, env);
}

async function sendDigestForDate(date, env, { force = false } = {}) {
  assertConfigured(env);
  const timeZone = env.ORDER_DIGEST_TIME_ZONE || "Europe/Lisbon";
  const local = localParts(date, timeZone);
  const digestKey = `${DIGEST_PREFIX}${local.date}`;
  if (!force && await env.ORDER_EVENTS.get(digestKey)) {
    return { skipped: true, reason: "Digest already sent", date: local.date };
  }

  const rows = await readOrderRows(env);
  const orders = rows.filter((row) => row.length && localDate(row[0], timeZone) === local.date);
  const summary = summarize(orders);
  const message = buildMessage(local.date, orders, summary, env);
  const result = await env.ORDER_DIGEST_EMAIL.send(message);

  await env.ORDER_EVENTS.put(digestKey, JSON.stringify({
    sentAt: new Date().toISOString(),
    orderCount: orders.length,
    messageId: result?.messageId || "",
  }), { expirationTtl: 60 * 60 * 24 * 400 });

  return { sent: true, date: local.date, orderCount: orders.length, messageId: result?.messageId || "" };
}

function assertConfigured(env) {
  const required = [
    "GOOGLE_SHEET_ID",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "ORDER_EVENTS",
    "ORDER_DIGEST_EMAIL",
    "ORDER_DIGEST_FROM_EMAIL",
    "ORDER_DIGEST_TO_EMAIL",
  ];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) throw new Error(`Missing digest configuration: ${missing.join(", ")}`);
}

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, hour: Number(values.hour) };
}

function localDate(value, timeZone) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : localParts(date, timeZone).date;
}

async function readOrderRows(env) {
  const token = await createServiceAccountToken(env);
  const sheetName = env.GOOGLE_SHEET_NAME || "Orders";
  const range = encodeURIComponent(`'${sheetName.replace(/'/g, "''")}'!A:AQ`);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEET_ID)}/values/${range}?majorDimension=ROWS`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "Could not read the order ledger");
  const values = Array.isArray(payload.values) ? payload.values : [];
  return values.slice(1).map((row) => [...row, ...Array(Math.max(0, SHEET_COLUMNS - row.length)).fill("")].slice(0, SHEET_COLUMNS));
}

function summarize(orders) {
  return orders.reduce((total, row) => {
    total.customer += money(row[15]);
    total.shipping += money(row[14]);
    total.provider += money(row[20]);
    total.contribution += money(row[21]);
    if (row[4] === "Paid — Awaiting Wise") total.awaitingWise += 1;
    if (row[5] === "Yes" && row[6] === "Not ordered") total.readyToFulfil += 1;
    return total;
  }, { customer: 0, shipping: 0, provider: 0, contribution: 0, awaitingWise: 0, readyToFulfil: 0 });
}

function buildMessage(date, orders, summary, env) {
  const displayDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/Lisbon" }).format(new Date(`${date}T12:00:00Z`));
  const count = orders.length;
  const subject = `Ali Capa orders, ${displayDate}: ${count} ${count === 1 ? "order" : "orders"}`;
  const orderLines = orders.length
    ? orders.map((row) => {
      const ref = row[1] || row[2] || "Order";
      return `${ref}\n${row[7]}${row[10] ? `, ${row[10]}` : ""}\nCustomer total: ${euro(row[15])}\nDestination: ${row[28] || "Not recorded"}\nCustomer: ${row[29] || "Not recorded"}${row[30] ? `, ${row[30]}` : ""}\nStatus: ${row[4] || "Not recorded"}; Wise: ${row[5] || "No"}; Fulfilment: ${row[6] || "Not recorded"}`;
    }).join("\n\n")
    : "No new paid storefront orders were recorded today.";

  const text = `Ali Capa Foto daily order digest\n${displayDate}\n\nOrders: ${count}\nCustomer total: ${euro(summary.customer)}\nShipping charged: ${euro(summary.shipping)}\nEstimated provider total: ${euro(summary.provider)}\nEstimated contribution: ${euro(summary.contribution)}\nAwaiting Wise: ${summary.awaitingWise}\nReady to fulfil: ${summary.readyToFulfil}\n\n${orderLines}\n\nOpen the private Google Sheet for addresses, provider SKUs, tracking, and operational updates.`;

  return {
    to: env.ORDER_DIGEST_TO_EMAIL,
    from: { email: env.ORDER_DIGEST_FROM_EMAIL, name: "Ali Capa Foto Orders" },
    subject,
    text,
    html: htmlDigest(displayDate, orders, summary),
  };
}

function htmlDigest(displayDate, orders, summary) {
  const cards = orders.length
    ? orders.map((row) => `<div style="margin:0 0 18px;padding:16px;border:1px solid #ddd"><strong>${escapeHtml(row[1] || row[2] || "Order")}</strong><br>${escapeHtml(row[7] || "Artwork")}${row[10] ? `, ${escapeHtml(row[10])}` : ""}<br>Customer total: ${euro(row[15])}<br>Destination: ${escapeHtml(row[28] || "Not recorded")}<br>Customer: ${escapeHtml(row[29] || "Not recorded")}${row[30] ? `, ${escapeHtml(row[30])}` : ""}<br>Status: ${escapeHtml(row[4] || "Not recorded")}; Wise: ${escapeHtml(row[5] || "No")}; Fulfilment: ${escapeHtml(row[6] || "Not recorded")}</div>`).join("")
    : "<p>No new paid storefront orders were recorded today.</p>";
  return `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#171717"><h1 style="font-size:24px">Ali Capa Foto daily order digest</h1><p>${escapeHtml(displayDate)}</p><p><strong>Orders:</strong> ${orders.length}<br><strong>Customer total:</strong> ${euro(summary.customer)}<br><strong>Shipping charged:</strong> ${euro(summary.shipping)}<br><strong>Estimated provider total:</strong> ${euro(summary.provider)}<br><strong>Estimated contribution:</strong> ${euro(summary.contribution)}<br><strong>Awaiting Wise:</strong> ${summary.awaitingWise}<br><strong>Ready to fulfil:</strong> ${summary.readyToFulfil}</p>${cards}<p>Open the private Google Sheet for addresses, provider SKUs, tracking, and operational updates.</p></div>`;
}

function money(value) {
  const number = Number.parseFloat(String(value || "0").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function euro(value) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(money(value));
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function base64Url(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlText(value) {
  return base64Url(new TextEncoder().encode(value));
}

function pemToArrayBuffer(pem) {
  const body = String(pem).replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function createServiceAccountToken(env) {
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
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(payload?.error_description || "Could not authenticate with Google Sheets");
  return payload.access_token;
}

export { buildMessage, localParts, summarize };
