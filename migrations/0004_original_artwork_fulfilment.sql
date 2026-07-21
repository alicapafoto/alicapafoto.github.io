CREATE TABLE IF NOT EXISTS original_artwork_fulfilment (
  fulfilment_id TEXT PRIMARY KEY,
  artwork_id TEXT NOT NULL,
  reservation_id TEXT NOT NULL UNIQUE,
  checkout_session_id TEXT NOT NULL UNIQUE,
  payment_intent_id TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'paid-awaiting-packing',
    'packed-measured',
    'ready-for-label',
    'label-created',
    'dropped-off',
    'in-transit',
    'delivered',
    'shipment-exception',
    'cancelled'
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
);

CREATE INDEX IF NOT EXISTS original_artwork_fulfilment_status_idx
  ON original_artwork_fulfilment(status, updated_at);

CREATE TABLE IF NOT EXISTS original_artwork_fulfilment_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  fulfilment_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_json TEXT,
  actor_email TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (fulfilment_id) REFERENCES original_artwork_fulfilment(fulfilment_id),
  FOREIGN KEY (artwork_id) REFERENCES original_artworks(artwork_id)
);

CREATE INDEX IF NOT EXISTS original_artwork_fulfilment_events_idx
  ON original_artwork_fulfilment_events(fulfilment_id, created_at);
