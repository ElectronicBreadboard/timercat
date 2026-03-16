use crate::features::session::session::SessionType;
use crate::features::settings::types::AppSettings;

#[derive(Debug, Clone)]
pub struct PomodoroMode {
    pub work_duration_seconds: u32,
    pub short_break_duration_seconds: u32,
    pub long_break_duration_seconds: u32,
    pub sessions_before_long_break: u32,
}

impl PomodoroMode {
    pub fn from_settings(settings: &AppSettings) -> Self {
        let p = &settings.timer.pomodoro;
        return Self {
            work_duration_seconds: p.work_duration_minutes * 60,
            short_break_duration_seconds: p.short_break_minutes * 60,
            long_break_duration_seconds: p.long_break_minutes * 60,
            sessions_before_long_break: p.sessions_before_long_break,
        };
    }

    pub fn first_session(&self) -> (SessionType, u32) {
        return (SessionType::PomodoroWork, self.work_duration_seconds);
    }

    pub fn next_session(
        &self,
        current: SessionType,
        completed_work: u32,
    ) -> Option<(SessionType, u32)> {
        let next_type = match current {
            SessionType::PomodoroWork => {
                let n = completed_work + 1;
                if n % self.sessions_before_long_break == 0 {
                    SessionType::PomodoroLongBreak
                } else {
                    SessionType::PomodoroShortBreak
                }
            }
            SessionType::PomodoroShortBreak | SessionType::PomodoroLongBreak => {
                SessionType::PomodoroWork
            }
            SessionType::Countdown => return None,
        };
        let duration = self.duration_seconds_for(next_type);
        return Some((next_type, duration));
    }

    pub fn duration_seconds_for(&self, session_type: SessionType) -> u32 {
        return match session_type {
            SessionType::PomodoroWork => self.work_duration_seconds,
            SessionType::PomodoroShortBreak => self.short_break_duration_seconds,
            SessionType::PomodoroLongBreak => self.long_break_duration_seconds,
            SessionType::Countdown => 0,
        };
    }
}
