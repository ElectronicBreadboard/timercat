use crate::{
    config::MonitorConfig,
    error::Error,
    listener::WindowListener,
    types::{AppInfo, WindowInfo},
};
use std::sync::Arc;

/// Start monitoring window and application focus changes.
///
/// This blocks the current thread until `stop()` is called.
pub fn run(_listener: Arc<dyn WindowListener>, _config: MonitorConfig) -> Result<(), Error> {
    // TODO: Integrate macOS POC implementation
    Err(Error::Platform(
        "macOS implementation not yet integrated".to_string(),
    ))
}

/// Stop the monitor (thread-safe).
///
/// This can be called from any thread to signal the monitor to stop.
pub fn stop() -> Result<(), Error> {
    // TODO: Integrate macOS POC implementation
    Err(Error::Platform(
        "macOS implementation not yet integrated".to_string(),
    ))
}

/// Get information about the currently active application.
///
/// This is a synchronous query that returns the current state immediately.
pub fn get_active_app() -> Result<AppInfo, Error> {
    // TODO: Implement using NSWorkspace.shared.frontmostApplication
    Err(Error::Platform(
        "macOS implementation not yet integrated".to_string(),
    ))
}

/// Get information about the currently active window.
///
/// This is a synchronous query that returns the current state immediately.
/// The returned `WindowInfo` includes both window details and the associated app info.
pub fn get_active_window() -> Result<WindowInfo, Error> {
    // TODO: Implement using Accessibility API
    Err(Error::Platform(
        "macOS implementation not yet integrated".to_string(),
    ))
}

/// Check if accessibility permissions are granted (macOS only).
///
/// On macOS, accessibility permissions are required for window monitoring.
/// This function returns `true` if permissions are granted.
pub fn is_accessibility_trusted() -> bool {
    // TODO: Implement using AXIsProcessTrusted()
    false
}
