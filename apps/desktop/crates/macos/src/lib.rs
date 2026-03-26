#[cfg(target_os = "macos")]
mod ffi;

#[cfg(target_os = "macos")]
use ffi::*;

/// Check if input monitoring permission is granted.
///
/// On macOS, this permission is required for global keyboard/mouse event detection.
///
/// Returns `true` on non-macOS platforms.
pub fn is_input_monitoring_enabled() -> bool {
    #[cfg(target_os = "macos")]
    {
        unsafe { macos_is_input_monitoring_enabled() }
    }

    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}
