use crate::features::session::session::SessionType;
use super::super::timer::TimerConfig;
use super::TimerMode;

/// Countdown: Single configurable timer session with no progression.
pub struct CountdownMode;

impl TimerMode for CountdownMode {
    fn initial_session_type(&self) -> SessionType {
        return SessionType::Countdown;
    }

    fn next_session_type(
        &self,
        _current: SessionType,
        _completed_work: u32,
        _config: &TimerConfig,
    ) -> Option<SessionType> {
        // No next session - countdown stops after completion
        return None;
    }

    fn duration_for(&self, _session_type: SessionType, config: &TimerConfig) -> u32 {
        return config.countdown_duration;
    }
}
