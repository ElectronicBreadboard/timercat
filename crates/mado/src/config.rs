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

    /// Whether to include the app icon as a base64 PNG data URL.
    ///
    /// When enabled, extracts the app icon and returns it as a data URL
    /// (e.g., "data:image/png;base64,...") in the `icon` field of `AppInfo`.
    ///
    /// This adds some overhead (~5-20ms) for icon extraction and encoding.
    ///
    /// Default: `false`
    pub include_icon: bool,
}

impl Default for MonitorConfig {
    fn default() -> Self {
        Self {
            allow_browser: false,
            track_window_changes: true,
            include_icon: false,
        }
    }
}

/// Configuration for querying window/app information.
#[derive(Debug, Clone, Copy)]
pub struct QueryConfig {
    /// Whether to extract browser URLs (macOS only).
    ///
    /// When enabled, fetches the current URL from browser windows using the Accessibility API.
    /// Requires Accessibility permission: System Settings > Privacy & Security > Accessibility
    ///
    /// Default: `false`
    pub allow_browser: bool,

    /// Whether to include the app icon as a base64 PNG data URL.
    ///
    /// When enabled, extracts the app icon and returns it as a data URL
    /// (e.g., "data:image/png;base64,...") in the `icon` field of `AppInfo`.
    ///
    /// This adds some overhead (~5-20ms) for icon extraction and encoding.
    ///
    /// Default: `false`
    pub include_icon: bool,
}

impl Default for QueryConfig {
    fn default() -> Self {
        Self {
            allow_browser: false,
            include_icon: false,
        }
    }
}
