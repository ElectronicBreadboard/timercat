use crate::features::session::session::{Phase, Session};
use crate::features::settings::types::AppSettings;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Timer {
    pub status: TimerStatus,
    pub phase: Phase,
    pub total_seconds: u32,
    pub remaining_seconds: u32,
    pub overtime_seconds: u32,
    pub sessions_completed: u32,
    pub last_work_session: Option<WorkSessionStats>,
    pub speed: u32,

    #[serde(skip)]
    #[specta(skip)]
    pub session: Option<Session>,
}

impl Timer {
    pub fn new(config: &TimerConfig) -> Self {
        return Self {
            status: TimerStatus::Idle,
            phase: Phase::Work,
            total_seconds: config.work_duration,
            remaining_seconds: config.work_duration,
            overtime_seconds: 0,
            sessions_completed: 0,
            last_work_session: None,
            speed: config.speed,
            session: None,
        };
    }

    pub fn get_duration_for_phase(phase: Phase, config: &TimerConfig) -> u32 {
        return match phase {
            Phase::Work => config.work_duration,
            Phase::ShortBreak => config.short_break_duration,
            Phase::LongBreak => config.long_break_duration,
        };
    }

    /// Get current session id if active.
    pub fn session_id(&self) -> Option<i64> {
        return self.session.as_ref().map(|s| s.id);
    }
}

impl Default for Timer {
    fn default() -> Self {
        return Self::new(&TimerConfig::default());
    }
}

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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum TimerStatus {
    Idle,
    Running,
    Paused,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WorkSessionStats {
    pub base_seconds: u32,
    pub extended_seconds: u32,
    pub overtime_seconds: u32,
    pub completed_seconds: u32,
}
