use serde::{Deserialize, Serialize};

/// Global application settings.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub debug: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        return Self { debug: false };
    }
}

/// Event emitted when app settings change.
#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsChangedEvent(pub AppSettings);
