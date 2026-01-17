use crate::features::settings::types::{AppSettings, AppSettingsState};
use serde::{Deserialize, Serialize};
use std::ops::Deref;
use std::sync::Mutex;
use tauri::{App, Manager};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum TimerStatus {
    Idle,
    Running,
    Paused,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum TimerPhase {
    Work,
    ShortBreak,
    LongBreak,
}

/// Stats from the last completed work session (shown during breaks).
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WorkSessionStats {
    /// Original work duration from settings
    pub base_seconds: u32,
    /// Time added via wheel adjustment
    pub extended_seconds: u32,
    /// Time spent after timer hit zero (unplanned)
    pub overtime_seconds: u32,
    /// Total time completed (base + extended + overtime)
    pub completed_seconds: u32,
}

/// Runtime timer settings (in seconds). Derived from AppSettings.
#[derive(Debug, Clone)]
pub struct TimerConfig {
    pub work_duration: u32,
    pub short_break_duration: u32,
    pub long_break_duration: u32,
    pub sessions_before_long_break: u32,
    pub speed: u32,
}

impl From<&AppSettings> for TimerConfig {
    fn from(settings: &AppSettings) -> Self {
        return Self {
            work_duration: settings.timer.work_duration_minutes * 60,
            short_break_duration: settings.timer.short_break_minutes * 60,
            long_break_duration: settings.timer.long_break_minutes * 60,
            sessions_before_long_break: settings.timer.sessions_before_long_break,
            speed: settings.debug.timer_speed,
        };
    }
}

impl Default for TimerConfig {
    fn default() -> Self {
        return Self::from(&AppSettings::default());
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Timer {
    pub status: TimerStatus,
    pub phase: TimerPhase,
    pub total_seconds: u32,
    pub remaining_seconds: u32,
    /// Counts up after timer hits zero
    pub overtime_seconds: u32,
    /// Session tag IDs applied to current session
    pub session_tag_ids: Vec<i32>,
    pub sessions_completed: u32,
    /// Base work duration from settings
    pub base_work_seconds: u32,
    /// Work done before current segment (for multi-extension tracking)
    pub accumulated_work_seconds: u32,
    /// Time added via wheel extensions this session
    pub total_extended_seconds: u32,
    /// Stats from last work session (shown during breaks)
    pub last_work_session: Option<WorkSessionStats>,
    /// Debug: speed multiplier
    pub speed: u32,
    /// Timestamp when current phase started (Unix epoch seconds)
    #[serde(skip)]
    #[specta(skip)]
    pub phase_started_at: Option<i64>,
}

impl Default for Timer {
    fn default() -> Self {
        let config = TimerConfig::default();
        return Self {
            status: TimerStatus::Idle,
            phase: TimerPhase::Work,
            total_seconds: config.work_duration,
            remaining_seconds: config.work_duration,
            overtime_seconds: 0,
            session_tag_ids: Vec::new(),
            sessions_completed: 0,
            base_work_seconds: config.work_duration,
            accumulated_work_seconds: 0,
            total_extended_seconds: 0,
            last_work_session: None,
            speed: config.speed,
            phase_started_at: None,
        };
    }
}

impl Timer {
    pub fn new(config: &TimerConfig) -> Self {
        return Self {
            status: TimerStatus::Idle,
            phase: TimerPhase::Work,
            total_seconds: config.work_duration,
            remaining_seconds: config.work_duration,
            overtime_seconds: 0,
            session_tag_ids: Vec::new(),
            sessions_completed: 0,
            base_work_seconds: config.work_duration,
            accumulated_work_seconds: 0,
            total_extended_seconds: 0,
            last_work_session: None,
            speed: config.speed,
            phase_started_at: None,
        };
    }

    pub fn get_duration_for_phase(phase: TimerPhase, config: &TimerConfig) -> u32 {
        return match phase {
            TimerPhase::Work => config.work_duration,
            TimerPhase::ShortBreak => config.short_break_duration,
            TimerPhase::LongBreak => config.long_break_duration,
        };
    }
}

// MARK: - State

pub struct TimerState(Mutex<Timer>);

impl TimerState {
    /// Initialize timer state from managed AppSettingsState.
    /// Requires AppSettingsState to be managed first.
    pub fn init(app: &App) -> Self {
        let settings_state = app.state::<AppSettingsState>();
        let settings = settings_state.lock().unwrap();
        let config = TimerConfig::from(&*settings);
        return Self(Mutex::new(Timer::new(&config)));
    }
}

impl Deref for TimerState {
    type Target = Mutex<Timer>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}

// MARK: - Events

/// Event emitted every second while timer is running.
#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct TimerTickEvent(pub Timer);

/// Event emitted when timer phase completes.
#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct TimerCompleteEvent(pub TimerPhase);
