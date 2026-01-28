-- Sessions (pomodoro timer sessions)
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase TEXT NOT NULL, -- 'work' | 'short_break' | 'long_break'
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'cancelled'
    planned_seconds INTEGER NOT NULL,
    actual_seconds INTEGER, -- NULL until session ends, excludes pauses
    started_at INTEGER NOT NULL,
    ended_at INTEGER, -- NULL until session ends
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
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
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
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
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_app_bundle_id ON app (bundle_id);

-- Websites (deduplicated website info)
CREATE TABLE website (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE NOT NULL, -- e.g. "youtube.com"
    name TEXT, -- e.g. "YouTube" (NULL = use domain)
    icon TEXT, -- base64 PNG favicon
    color TEXT, -- hex color like "#FF0000"
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_website_domain ON website (domain);

-- Tags (blocking contexts, e.g. "Work", "Study", "Social Media")
CREATE TABLE tag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Tag restrictions (what a tag blocks/allows)
CREATE TABLE tag_restriction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id INTEGER NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'block' | 'allow'
    app_id INTEGER REFERENCES app (id) ON DELETE CASCADE,
    website_id INTEGER REFERENCES website (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    CHECK (
        (
            app_id IS NOT NULL
            AND website_id IS NULL
        )
        OR (
            app_id IS NULL
            AND website_id IS NOT NULL
        )
    )
);

CREATE INDEX idx_tag_restriction_tag_id ON tag_restriction (tag_id);

CREATE INDEX idx_tag_restriction_app_id ON tag_restriction (app_id);

CREATE INDEX idx_tag_restriction_website_id ON tag_restriction (website_id);

CREATE UNIQUE INDEX idx_tag_restriction_unique_app ON tag_restriction (tag_id, app_id)
WHERE
    app_id IS NOT NULL;

CREATE UNIQUE INDEX idx_tag_restriction_unique_website ON tag_restriction (tag_id, website_id)
WHERE
    website_id IS NOT NULL;

-- Schedules (time-based auto-activation)
CREATE TABLE schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    days TEXT NOT NULL, -- JSON array: [1,2,3,4,5] (1=Mon, 7=Sun)
    start_time TEXT NOT NULL, -- "HH:MM" format
    end_time TEXT NOT NULL, -- "HH:MM" format
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Schedule tags (which tags are active for a schedule)
CREATE TABLE schedule_tag (
    schedule_id INTEGER NOT NULL REFERENCES schedule (id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
    PRIMARY KEY (schedule_id, tag_id)
);

CREATE INDEX idx_schedule_tag_schedule_id ON schedule_tag (schedule_id);

CREATE INDEX idx_schedule_tag_tag_id ON schedule_tag (tag_id);

-- Session tags (which tags are active for a session)
CREATE TABLE session_tag (
    session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, tag_id)
);

CREATE INDEX idx_session_tag_session_id ON session_tag (session_id);

CREATE INDEX idx_session_tag_tag_id ON session_tag (tag_id);

-- App activity (which app was focused)
CREATE TABLE activity_app (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL REFERENCES app (id) ON DELETE CASCADE,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
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
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_activity_window_app_id ON activity_window (app_id);

CREATE INDEX idx_activity_window_started_at ON activity_window (started_at);

CREATE INDEX idx_activity_window_website_id ON activity_window (website_id);

CREATE INDEX idx_activity_window_browser_url ON activity_window (browser_url)
WHERE
    browser_url IS NOT NULL;