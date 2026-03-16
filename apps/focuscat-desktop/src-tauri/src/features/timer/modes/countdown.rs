use crate::features::session::session::SessionType;
use crate::features::settings::types::AppSettings;

#[derive(Debug, Clone)]
pub struct CountdownMode {
    pub duration_seconds: u32,
}

impl CountdownMode {
    pub fn from_settings(settings: &AppSettings) -> Self {
        return Self {
            duration_seconds: settings.timer.countdown.duration_minutes * 60,
        };
    }

    pub fn first_session(&self) -> (SessionType, u32) {
        return (SessionType::Countdown, self.duration_seconds);
    }

    pub fn next_session(
        &self,
        _current: SessionType,
        _completed_work: u32,
    ) -> Option<(SessionType, u32)> {
        return None;
    }
}
