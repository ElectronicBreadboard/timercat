use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub debug: bool,
    /// Work duration in minutes
    pub work_duration_minutes: u32,
    /// Short break duration in minutes
    pub short_break_minutes: u32,
    /// Long break duration in minutes
    pub long_break_minutes: u32,
    /// Number of work sessions before a long break
    pub sessions_before_long_break: u32,
}

impl Default for AppSettings {
    fn default() -> Self {
        return Self {
            debug: false,
            work_duration_minutes: 25,
            short_break_minutes: 5,
            long_break_minutes: 15,
            sessions_before_long_break: 4,
        };
    }
}

// MARK: - State

pub type AppSettingsState = Mutex<AppSettings>;

// MARK: - Events

#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsChangedEvent(pub AppSettings);
