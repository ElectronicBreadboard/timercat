-- Sessions (pomodoro timer sessions)
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase TEXT NOT NULL, -- 'work' | 'short_break' | 'long_break'
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'cancelled'
    planned_seconds INTEGER NOT NULL,
    actual_seconds INTEGER, -- NULL until session ends, excludes pauses
    intention TEXT, -- optional session intention ("What are you focusing on?")
    started_at INTEGER NOT NULL,
    ended_at INTEGER, -- NULL until session ends
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_sessions_started_at ON sessions (started_at);

CREATE INDEX idx_sessions_phase ON sessions (phase);

-- Session events (state changes during a session)
CREATE TABLE session_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'started' | 'paused' | 'resumed' | 'extended' | 'overtime_started' | 'completed' | 'cancelled'
    timestamp INTEGER NOT NULL,
    content TEXT, -- JSON, e.g. {"seconds": 300}
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_session_events_session_id ON session_events (session_id);

-- Apps (deduplicated app info)
CREATE TABLE app (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bundle_id TEXT UNIQUE,
    name TEXT,
    process_path TEXT,
    icon TEXT, -- base64 PNG data URL
    color TEXT, -- hex color like "#5865F2"
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_app_bundle_id ON app (bundle_id);

-- Websites (deduplicated website info)
CREATE TABLE website (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE NOT NULL, -- e.g. "youtube.com"
    name TEXT, -- e.g. "YouTube" (NULL = use domain)
    icon TEXT, -- base64 PNG favicon
    color TEXT, -- hex color like "#FF0000"
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_website_domain ON website (domain);

-- Focus profiles (reusable focus configurations)
CREATE TABLE focus_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT, -- hex color like "#5865F2"
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Focus profile rules (block/allow apps/websites)
-- Both app_id and website_id NULL = applies to ALL (for "block all" rule)
CREATE TABLE focus_profile_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    focus_profile_id INTEGER NOT NULL REFERENCES focus_profile (id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'block' | 'allow'
    app_id INTEGER REFERENCES app (id) ON DELETE CASCADE,
    website_id INTEGER REFERENCES website (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    CHECK (action IN ('block', 'allow')),
    CHECK (
        NOT (
            app_id IS NOT NULL
            AND website_id IS NOT NULL
        )
    )
);

CREATE INDEX idx_focus_profile_rule_profile_id ON focus_profile_rule (focus_profile_id);

CREATE INDEX idx_focus_profile_rule_app_id ON focus_profile_rule (app_id);

CREATE INDEX idx_focus_profile_rule_website_id ON focus_profile_rule (website_id);

CREATE UNIQUE INDEX idx_focus_profile_rule_unique_app ON focus_profile_rule (focus_profile_id, app_id)
WHERE
    app_id IS NOT NULL;

CREATE UNIQUE INDEX idx_focus_profile_rule_unique_website ON focus_profile_rule (focus_profile_id, website_id)
WHERE
    website_id IS NOT NULL;

CREATE UNIQUE INDEX idx_focus_profile_rule_unique_all ON focus_profile_rule (focus_profile_id)
WHERE
    app_id IS NULL
    AND website_id IS NULL;

-- Focus profile schedules (auto-activation time windows)
-- No rows = manual-only profile.
-- days: JSON array of day numbers [0=Mon .. 6=Sun]
CREATE TABLE focus_profile_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    focus_profile_id INTEGER NOT NULL REFERENCES focus_profile (id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (
        mode IN ('always_on', 'sessions_only')
    ),
    days TEXT NOT NULL,
    start_time TEXT NOT NULL, -- "HH:MM" format
    end_time TEXT NOT NULL, -- "HH:MM" format
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_focus_profile_schedule_profile_id ON focus_profile_schedule (focus_profile_id);

-- Session focus profiles (which profiles are active, with priority for override)
CREATE TABLE session_focus_profile (
    session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    focus_profile_id INTEGER NOT NULL REFERENCES focus_profile (id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 0, -- higher = overrides lower
    PRIMARY KEY (session_id, focus_profile_id)
);

CREATE INDEX idx_session_focus_profile_session_id ON session_focus_profile (session_id);

CREATE INDEX idx_session_focus_profile_profile_id ON session_focus_profile (focus_profile_id);

-- App activity (which app was focused)
CREATE TABLE activity_app (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL REFERENCES app (id) ON DELETE CASCADE,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_activity_app_app_id ON activity_app (app_id);

CREATE INDEX idx_activity_app_started_at ON activity_app (started_at);

-- Window activity (which window was focused)
CREATE TABLE activity_window (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL REFERENCES app (id) ON DELETE CASCADE,
    website_id INTEGER REFERENCES website (id) ON DELETE SET NULL,
    window_title TEXT,
    window_id INTEGER,
    window_x REAL,
    window_y REAL,
    window_width REAL,
    window_height REAL,
    browser_url TEXT, -- NULL for non-browsers
    browser_is_private INTEGER, -- NULL for non-browsers
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_activity_window_app_id ON activity_window (app_id);

CREATE INDEX idx_activity_window_started_at ON activity_window (started_at);

CREATE INDEX idx_activity_window_website_id ON activity_window (website_id);

CREATE INDEX idx_activity_window_browser_url ON activity_window (browser_url)
WHERE
    browser_url IS NOT NULL;