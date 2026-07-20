CREATE TABLE IF NOT EXISTS checkout_event_claims (
  session_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('processing', 'processed')),
  claim_token TEXT NOT NULL,
  claimed_at INTEGER NOT NULL,
  processed_at INTEGER
);

CREATE INDEX IF NOT EXISTS checkout_event_claims_status_idx
  ON checkout_event_claims (status, claimed_at);
