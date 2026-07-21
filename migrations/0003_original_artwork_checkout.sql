CREATE TABLE IF NOT EXISTS original_artwork_checkout_attempts (
  checkout_attempt_id TEXT PRIMARY KEY,
  artwork_id TEXT NOT NULL,
  reservation_id TEXT UNIQUE,
  checkout_session_id TEXT UNIQUE,
  checkout_url TEXT,
  checkout_expires_at INTEGER,
  status TEXT NOT NULL CHECK (status IN ('reserving', 'checkout-created', 'completed', 'expired', 'released', 'failed')),
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (artwork_id) REFERENCES original_artworks(artwork_id),
  FOREIGN KEY (reservation_id) REFERENCES original_artwork_reservations(reservation_id)
);

CREATE INDEX IF NOT EXISTS original_artwork_checkout_attempts_status_idx
  ON original_artwork_checkout_attempts(status, checkout_expires_at);
