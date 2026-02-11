use crate::features::session::session::{Session, SessionType};
use crate::features::settings::types::AppSettings;
use serde::{Deserialize, Serialize};

use super::modes::pomodoro::PomodoroMode;
use super::modes::TimerMode;

#[derive(Debug, Clone)]
pub struct Timer {
    pub status: TimerStatus,
    pub session_type: SessionType,
    pub total_seconds: u32,
    pub remaining_seconds: u32,
    pub overtime_seconds: u32,
    pub sessions_completed: u32,
    pub speed: u32,
    pub session: Option<Session>,
}

impl Timer {
    pub fn new(config: &TimerConfig) -> Self {
        let mode = PomodoroMode;
        let initial = mode.initial_session_type();
        let duration = mode.duration_for(initial, config);
        return Self {
            status: TimerStatus::Idle,
            session_type: initial,
            total_seconds: duration,
            remaining_seconds: duration,
            overtime_seconds: 0,
            sessions_completed: 0,
            speed: config.speed,
            session: None,
        };
    }

    /// Get current session id if active.
    pub fn session_id(&self) -> Option<i64> {
        return self.session.as_ref().map(|s| s.id);
    }

    /// Reset timer to idle with given session type and duration.
    pub fn reset_to_idle(&mut self, session_type: SessionType, duration: u32) {
        self.session = None;
        self.status = TimerStatus::Idle;
        self.session_type = session_type;
        self.total_seconds = duration;
        self.remaining_seconds = duration;
        self.overtime_seconds = 0;
        self.sessions_completed = 0;
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
