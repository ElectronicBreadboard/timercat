use std::sync::Mutex;
use crate::features::settings::types::AppSettings;

/// Type alias for settings state.
/// `Mutex` is used to ensure thread-safe access to the settings.
pub type AppSettingsState = Mutex<AppSettings>;
