-- Rename plural tables to singular for consistency
ALTER TABLE sessions RENAME TO session;
ALTER TABLE session_events RENAME TO session_event;

-- Fix index names to match renamed tables
DROP INDEX idx_sessions_started_at;
DROP INDEX idx_sessions_session_type;
CREATE INDEX idx_session_started_at ON session (started_at);
CREATE INDEX idx_session_session_type ON session (session_type);

DROP INDEX idx_session_events_session_id;
CREATE INDEX idx_session_event_session_id ON session_event (session_id);

-- Drop old rule-based focus profile table
DROP TABLE IF EXISTS focus_profile_rule;

-- Add enabled flag to focus profiles (disabled = not active, not suggested in session setup)
ALTER TABLE focus_profile ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;

-- Focus profile categories (categorize apps/websites as focused/neutral/distracting)
-- Both app_id and website_id NULL = applies to ALL
CREATE TABLE focus_profile_category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    focus_profile_id INTEGER NOT NULL REFERENCES focus_profile (id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('focused', 'neutral', 'distracting')),
    app_id INTEGER REFERENCES app (id) ON DELETE CASCADE,
    website_id INTEGER REFERENCES website (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    -- only one of app_id or website_id may be set (both NULL = All)
    CHECK (NOT (app_id IS NOT NULL AND website_id IS NOT NULL))
);

CREATE INDEX idx_focus_profile_category_profile_id ON focus_profile_category (focus_profile_id);

CREATE INDEX idx_focus_profile_category_app_id ON focus_profile_category (app_id);

CREATE INDEX idx_focus_profile_category_website_id ON focus_profile_category (website_id);

CREATE UNIQUE INDEX idx_focus_profile_category_unique_app ON focus_profile_category (focus_profile_id, app_id)
WHERE
    app_id IS NOT NULL;

CREATE UNIQUE INDEX idx_focus_profile_category_unique_website ON focus_profile_category (focus_profile_id, website_id)
WHERE
    website_id IS NOT NULL;

CREATE UNIQUE INDEX idx_focus_profile_category_unique_all ON focus_profile_category (focus_profile_id)
WHERE
    app_id IS NULL
    AND website_id IS NULL;

-- Migrate focus_profile_schedule -> focus_profile_activation
-- Renames table, renames columns (days/start_time/end_time -> schedule_*),
-- makes schedule columns nullable (NULL = no time restriction),
-- adds session_types column (JSON array, NULL = all session types),
-- and migrates mode values (sessions_only -> pre_selected).
-- SQLite does not support ALTER COLUMN so we recreate the table.
CREATE TABLE focus_profile_activation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    focus_profile_id INTEGER NOT NULL REFERENCES focus_profile (id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('always_on', 'pre_selected')),
    session_types TEXT NULL,
    schedule_days TEXT NULL,
    schedule_start_time TEXT NULL,
    schedule_end_time TEXT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

INSERT INTO focus_profile_activation (id, focus_profile_id, mode, session_types, schedule_days, schedule_start_time, schedule_end_time, created_at)
    SELECT id, focus_profile_id,
        CASE mode WHEN 'sessions_only' THEN 'pre_selected' ELSE mode END,
        NULL,
        days, start_time, end_time, created_at
    FROM focus_profile_schedule;

DROP TABLE focus_profile_schedule;

CREATE INDEX idx_focus_profile_activation_profile_id ON focus_profile_activation (focus_profile_id);
