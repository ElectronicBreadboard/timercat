CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase TEXT NOT NULL, -- 'work', 'short_break', 'long_break'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    planned_seconds INTEGER NOT NULL,
    actual_seconds INTEGER, -- NULL until session ends, excludes pauses (Note: Denormalized for list views (e.g. "20m/30m"), computable from session_events)
    started_at INTEGER NOT NULL,
    ended_at INTEGER, -- NULL until session ends
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_sessions_started_at ON sessions (started_at);

CREATE INDEX idx_sessions_phase ON sessions (phase);

CREATE TABLE session_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'started', 'paused', 'resumed', 'extended', 'overtime_started', 'completed', 'cancelled'
    timestamp INTEGER NOT NULL,
    content TEXT, -- JSON, e.g. extended: {"seconds": 300}
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_session_events_session_id ON session_events (session_id);

-- Deduplicated app info shared across activity tables
CREATE TABLE app (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bundle_id TEXT UNIQUE,
    name TEXT,
    process_path TEXT,
    icon TEXT, -- base64 PNG data URL
    color TEXT, -- hex color like "#5865F2"
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_app_bundle_id ON app (bundle_id);

-- Deduplicated website info shared across activity tables
CREATE TABLE website (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE NOT NULL,     -- e.g., "youtube.com"
    name TEXT,                       -- e.g., "YouTube" (NULL = use domain)
    icon TEXT,                       -- base64 PNG favicon
    color TEXT,                      -- hex color like "#FF0000"
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_website_domain ON website (domain);

-- App-level activity (which app was focused)
CREATE TABLE activity_app (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL REFERENCES app (id) ON DELETE CASCADE,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_activity_app_app_id ON activity_app (app_id);

CREATE INDEX idx_activity_app_started_at ON activity_app (started_at);

-- Window-level activity (which window was focused)
CREATE TABLE activity_window (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL REFERENCES app (id) ON DELETE CASCADE,
    website_id INTEGER REFERENCES website (id) ON DELETE SET NULL,
    -- Window
    window_title TEXT,
    window_id INTEGER,
    window_x REAL,
    window_y REAL,
    window_width REAL,
    window_height REAL,
    -- Browser (NULL for non-browsers)
    browser_url TEXT,
    browser_is_private INTEGER,
    -- Timestamps
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_activity_window_app_id ON activity_window (app_id);

CREATE INDEX idx_activity_window_started_at ON activity_window (started_at);

CREATE INDEX idx_activity_window_website_id ON activity_window (website_id);

CREATE INDEX idx_activity_window_browser_url ON activity_window (browser_url)
WHERE
    browser_url IS NOT NULL;