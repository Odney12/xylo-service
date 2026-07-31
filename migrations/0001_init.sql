CREATE TABLE gyms (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  slug               TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  phone_number_id    TEXT UNIQUE NOT NULL,
  whatsapp_token     TEXT NOT NULL,
  meta_app_secret    TEXT NOT NULL,
  business_context   TEXT NOT NULL,
  booking_link       TEXT,
  slack_webhook_url  TEXT,
  active             INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  gym_id          INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  phone           TEXT NOT NULL,
  extracted_goal  TEXT,
  pipeline_stage  TEXT NOT NULL DEFAULT 'NEW' CHECK (pipeline_stage IN ('NEW', 'PASS_CLAIMED', 'TOUR_BOOKED', 'HUMAN_PAUSED')),
  last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (gym_id, phone)
);

CREATE TABLE messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  text        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_leads_gym_phone    ON leads (gym_id, phone);
CREATE INDEX idx_gyms_phone_number  ON gyms (phone_number_id);
CREATE INDEX idx_messages_lead      ON messages (lead_id, created_at);