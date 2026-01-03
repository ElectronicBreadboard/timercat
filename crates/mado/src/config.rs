/// Configuration for the window monitor.
#[derive(Debug, Clone, Copy)]
pub struct MonitorConfig {
    /// Whether to extract browser URLs (macOS only).
    ///
    /// When enabled, fetches the current URL from browser windows using AppleScript.
    /// Requires Automation permission: System Settings > Privacy & Security > Automation
    ///
    /// This is slower (~50-200ms) but provides URL and private mode info.
    ///
    /// Default: `false`
    pub allow_browser: bool,

    /// Whether to track window changes within the same app.
    ///
    /// When `true` (default), fires events for:
    /// - App switches (always tracked)
    /// - Window focus changes within the same app
    /// - Window title changes (e.g. tab switches in browsers)
    ///
    /// When `false`, only fires events for app switches.
    ///
    /// Default: `true` (track all changes)
    pub track_window_changes: bool,
}

impl Default for MonitorConfig {
    fn default() -> Self {
        Self {
            allow_browser: false,
            track_window_changes: true,
        }
    }
}

/// Configuration for querying window/app information.
#[derive(Debug, Clone, Copy)]
pub struct QueryConfig {
    /// Whether to extract browser URLs (macOS only).
    ///
    /// When enabled, fetches the current URL from browser windows using AppleScript.
    /// Requires Automation permission: System Settings > Privacy & Security > Automation
    ///
    /// This is slower (~50-200ms) but provides URL and private mode info.
    ///
    /// Default: `false`
    pub allow_browser: bool,
}

impl Default for QueryConfig {
    fn default() -> Self {
        Self {
            allow_browser: false,
        }
    }
}
