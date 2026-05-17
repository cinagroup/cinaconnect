-- CinaConnect Keys Server — D1 Schema (SQLite)

CREATE TABLE IF NOT EXISTS keypairs (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(address, chain_id)
);

CREATE INDEX IF NOT EXISTS idx_keypairs_address ON keypairs(address);
CREATE INDEX IF NOT EXISTS idx_keypairs_chain ON keypairs(chain_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_address ON sessions(address);
CREATE INDEX IF NOT EXISTS idx_sessions_nonce ON sessions(nonce);

CREATE TABLE IF NOT EXISTS preferences (
  address TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
