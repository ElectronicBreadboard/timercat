#[cfg(target_os = "macos")]
mod ffi;

use serde::{Deserialize, Serialize};

#[cfg(target_os = "macos")]
use ffi::*;
#[cfg(target_os = "macos")]
use swift_rs::SRString;

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

/// Get all installed applications on the system.
///
/// # Arguments
///
/// * `config` - Configuration for the scan (icons, icon size)
///
/// # Returns
///
/// A vector of installed applications, sorted by name.
///
/// Returns an empty vector on non-macOS platforms.
pub fn get_installed_apps(config: ScanConfig) -> Vec<InstalledApp> {
    #[cfg(target_os = "macos")]
    {
        let icon_size = if config.icon_size == 0 {
            32
        } else {
            config.icon_size as i32
        };

        let json_opt = unsafe { macos_get_installed_apps(config.include_icons, icon_size) };

        match json_opt {
            Some(json) => {
                let json_str = json.as_str().to_string();
                serde_json::from_str(&json_str).unwrap_or_default()
            }
            None => Vec::new(),
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = config;
        Vec::new()
    }
}

/// Information about an installed application.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    /// Bundle identifier (e.g., "com.apple.Safari")
    pub bundle_id: String,
    /// Application name (localized)
    pub name: String,
    /// Path to the application bundle
    pub path: String,
    /// App icon as base64 PNG data URL
    pub icon: Option<String>,
    /// App brand color as hex string like "#5865F2"
    pub color: Option<String>,
}

/// Configuration for scanning installed apps.
#[derive(Debug, Clone, Default)]
pub struct ScanConfig {
    /// Include icons in the results (slower)
    pub include_icons: bool,
    /// Icon size in pixels (default: 32)
    pub icon_size: u32,
}

/// Get icon for a specific app by bundle identifier.
///
/// # Arguments
///
/// * `bundle_id` - The app's bundle identifier (e.g., "com.apple.Safari")
/// * `size` - Icon size in pixels (default: 32 if 0)
///
/// # Returns
///
/// An `AppIcon` with the icon data URL and brand color, or None values if not found.
pub fn get_app_icon(bundle_id: &str, size: u32) -> AppIcon {
    #[cfg(target_os = "macos")]
    {
        let icon_size = if size == 0 { 32 } else { size as i32 };
        let bundle_id_sr = SRString::from(bundle_id);
        let json_opt = unsafe { macos_get_app_icon(&bundle_id_sr, icon_size) };

        match json_opt {
            Some(json) => {
                let json_str = json.as_str().to_string();
                serde_json::from_str(&json_str).unwrap_or_default()
            }
            None => AppIcon::default(),
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (bundle_id, size);
        AppIcon::default()
    }
}

/// App icon result from icon extraction.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppIcon {
    /// Icon as base64 PNG data URL
    pub data_url: Option<String>,
    /// Brand color as hex string like "#5865F2"
    pub color: Option<String>,
}
