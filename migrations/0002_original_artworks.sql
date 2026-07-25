CREATE TABLE IF NOT EXISTS original_artworks (
  artwork_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  declared_value_cents INTEGER NOT NULL CHECK (declared_value_cents > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  package_length_cm REAL NOT NULL CHECK (package_length_cm > 0),
  package_width_cm REAL NOT NULL CHECK (package_width_cm > 0),
  package_height_cm REAL NOT NULL CHECK (package_height_cm > 0),
  package_weight_kg REAL NOT NULL CHECK (package_weight_kg > 0),
  status TEXT NOT NULL CHECK (status IN ('unavailable', 'available', 'reserved', 'sold')),
  reservation_id TEXT,
  reservation_token_hash TEXT,
  reserved_until INTEGER,
  checkout_session_id TEXT UNIQUE,
  payment_intent_id TEXT,
  sold_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS original_artworks_status_idx
  ON original_artworks(status, reserved_until);

CREATE TABLE IF NOT EXISTS original_artwork_reservations (
  reservation_id TEXT PRIMARY KEY,
  artwork_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'checkout-created', 'completed', 'expired', 'released', 'failed')),
  reserved_until INTEGER NOT NULL,
  destination_country TEXT,
  shipping_quote_json TEXT,
  checkout_session_id TEXT UNIQUE,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (artwork_id) REFERENCES original_artworks(artwork_id)
);

CREATE INDEX IF NOT EXISTS original_artwork_reservations_artwork_idx
  ON original_artwork_reservations(artwork_id, status, reserved_until);

CREATE TABLE IF NOT EXISTS original_artwork_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  artwork_id TEXT NOT NULL,
  reservation_id TEXT,
  event_type TEXT NOT NULL,
  event_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (artwork_id) REFERENCES original_artworks(artwork_id)
);

INSERT OR IGNORE INTO original_artworks (
  artwork_id, title, price_cents, declared_value_cents, currency,
  package_length_cm, package_width_cm, package_height_cm, package_weight_kg,
  status, created_at, updated_at
) VALUES
  ('dusaemas', 'DusaEmas', 20000, 20000, 'EUR', 55, 45, 15, 2.5, 'unavailable', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gold', 'Gold', 20000, 20000, 'EUR', 55, 45, 15, 2.5, 'unavailable', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('study', 'Study', 20000, 20000, 'EUR', 55, 45, 15, 2.5, 'unavailable', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('untitled', 'Untitled', 20000, 20000, 'EUR', 55, 45, 15, 2.5, 'unavailable', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
