-- Additive migration: account deletion receipts (idempotency only; no uid, no username)
CREATE TABLE IF NOT EXISTS account_deletions (
  request_id TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_account_deletions_deleted_at ON account_deletions(deleted_at);
