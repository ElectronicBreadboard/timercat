use crate::features::session::session::SessionType;
use super::super::timer::TimerConfig;
use super::TimerMode;

/// Classic Pomodoro: work → short break → work → ... → long break (cycle).
pub struct PomodoroMode;

impl TimerMode for PomodoroMode {
    fn initial_session_type(&self) -> SessionType {
        return SessionType::PomodoroWork;
    }

    fn next_session_type(
        &self,
        current: SessionType,
        completed_work: u32,
        config: &TimerConfig,
    ) -> Option<SessionType> {
        return match current {
            // Work → break (short or long based on cycle)
            SessionType::PomodoroWork => {
                let new_completed = completed_work + 1;
                if new_completed % config.sessions_before_long_break == 0 {
                    Some(SessionType::PomodoroLongBreak)
                } else {
                    Some(SessionType::PomodoroShortBreak)
                }
            }
            // Break → work
            SessionType::PomodoroShortBreak | SessionType::PomodoroLongBreak => {
                Some(SessionType::PomodoroWork)
            }
            // Countdown is not part of Pomodoro mode
            SessionType::Countdown => None,
        };
    }

    fn duration_for(&self, session_type: SessionType, config: &TimerConfig) -> u32 {
        return match session_type {
            SessionType::PomodoroWork => config.work_duration,
            SessionType::PomodoroShortBreak => config.short_break_duration,
            SessionType::PomodoroLongBreak => config.long_break_duration,
            SessionType::Countdown => config.countdown_duration,
        };
    }
}
