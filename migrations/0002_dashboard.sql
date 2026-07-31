-- Gym-editable business data, replacing the static business_context blob.
CREATE TABLE offers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  gym_id      INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  valid_until TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pricing_plans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  gym_id        INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price         TEXT NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  includes      TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  gym_id      INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  event_time  TEXT NOT NULL,
  capacity    INTEGER,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dashboard logins: role = 'agency' (sees every gym) or 'gym_owner' (sees only their gym_id)
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('agency', 'gym_owner')),
  gym_id        INTEGER REFERENCES gyms(id) ON DELETE CASCADE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions instead of a cookie-signing scheme - each login gets a random
-- token stored here, so we can revoke sessions and don't need JWT secrets.
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_offers_gym        ON offers (gym_id);
CREATE INDEX idx_pricing_gym       ON pricing_plans (gym_id);
CREATE INDEX idx_events_gym        ON events (gym_id);
CREATE INDEX idx_sessions_expires  ON sessions (expires_at);