use super::persistence::load_settings;
use serde::{Deserialize, Serialize};
use std::ops::Deref;
use std::sync::Mutex;
use tauri::App;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DebugSettings {
    pub enabled: bool,
    pub cat: bool,
    pub timer_speed: u32,
}

impl Default for DebugSettings {
    fn default() -> Self {
        return Self {
            enabled: false,
            cat: false,
            timer_speed: 1,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TimerSettings {
    /// Work duration in minutes
    pub work_duration_minutes: u32,
    /// Short break duration in minutes
    pub short_break_minutes: u32,
    /// Long break duration in minutes
    pub long_break_minutes: u32,
    /// Number of work sessions before a long break
    pub sessions_before_long_break: u32,
}

impl Default for TimerSettings {
    fn default() -> Self {
        return Self {
            work_duration_minutes: 25,
            short_break_minutes: 5,
            long_break_minutes: 15,
            sessions_before_long_break: 4,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusGoalSettings {
    /// Daily focus goal in minutes (default: 120 = 2h)
    pub daily_goal_minutes: u32,
}

impl Default for FocusGoalSettings {
    fn default() -> Self {
        return Self {
            daily_goal_minutes: 120,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub debug: DebugSettings,
    pub timer: TimerSettings,
    pub focus_goal: FocusGoalSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        return Self {
            debug: DebugSettings::default(),
            timer: TimerSettings::default(),
            focus_goal: FocusGoalSettings::default(),
        };
    }
}

// MARK: - State

pub struct AppSettingsState(Mutex<AppSettings>);

impl AppSettingsState {
    pub fn init(app: &App) -> Self {
        let settings = load_settings(app);
        return Self(Mutex::new(settings));
    }
}

impl Deref for AppSettingsState {
    type Target = Mutex<AppSettings>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}

// MARK: - Events

#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsChangedEvent(pub AppSettings);
