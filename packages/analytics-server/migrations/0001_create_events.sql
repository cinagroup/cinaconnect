-- Migration 0001: Create events table
-- CinaConnect Analytics D1 Schema

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL DEFAULT 'default',
    event_type TEXT NOT NULL,
    user_id TEXT NOT NULL,
    properties TEXT NOT NULL DEFAULT '{}',
    timestamp INTEGER NOT NULL,
    ip_hash TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_app_id ON events(app_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_app_timestamp ON events(app_id, timestamp);
