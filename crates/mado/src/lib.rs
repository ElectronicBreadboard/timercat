//! # mado (窓)
//!
//! A simple, clean window monitoring library for Rust.
//!
//! **mado** (窓) means "window" in Japanese - simple and direct.
//!
//! ## Quick Start
//!
//! ### Query current state
//!
//! ```rust,no_run
//! let app = mado::get_active_app()?;
//! println!("Current app: {}", app.name);
//!
//! let window = mado::get_active_window()?;
//! println!("Window: '{}' in {}", window.title, window.app.name);
//! # Ok::<(), mado::Error>(())
//! ```
//!
//! ### Monitor changes
//!
//! ```rust,no_run
//! use mado::{WindowListener, WindowMonitor, WindowEvent};
//!
//! struct MyListener;
//!
//! impl WindowListener for MyListener {
//!     fn on_focus_change(&self, event: WindowEvent) {
//!         match event {
//!             WindowEvent::AppActivated { app } => {
//!                 println!("App activated: {}", app.name);
//!             }
//!             WindowEvent::WindowChanged { window } => {
//!                 println!("Window: '{}'", window.title);
//!             }
//!         }
//!     }
//! }
//!
//! let monitor = WindowMonitor::new(MyListener);
//! monitor.run()?;
//! ```
//!
//! ## Platform Support
//!
//! - ✅ **macOS**: Full support
//! - 🚧 **Linux**: Planned
//! - 🚧 **Windows**: Planned
//!
//! ## Requirements
//!
//! **macOS:**
//! - Accessibility permissions required if `track_window_changes: true` (default)
//! - Automation permissions (optional, for browser URL extraction)

pub mod config;
pub mod error;
pub mod listener;
pub mod monitor;
pub mod platform;
pub mod types;

pub use config::{MonitorConfig, QueryConfig};
pub use error::Error;
pub use listener::WindowListener;
pub use monitor::WindowMonitor;
pub use types::{AppInfo, BrowserInfo, WindowBounds, WindowEvent, WindowInfo};

/// Get information about the currently active application
///
/// This is a synchronous query that returns the current state immediately.
///
/// # Errors
///
/// Returns an error if:
/// - No application is currently active
/// - Platform API calls fail
///
/// # Example
///
/// ```rust,no_run
/// let app = mado::get_active_app()?;
/// println!("Current app: {} (PID: {})", app.name, app.pid);
/// # Ok::<(), mado::Error>(())
/// ```
pub fn get_active_app() -> Result<AppInfo, Error> {
    platform::get_active_app()
}

/// Get information about the currently active window.
///
/// This is a synchronous query that returns the current state immediately.
/// The returned `WindowInfo` includes both window details and the associated app info.
///
/// # Errors
///
/// Returns an error if:
/// - No window is currently focused
/// - Missing permissions
/// - Platform API calls fail
///
/// # Example
///
/// ```rust,no_run
/// let window = mado::get_active_window()?;
/// println!("Window: '{}'", window.title);
/// # Ok::<(), mado::Error>(())
/// ```
pub fn get_active_window() -> Result<WindowInfo, Error> {
    platform::get_active_window(QueryConfig::default())
}

/// Get information about the currently active window with custom configuration.
///
/// # Arguments
///
/// * `config` - Configuration for the query (e.g. browser URL extraction)
///
/// # Errors
///
/// Returns an error if:
/// - No window is currently focused
/// - Missing permissions
/// - Platform API calls fail
///
/// # Example
///
/// ```rust,no_run
/// use mado::QueryConfig;
///
/// // With browser URL extraction (slower, macOS only)
/// let config = QueryConfig {
///     allow_browser: true,
/// };
/// let window = mado::get_active_window_with_config(config)?;
/// if let Some(browser) = &window.browser {
///     println!("URL: {:?}", browser.url);
/// }
/// # Ok::<(), mado::Error>(())
/// ```
pub fn get_active_window_with_config(config: QueryConfig) -> Result<WindowInfo, Error> {
    platform::get_active_window(config)
}

/// Check if accessibility permissions are granted (macOS only)
///
/// On macOS, accessibility permissions are required for window monitoring.
/// This function returns `true` if permissions are granted.
///
/// On other platforms (e.g. Linux), this always returns `true`.
///
/// # Example
///
/// ```rust,no_run
/// if !mado::is_accessibility_trusted() {
///     eprintln!("Please grant accessibility permissions in System Settings");
/// }
/// ```
pub fn is_accessibility_trusted() -> bool {
    platform::is_accessibility_trusted()
}
