use super::persistence::load_settings;
use serde::{Deserialize, Serialize};
use std::{ops::Deref, sync::Mutex};
use tauri::App;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct AppSettings {
    pub version: SettingsVersion,
    pub launch_at_login: bool,
    pub features: FeaturesSettings,
    pub appearance: AppearanceSettings,
    pub audio: AudioSettings,
    pub developer: DeveloperSettings,
    pub timer: TimerSettings,
    pub goals: GoalSettings,
    pub activity: ActivitySettings,
    pub cat: CatSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        return Self {
            version: SettingsVersion::current(),
            launch_at_login: false,
            features: FeaturesSettings::default(),
            appearance: AppearanceSettings::default(),
            audio: AudioSettings::default(),
            developer: DeveloperSettings::default(),
            timer: TimerSettings::default(),
            goals: GoalSettings::default(),
            activity: ActivitySettings::default(),
            cat: CatSettings::default(),
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum SettingsVersion {
    #[serde(rename = "0.0.1")]
    V0_0_1,
}

impl SettingsVersion {
    pub fn current() -> Self {
        return Self::V0_0_1;
    }
}

impl Default for SettingsVersion {
    fn default() -> Self {
        return Self::current();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct FeaturesSettings {
    pub goals: bool,
    pub activity: bool,
    pub profiles: bool,
    pub cat_window: bool,
    pub developer: bool,
}

impl Default for FeaturesSettings {
    fn default() -> Self {
        return Self {
            goals: true,
            activity: true,
            profiles: true,
            cat_window: !cfg!(feature = "app-store"),
            developer: false,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct AppearanceSettings {
    pub theme: Theme,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    #[default]
    Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct AudioSettings {
    pub enabled: bool,
    /// Volume 0.0..=1.0 (linear scale)
    pub volume: f32,
}

impl Default for AudioSettings {
    fn default() -> Self {
        return Self {
            enabled: true,
            volume: 0.6,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct DeveloperSettings {
    pub cat: bool,
    pub timer_speed: u32,
}

impl Default for DeveloperSettings {
    fn default() -> Self {
        return Self {
            cat: false,
            timer_speed: 1,
        };
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct TimerSettings {
    pub timer_mode: TimerModeEnum,
    pub pomodoro: PomodoroSettings,
    pub countdown: CountdownSettings,
    pub show_session_setup: bool,
}

impl Default for TimerSettings {
    fn default() -> Self {
        return Self {
            timer_mode: TimerModeEnum::Pomodoro,
            pomodoro: PomodoroSettings::default(),
            countdown: CountdownSettings::default(),
            show_session_setup: false,
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "lowercase")]
pub enum TimerModeEnum {
    #[default]
    Pomodoro,
    Countdown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct PomodoroSettings {
    pub work_duration_minutes: u32,
    pub short_break_minutes: u32,
    pub long_break_minutes: u32,
    pub sessions_before_long_break: u32,
    pub auto_advance: bool,
    pub auto_advance_countdown_seconds: u32,
}

impl Default for PomodoroSettings {
    fn default() -> Self {
        return Self {
            work_duration_minutes: 25,
            short_break_minutes: 5,
            long_break_minutes: 15,
            sessions_before_long_break: 4,
            auto_advance: false,
            auto_advance_countdown_seconds: 5,
        };
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct CountdownSettings {
    pub duration_minutes: u32,
}

impl Default for CountdownSettings {
    fn default() -> Self {
        return Self {
            duration_minutes: 25,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct GoalSettings {
    /// Daily focus goal in minutes (default: 120 = 2h)
    pub daily_goal_minutes: u32,
}

impl Default for GoalSettings {
    fn default() -> Self {
        return Self {
            daily_goal_minutes: 120,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct ActivitySettings {
    /// Whether to record app usage (app switches)
    pub track_apps: bool,
    /// Whether to track window changes (not just app switches)
    pub track_windows: bool,
    /// Whether to track browser URLs
    pub track_browser: bool,
}

impl Default for ActivitySettings {
    fn default() -> Self {
        return Self {
            track_apps: true,
            track_windows: !cfg!(feature = "app-store"),
            track_browser: !cfg!(feature = "app-store"),
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct CatSettings {
    pub equipped_fur: String,
    pub equipped_face: String,
    pub equipped_hat: Option<String>,
}

impl Default for CatSettings {
    fn default() -> Self {
        return Self {
            equipped_fur: "white".to_string(),
            equipped_face: "cute".to_string(),
            equipped_hat: None,
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

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsChangedEvent(pub AppSettings);
