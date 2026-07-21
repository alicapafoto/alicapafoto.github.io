CREATE TABLE IF NOT EXISTS order_events (
  session_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  sheet_synced INTEGER NOT NULL DEFAULT 0 CHECK (sheet_synced IN (0, 1)),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  lease_expires_at INTEGER NOT NULL,
  order_json TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS order_events_status_idx
  ON order_events(status, lease_expires_at);
