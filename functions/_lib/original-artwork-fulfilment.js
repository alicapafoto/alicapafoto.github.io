import { ensureOriginalArtworkCheckoutSchema } from "./original-artwork-checkout.js";

const FULFILMENT_STATUSES = new Set([
  "paid-awaiting-packing",
  "packed-measured",
  "ready-for-label",
  "label-created",
  "dropped-off",
  "in-transit",
  "delivered",
  "shipment-exception",
  "cancelled",
]);

function requireDatabase(env = {}) {
  if (!env.ORDER_LEDGER) throw new Error("ORDER_LEDGER database is not configured");
  return env.ORDER_LEDGER;
}

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function positiveMeasurement(value, label, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > max) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return Number(number.toFixed(2));
}

function parseJson(value, fallback = {}) {
  try { return JSON.parse(value || "{}"); } catch { return fallback; }
}

function senderValue(env, name, maxLength = 160) {
  return cleanText(env[name], maxLength);
}

export function getOriginalWorksSenderConfiguration(env = {}) {
  const configuration = {
    name: senderValue(env, "ORIGINAL_WORKS_SENDER_NAME", 100),
    addressLine1: senderValue(env, "ORIGINAL_WORKS_SENDER_ADDRESS_LINE1", 120),
    addressLine2: senderValue(env, "ORIGINAL_WORKS_SENDER_ADDRESS_LINE2", 120),
    city: senderValue(env, "ORIGINAL_WORKS_SENDER_CITY", 80),
    postalCode: senderValue(env, "ORIGINAL_WORKS_SENDER_POSTAL_CODE", 20),
    countryCode: senderValue(env, "ORIGINAL_WORKS_SENDER_COUNTRY", 2).toUpperCase(),
    phoneE164: senderValue(env, "ORIGINAL_WORKS_SENDER_PHONE_E164", 24),
  };
  const configured = Boolean(
    configuration.name
    && configuration.addressLine1
    && configuration.city
    && configuration.postalCode
    && /^[A-Z]{2}$/.test(configuration.countryCode)
    && /^\+[1-9]\d{7,14}$/.test(configuration.phoneE164)
  );
  return { configured, configuration };
}

export async function ensureOriginalArtworkFulfilmentSchema(env = {}) {
  const db = await ensureOriginalArtworkCheckoutSchema(env);
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS original_artwork_fulfilment (
      fulfilment_id TEXT PRIMARY KEY,
      artwork_id TEXT NOT NULL,
      reservation_id TEXT NOT NULL UNIQUE,
      checkout_session_id TEXT NOT NULL UNIQUE,
      payment_intent_id TEXT,
      status TEXT NOT NULL CHECK (status IN (
        'paid-awaiting-packing','packed-measured','ready-for-label','label-created',
        'dropped-off','in-transit','delivered','shipment-exception','cancelled'
      )),
      currency TEXT NOT NULL DEFAULT 'EUR',
      sale_price_cents INTEGER NOT NULL CHECK (sale_price_cents > 0),
      shipping_charged_cents INTEGER NOT NULL CHECK (shipping_charged_cents >= 0),
      declared_value_cents INTEGER NOT NULL CHECK (declared_value_cents > 0),
      recipient_name TEXT NOT NULL,
      recipient_email TEXT,
      recipient_phone TEXT,
      destination_address_json TEXT NOT NULL,
      provisional_length_cm REAL NOT NULL CHECK (provisional_length_cm > 0),
      provisional_width_cm REAL NOT NULL CHECK (provisional_width_cm > 0),
      provisional_height_cm REAL NOT NULL CHECK (provisional_height_cm > 0),
      provisional_weight_kg REAL NOT NULL CHECK (provisional_weight_kg > 0),
      actual_length_cm REAL,
      actual_width_cm REAL,
      actual_height_cm REAL,
      actual_weight_kg REAL,
      packing_notes TEXT,
      address_reviewed_at TEXT,
      measurements_confirmed_at TEXT,
      ready_for_label_at TEXT,
      carrier TEXT,
      service_name TEXT,
      carrier_quote_id TEXT,
      carrier_shipment_id TEXT,
      tracking_number TEXT,
      tracking_url TEXT,
      label_reference TEXT,
      label_created_at TEXT,
      dropped_off_at TEXT,
      delivered_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (artwork_id) REFERENCES original_artworks(artwork_id),
      FOREIGN KEY (reservation_id) REFERENCES original_artwork_reservations(reservation_id)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS original_artwork_fulfilment_status_idx ON original_artwork_fulfilment(status, updated_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS original_artwork_fulfilment_events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      fulfilment_id TEXT NOT NULL,
      artwork_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_json TEXT,
      actor_email TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (fulfilment_id) REFERENCES original_artwork_fulfilment(fulfilment_id),
      FOREIGN KEY (artwork_id) REFERENCES original_artworks(artwork_id)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS original_artwork_fulfilment_events_idx ON original_artwork_fulfilment_events(fulfilment_id, created_at)"),
  ]);
  return db;
}

export async function createOriginalArtworkFulfilmentRecord(env = {}, {
  orderContext,
  checkoutSessionId,
  paymentIntentId = "",
  recipientEmail = "",
  recipientPhone = "",
  shippingChargedCents = 0,
  now = Date.now(),
} = {}) {
  if (!orderContext?.artwork_id || !orderContext?.reservation_id || !checkoutSessionId) {
    throw new Error("Original artwork fulfilment context is incomplete");
  }
  const address = orderContext.shippingAddress || {};
  if (!address.recipientName || !address.addressLine1 || !address.city || !address.postalCode || !address.countryCode) {
    throw new Error("Original artwork delivery address is incomplete");
  }
  const db = await ensureOriginalArtworkFulfilmentSchema(env);
  const timestamp = nowIso(now);
  const fulfilmentId = `owf_${checkoutSessionId}`;
  const result = await db.prepare(`
    INSERT OR IGNORE INTO original_artwork_fulfilment (
      fulfilment_id, artwork_id, reservation_id, checkout_session_id, payment_intent_id,
      status, currency, sale_price_cents, shipping_charged_cents, declared_value_cents,
      recipient_name, recipient_email, recipient_phone, destination_address_json,
      provisional_length_cm, provisional_width_cm, provisional_height_cm, provisional_weight_kg,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'paid-awaiting-packing', 'EUR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    fulfilmentId,
    orderContext.artwork_id,
    orderContext.reservation_id,
    checkoutSessionId,
    cleanText(paymentIntentId, 120),
    Number(orderContext.price_cents),
    Math.max(0, Math.round(Number(shippingChargedCents) || 0)),
    Number(orderContext.declared_value_cents),
    cleanText(address.recipientName, 100),
    cleanText(recipientEmail, 160),
    cleanText(recipientPhone, 40),
    JSON.stringify(address),
    Number(orderContext.package_length_cm),
    Number(orderContext.package_width_cm),
    Number(orderContext.package_height_cm),
    Number(orderContext.package_weight_kg),
    timestamp,
    timestamp,
  ).run();

  if (Number(result.meta?.changes || 0) === 1) {
    await db.prepare(`
      INSERT INTO original_artwork_fulfilment_events (
        fulfilment_id, artwork_id, event_type, event_json, actor_email, created_at
      ) VALUES (?, ?, 'paid-handoff-created', ?, 'stripe-webhook', ?)
    `).bind(
      fulfilmentId,
      orderContext.artwork_id,
      JSON.stringify({ checkoutSessionId, paymentIntentId }),
      timestamp,
    ).run();
  }
  return { fulfilmentId, created: Number(result.meta?.changes || 0) === 1 };
}

function selectFulfilmentSql(where = "") {
  return `
    SELECT f.*, a.title
    FROM original_artwork_fulfilment f
    JOIN original_artworks a ON a.artwork_id = f.artwork_id
    ${where}
  `;
}

function publicAdminRecord(row) {
  if (!row) return null;
  return {
    fulfilmentId: row.fulfilment_id,
    artworkId: row.artwork_id,
    title: row.title,
    reservationId: row.reservation_id,
    checkoutSessionId: row.checkout_session_id,
    paymentIntentId: row.payment_intent_id || "",
    status: row.status,
    currency: row.currency,
    salePriceCents: row.sale_price_cents,
    shippingChargedCents: row.shipping_charged_cents,
    declaredValueCents: row.declared_value_cents,
    recipient: {
      name: row.recipient_name,
      email: row.recipient_email || "",
      phone: row.recipient_phone || "",
      address: parseJson(row.destination_address_json),
    },
    provisionalParcel: {
      lengthCm: row.provisional_length_cm,
      widthCm: row.provisional_width_cm,
      heightCm: row.provisional_height_cm,
      weightKg: row.provisional_weight_kg,
    },
    actualParcel: row.actual_length_cm ? {
      lengthCm: row.actual_length_cm,
      widthCm: row.actual_width_cm,
      heightCm: row.actual_height_cm,
      weightKg: row.actual_weight_kg,
    } : null,
    packingNotes: row.packing_notes || "",
    addressReviewedAt: row.address_reviewed_at || null,
    measurementsConfirmedAt: row.measurements_confirmed_at || null,
    readyForLabelAt: row.ready_for_label_at || null,
    shipment: {
      carrier: row.carrier || "",
      serviceName: row.service_name || "",
      carrierQuoteId: row.carrier_quote_id || "",
      carrierShipmentId: row.carrier_shipment_id || "",
      trackingNumber: row.tracking_number || "",
      trackingUrl: row.tracking_url || "",
      labelReference: row.label_reference || "",
      labelCreatedAt: row.label_created_at || null,
      droppedOffAt: row.dropped_off_at || null,
      deliveredAt: row.delivered_at || null,
    },
    lastError: row.last_error || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listOriginalArtworkFulfilments(env = {}) {
  const db = await ensureOriginalArtworkFulfilmentSchema(env);
  const result = await db.prepare(`${selectFulfilmentSql()} ORDER BY f.created_at DESC`).all();
  return (result.results || []).map(publicAdminRecord);
}

export async function getOriginalArtworkFulfilment(env = {}, fulfilmentId) {
  const db = await ensureOriginalArtworkFulfilmentSchema(env);
  const row = await db.prepare(`${selectFulfilmentSql("WHERE f.fulfilment_id = ?")}`).bind(cleanText(fulfilmentId, 180)).first();
  return publicAdminRecord(row);
}

export async function saveOriginalArtworkPacking(env = {}, {
  fulfilmentId,
  lengthCm,
  widthCm,
  heightCm,
  weightKg,
  packingNotes = "",
  addressReviewed = false,
  actorEmail,
  now = Date.now(),
} = {}) {
  if (addressReviewed !== true) throw new Error("Confirm that the collector address has been reviewed.");
  const parcel = {
    lengthCm: positiveMeasurement(lengthCm, "parcel length", 300),
    widthCm: positiveMeasurement(widthCm, "parcel width", 300),
    heightCm: positiveMeasurement(heightCm, "parcel height", 300),
    weightKg: positiveMeasurement(weightKg, "packed weight", 70),
  };
  const db = await ensureOriginalArtworkFulfilmentSchema(env);
  const id = cleanText(fulfilmentId, 180);
  const timestamp = nowIso(now);
  const notes = cleanText(packingNotes, 2000);
  const result = await db.prepare(`
    UPDATE original_artwork_fulfilment
    SET status = 'packed-measured', actual_length_cm = ?, actual_width_cm = ?,
        actual_height_cm = ?, actual_weight_kg = ?, packing_notes = ?,
        address_reviewed_at = ?, measurements_confirmed_at = ?, last_error = NULL, updated_at = ?
    WHERE fulfilment_id = ? AND status IN ('paid-awaiting-packing', 'packed-measured')
  `).bind(
    parcel.lengthCm,
    parcel.widthCm,
    parcel.heightCm,
    parcel.weightKg,
    notes,
    timestamp,
    timestamp,
    timestamp,
    id,
  ).run();
  if (Number(result.meta?.changes || 0) !== 1) {
    throw new Error("This order is not available for packing changes.");
  }
  const record = await getOriginalArtworkFulfilment(env, id);
  await db.prepare(`
    INSERT INTO original_artwork_fulfilment_events (
      fulfilment_id, artwork_id, event_type, event_json, actor_email, created_at
    ) VALUES (?, ?, 'packing-measured', ?, ?, ?)
  `).bind(id, record.artworkId, JSON.stringify({ parcel, addressReviewed: true }), cleanText(actorEmail, 160), timestamp).run();
  return record;
}

export async function markOriginalArtworkReadyForLabel(env = {}, {
  fulfilmentId,
  actorEmail,
  now = Date.now(),
} = {}) {
  const sender = getOriginalWorksSenderConfiguration(env);
  if (!sender.configured) throw new Error("The private sender configuration is incomplete.");
  const db = await ensureOriginalArtworkFulfilmentSchema(env);
  const id = cleanText(fulfilmentId, 180);
  const timestamp = nowIso(now);
  const result = await db.prepare(`
    UPDATE original_artwork_fulfilment
    SET status = 'ready-for-label', ready_for_label_at = ?, updated_at = ?
    WHERE fulfilment_id = ? AND status = 'packed-measured'
      AND address_reviewed_at IS NOT NULL
      AND measurements_confirmed_at IS NOT NULL
      AND actual_length_cm > 0 AND actual_width_cm > 0
      AND actual_height_cm > 0 AND actual_weight_kg > 0
  `).bind(timestamp, timestamp, id).run();
  if (Number(result.meta?.changes || 0) !== 1) {
    throw new Error("Packing measurements and address review must be complete before label creation.");
  }
  const record = await getOriginalArtworkFulfilment(env, id);
  await db.prepare(`
    INSERT INTO original_artwork_fulfilment_events (
      fulfilment_id, artwork_id, event_type, event_json, actor_email, created_at
    ) VALUES (?, ?, 'ready-for-label', ?, ?, ?)
  `).bind(
    id,
    record.artworkId,
    JSON.stringify({ senderConfigured: true, actualParcel: record.actualParcel }),
    cleanText(actorEmail, 160),
    timestamp,
  ).run();
  return record;
}

export async function listOriginalArtworkFulfilmentEvents(env = {}, fulfilmentId) {
  const db = await ensureOriginalArtworkFulfilmentSchema(env);
  const result = await db.prepare(`
    SELECT event_type, event_json, actor_email, created_at
    FROM original_artwork_fulfilment_events
    WHERE fulfilment_id = ?
    ORDER BY event_id ASC
  `).bind(cleanText(fulfilmentId, 180)).all();
  return (result.results || []).map((row) => ({
    type: row.event_type,
    details: parseJson(row.event_json),
    actorEmail: row.actor_email || "",
    createdAt: row.created_at,
  }));
}

export function isValidOriginalArtworkFulfilmentStatus(value) {
  return FULFILMENT_STATUSES.has(String(value || ""));
}
