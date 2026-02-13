use crate::features::session::session::{Session, SessionEvent, SessionStatus, SessionType};
use crate::features::settings::types::{AppSettings, TimerModeEnum};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct Timer {
    pub status: TimerStatus,
    pub total_seconds: u32,
    pub remaining_seconds: u32,
    pub overtime_seconds: u32,
    pub sessions_completed: u32,
    pub speed: u32,
    pub mode: TimerMode,
    pub session: Option<Session>,
}

impl Timer {
    pub fn from_settings(settings: &AppSettings) -> Self {
        let mode = TimerMode::from_settings(settings);
        let (_session_type, duration_seconds) = mode.first_session();
        return Self {
            status: TimerStatus::Idle,
            total_seconds: duration_seconds,
            remaining_seconds: duration_seconds,
            overtime_seconds: 0,
            sessions_completed: 0,
            speed: settings.debug.timer_speed,
            mode,
            session: None,
        };
    }

    pub fn apply_settings(&mut self, settings: &AppSettings) {
        self.mode = TimerMode::from_settings(settings);
        self.speed = settings.debug.timer_speed;
    }

    /// First session in the queue.
    pub fn first_session(&self) -> (SessionType, u32) {
        return self.mode.first_session();
    }

    /// Next session after completing the current one. None if no next (e.g. countdown done).
    pub fn next_session(
        &self,
        current_session_type: SessionType,
        completed_work: u32,
    ) -> Option<(SessionType, u32)> {
        return self.mode.next_session(current_session_type, completed_work);
    }

    /// Advance the timer by completing the current session and starting the given one.
    pub fn advance_to_session(
        &mut self,
        new_session: Session,
        next_duration_seconds: u32,
        completed_was_work: bool,
        now: i64,
    ) {
        if let Some(s) = &mut self.session {
            s.status = SessionStatus::Completed;
            s.ended_at = Some(now);
            s.add_event(SessionEvent::Completed { timestamp: now });
        }
        if completed_was_work {
            self.sessions_completed += 1;
        }
        self.session = Some(new_session);
        self.total_seconds = next_duration_seconds;
        self.remaining_seconds = next_duration_seconds;
        self.overtime_seconds = 0;
        self.status = TimerStatus::Running;
    }

    /// Active session id, if any.
    pub fn active_session_id(&self) -> Option<i64> {
        return self.session.as_ref().map(|s| s.id);
    }

    /// Active session’s type if running/paused, else the first session type for this mode.
    pub fn active_session_type(&self) -> SessionType {
        return self
            .session
            .as_ref()
            .map(|s| s.session_type)
            .unwrap_or_else(|| self.mode.first_session().0);
    }

    /// Clear active session and set timer to idle; mode and countdown from settings.
    pub fn reset_to_idle(&mut self, settings: &AppSettings) {
        self.apply_settings(settings);
        self.session = None;
        self.status = TimerStatus::Idle;
        let (_session_type, duration_seconds) = self.first_session();
        self.total_seconds = duration_seconds;
        self.remaining_seconds = duration_seconds;
        self.overtime_seconds = 0;
        self.sessions_completed = 0;
    }
}

impl Default for Timer {
    fn default() -> Self {
        return Self::from_settings(&AppSettings::default());
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum TimerStatus {
    Idle,
    Running,
    Paused,
}

// MARK: - Timer mode

#[derive(Debug, Clone)]
pub enum TimerMode {
    Pomodoro {
        work_duration_seconds: u32,
        short_break_duration_seconds: u32,
        long_break_duration_seconds: u32,
        sessions_before_long_break: u32,
    },
    Countdown {
        duration_seconds: u32,
    },
}

impl TimerMode {
    pub fn from_settings(settings: &AppSettings) -> Self {
        return match settings.timer.timer_mode {
            TimerModeEnum::Pomodoro => {
                let p = &settings.timer.pomodoro;
                Self::Pomodoro {
                    work_duration_seconds: p.work_duration_minutes * 60,
                    short_break_duration_seconds: p.short_break_minutes * 60,
                    long_break_duration_seconds: p.long_break_minutes * 60,
                    sessions_before_long_break: p.sessions_before_long_break,
                }
            }
            TimerModeEnum::Countdown => Self::Countdown {
                duration_seconds: settings.timer.countdown.duration_minutes * 60,
            },
        };
    }

    /// First session in the queue for this mode.
    pub fn first_session(&self) -> (SessionType, u32) {
        return match self {
            Self::Pomodoro {
                work_duration_seconds,
                ..
            } => (SessionType::PomodoroWork, *work_duration_seconds),
            Self::Countdown { duration_seconds } => (SessionType::Countdown, *duration_seconds),
        };
    }

    /// Next session after completing the current one. None if no next (e.g. countdown done).
    pub fn next_session(
        &self,
        current: SessionType,
        completed_work: u32,
    ) -> Option<(SessionType, u32)> {
        let next_type = match self {
            Self::Pomodoro {
                sessions_before_long_break,
                ..
            } => match current {
                SessionType::PomodoroWork => {
                    let n = completed_work + 1;
                    if n % sessions_before_long_break == 0 {
                        SessionType::PomodoroLongBreak
                    } else {
                        SessionType::PomodoroShortBreak
                    }
                }
                SessionType::PomodoroShortBreak | SessionType::PomodoroLongBreak => {
                    SessionType::PomodoroWork
                }
                SessionType::Countdown => return None,
            },
            Self::Countdown { .. } => return None,
        };
        let duration_seconds = self.duration_seconds_for(next_type);
        return Some((next_type, duration_seconds));
    }

    /// Duration (seconds) for the given session type.
    pub fn duration_seconds_for(&self, session_type: SessionType) -> u32 {
        return match (self, session_type) {
            (
                Self::Pomodoro {
                    work_duration_seconds,
                    ..
                },
                SessionType::PomodoroWork,
            ) => *work_duration_seconds,
            (
                Self::Pomodoro {
                    short_break_duration_seconds,
                    ..
                },
                SessionType::PomodoroShortBreak,
            ) => *short_break_duration_seconds,
            (
                Self::Pomodoro {
                    long_break_duration_seconds,
                    ..
                },
                SessionType::PomodoroLongBreak,
            ) => *long_break_duration_seconds,
            (Self::Pomodoro { .. }, SessionType::Countdown) => 0,
            (Self::Countdown { duration_seconds }, _) => *duration_seconds,
        };
    }
}
