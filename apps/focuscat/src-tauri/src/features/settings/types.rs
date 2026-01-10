use serde::{Deserialize, Serialize};
use std::sync::Mutex;

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

// MARK: - State

pub type AppSettingsState = Mutex<AppSettings>;

// MARK: - Events

#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsChangedEvent(pub AppSettings);
