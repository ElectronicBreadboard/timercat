pub mod countdown;
pub mod pomodoro;

use crate::features::session::session::SessionType;
use crate::features::settings::types::{AppSettings, TimerModeEnum};
pub use countdown::CountdownMode;
pub use pomodoro::PomodoroMode;

#[derive(Debug, Clone)]
pub enum TimerMode {
    Countdown(CountdownMode),
    Pomodoro(PomodoroMode),
}

impl TimerMode {
    pub fn from_settings(settings: &AppSettings) -> Self {
        return match settings.timer.timer_mode {
            TimerModeEnum::Pomodoro => Self::Pomodoro(PomodoroMode::from_settings(settings)),
            TimerModeEnum::Countdown => Self::Countdown(CountdownMode::from_settings(settings)),
        };
    }

    pub fn first_session(&self) -> (SessionType, u32) {
        return match self {
            Self::Countdown(m) => m.first_session(),
            Self::Pomodoro(m) => m.first_session(),
        };
    }

    pub fn next_session(
        &self,
        current: SessionType,
        completed_work: u32,
    ) -> Option<(SessionType, u32)> {
        return match self {
            Self::Countdown(m) => m.next_session(current, completed_work),
            Self::Pomodoro(m) => m.next_session(current, completed_work),
        };
    }
}
