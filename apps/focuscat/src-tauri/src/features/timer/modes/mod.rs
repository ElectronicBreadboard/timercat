pub mod countdown;
pub mod pomodoro;

use crate::features::session::session::SessionType;
use super::timer::TimerConfig;

/// Defines behavior for a timer mode (Pomodoro, Progressive, Countdown, etc.).
/// All modes share the same countdown mechanics; this trait captures the differences:
/// what to start with, what comes next, and how long each session type lasts.
pub trait TimerMode: Send {
    /// First session type when starting fresh.
    fn initial_session_type(&self) -> SessionType;

    /// What comes after completing current session? None = stop.
    fn next_session_type(
        &self,
        current: SessionType,
        completed_work: u32,
        config: &TimerConfig,
    ) -> Option<SessionType>;

    /// Duration in seconds for a given session type.
    fn duration_for(&self, session_type: SessionType, config: &TimerConfig) -> u32;
}
