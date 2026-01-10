use serde::{Deserialize, Serialize};
use std::sync::Mutex;

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

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusCategory {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TimerSettings {
    pub work_duration: u32,
    pub short_break_duration: u32,
    pub long_break_duration: u32,
    pub sessions_before_long_break: u32,
}

impl Default for TimerSettings {
    fn default() -> Self {
        return Self {
            work_duration: 25 * 60,
            short_break_duration: 5 * 60,
            long_break_duration: 15 * 60,
            sessions_before_long_break: 4,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Timer {
    pub status: TimerStatus,
    pub phase: TimerPhase,
    pub total_seconds: u32,
    pub remaining_seconds: u32,
    pub category: Option<FocusCategory>,
    pub sessions_completed: u32,
}

impl Default for Timer {
    fn default() -> Self {
        let settings = TimerSettings::default();
        return Self {
            status: TimerStatus::Idle,
            phase: TimerPhase::Work,
            total_seconds: settings.work_duration,
            remaining_seconds: settings.work_duration,
            category: None,
            sessions_completed: 0,
        };
    }
}

impl Timer {
    pub fn get_duration_for_phase(phase: TimerPhase, settings: &TimerSettings) -> u32 {
        return match phase {
            TimerPhase::Work => settings.work_duration,
            TimerPhase::ShortBreak => settings.short_break_duration,
            TimerPhase::LongBreak => settings.long_break_duration,
        };
    }
}

// MARK: - State

pub type TimerState = Mutex<Timer>;
pub type TimerSettingsState = Mutex<TimerSettings>;

// MARK: - Events

/// Event emitted every second while timer is running.
#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct TimerTickEvent(pub Timer);

/// Event emitted when timer phase completes.
#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct TimerCompleteEvent(pub TimerPhase);
