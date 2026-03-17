use super::modes::TimerMode;
use crate::features::session::session::{Session, SessionEvent, SessionStatus, SessionType};
use crate::features::settings::types::AppSettings;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct Timer {
    pub status: TimerStatus,
    pub total_seconds: u32,
    pub remaining_seconds: u32,
    pub overtime_seconds: u32,
    pub sessions_completed: u32,
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
            mode,
            session: None,
        };
    }

    pub fn apply_settings(&mut self, settings: &AppSettings) {
        self.mode = TimerMode::from_settings(settings);
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
