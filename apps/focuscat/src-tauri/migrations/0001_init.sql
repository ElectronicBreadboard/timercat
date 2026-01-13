-- Focus sessions table
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase TEXT NOT NULL,                -- 'work', 'short_break', 'long_break'
    started_at INTEGER NOT NULL,        -- Unix timestamp
    ended_at INTEGER NOT NULL,
    base_seconds INTEGER NOT NULL,
    extended_seconds INTEGER NOT NULL,
    overtime_seconds INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_sessions_started_at ON sessions(started_at);
CREATE INDEX idx_sessions_phase ON sessions(phase);

-- Session tags (reusable labels for categorizing sessions)
CREATE TABLE session_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Blocked apps per tag
CREATE TABLE session_tag_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_tag_id INTEGER NOT NULL REFERENCES session_tags(id) ON DELETE CASCADE,
    app_bundle_id TEXT NOT NULL,
    app_name TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(session_tag_id, app_bundle_id)
);

CREATE INDEX idx_session_tag_rules_tag_id ON session_tag_rules(session_tag_id);

-- Which tags are applied to which session
CREATE TABLE session_applied_tags (
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    session_tag_id INTEGER NOT NULL REFERENCES session_tags(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    PRIMARY KEY (session_id, session_tag_id)
);

CREATE INDEX idx_session_applied_tags_session_id ON session_applied_tags(session_id);

-- Default starter tags
INSERT INTO session_tags (name, color) VALUES
    ('Focus', '#6366f1'),
    ('No Social', '#ef4444'),
    ('No Entertainment', '#f59e0b');
