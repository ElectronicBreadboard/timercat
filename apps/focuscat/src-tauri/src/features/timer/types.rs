use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use crate::features::settings::types::AppSettings;

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

/// Runtime timer settings (in seconds). Derived from AppSettings.
#[derive(Debug, Clone)]
pub struct TimerConfig {
    pub work_duration: u32,
    pub short_break_duration: u32,
    pub long_break_duration: u32,
    pub sessions_before_long_break: u32,
}

impl From<&AppSettings> for TimerConfig {
    fn from(settings: &AppSettings) -> Self {
        return Self {
            work_duration: settings.work_duration_minutes * 60,
            short_break_duration: settings.short_break_minutes * 60,
            long_break_duration: settings.long_break_minutes * 60,
            sessions_before_long_break: settings.sessions_before_long_break,
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
    /// Counts up after session completes (for overtime tracking)
    pub overtime_seconds: u32,
    pub category: Option<FocusCategory>,
    pub sessions_completed: u32,
    pub target_sessions: u32,
    /// Base work duration from settings (for progress calculation)
    pub base_work_seconds: u32,
    /// Debug only: speed multiplier (1x, 2x, 4x, etc.)
    pub speed: u32,
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
            category: None,
            sessions_completed: 0,
            target_sessions: 4,
            base_work_seconds: config.work_duration,
            speed: 1,
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
            category: None,
            sessions_completed: 0,
            target_sessions: config.sessions_before_long_break,
            base_work_seconds: config.work_duration,
            speed: 1,
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

pub type TimerState = Mutex<Timer>;

// MARK: - Events

/// Event emitted every second while timer is running.
#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct TimerTickEvent(pub Timer);

/// Event emitted when timer phase completes.
#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct TimerCompleteEvent(pub TimerPhase);
