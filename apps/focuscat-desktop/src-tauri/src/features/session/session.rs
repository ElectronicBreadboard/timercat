use serde::{Deserialize, Serialize};

/// A timed block (countdown timer) regardless of mode. `session_type` describes
/// the flavor (pomodoro:work, pomodoro:short_break, etc.).
#[derive(Debug, Clone)]
pub struct Session {
    pub id: i64,
    pub session_type: SessionType,
    pub status: SessionStatus,
    /// Original duration at start (seconds)
    pub planned_seconds: u32,
    /// Optional session intention ("What are you focusing on?")
    pub intention: Option<String>,
    /// Unix timestamp when session started
    pub started_at: i64,
    /// Unix timestamp when session ended (set on complete/cancel)
    pub ended_at: Option<i64>,
    /// In-memory events for computing stats
    pub events: Vec<SessionEvent>,
}

impl Session {
    pub fn new(
        id: i64,
        session_type: SessionType,
        planned_seconds: u32,
        intention: Option<String>,
        started_at: i64,
    ) -> Self {
        return Self {
            id,
            session_type,
            status: SessionStatus::Active,
            planned_seconds,
            intention,
            started_at,
            ended_at: None,
            events: vec![SessionEvent::Started {
                timestamp: started_at,
            }],
        };
    }

    /// Construct from database fields.
    pub fn from_db(
        id: i64,
        session_type: &str,
        status: &str,
        planned_seconds: u32,
        intention: Option<String>,
        started_at: i64,
        ended_at: Option<i64>,
        events: Vec<SessionEvent>,
    ) -> Option<Self> {
        return Some(Self {
            id,
            session_type: SessionType::from_str(session_type)?,
            status: SessionStatus::from_str(status)?,
            planned_seconds,
            intention,
            started_at,
            ended_at,
            events,
        });
    }

    pub fn add_event(&mut self, event: SessionEvent) {
        self.events.push(event);
    }

    /// Compute total paused time in seconds.
    pub fn compute_paused_seconds(&self, current_time: i64) -> u32 {
        let mut total_paused_ms: i64 = 0;
        let mut pause_start: Option<i64> = None;

        for event in &self.events {
            match event {
                SessionEvent::Paused { timestamp } => {
                    pause_start = Some(*timestamp);
                }
                SessionEvent::Resumed { timestamp } => {
                    if let Some(start) = pause_start {
                        total_paused_ms += timestamp - start;
                        pause_start = None;
                    }
                }
                SessionEvent::Completed { timestamp } | SessionEvent::Cancelled { timestamp } => {
                    // Session ended while paused - count remaining pause time
                    if let Some(start) = pause_start {
                        total_paused_ms += timestamp - start;
                        pause_start = None;
                    }
                }
                _ => {}
            }
        }

        // Currently paused (no end event yet)
        if let Some(start) = pause_start {
            total_paused_ms += current_time - start;
        }

        return (total_paused_ms / 1000).max(0) as u32;
    }

    /// Compute total extended time in seconds.
    pub fn compute_extended_seconds(&self) -> u32 {
        let mut total: u32 = 0;
        for event in &self.events {
            if let SessionEvent::Extended { seconds, .. } = event {
                total += seconds;
            }
        }
        return total;
    }

    /// Compute actual focused time (excludes pauses).
    pub fn compute_actual_seconds(&self, current_time: i64) -> u32 {
        let end_time = self.ended_at.unwrap_or(current_time);
        let total_elapsed_ms = (end_time - self.started_at).max(0);
        let total_elapsed_sec = (total_elapsed_ms / 1000) as u32;
        let paused = self.compute_paused_seconds(current_time);
        return total_elapsed_sec.saturating_sub(paused);
    }

    /// Compute overtime (actual time beyond planned + extensions).
    pub fn compute_overtime_seconds(&self, current_time: i64) -> u32 {
        let actual = self.compute_actual_seconds(current_time);
        let planned_total = self.planned_seconds + self.compute_extended_seconds();
        return actual.saturating_sub(planned_total);
    }

    /// Compute all stats at once.
    pub fn compute_stats(&self, current_time: i64) -> SessionStats {
        return SessionStats {
            actual_seconds: self.compute_actual_seconds(current_time),
            paused_seconds: self.compute_paused_seconds(current_time),
            extended_seconds: self.compute_extended_seconds(),
            overtime_seconds: self.compute_overtime_seconds(current_time),
        };
    }
}

/// Computed stats for a session.
#[derive(Debug, Clone)]
pub struct SessionStats {
    pub actual_seconds: u32,
    pub paused_seconds: u32,
    pub extended_seconds: u32,
    pub overtime_seconds: u32,
}

/// Flavor of a session (mode:phase). Sessions are universal timed blocks;
/// this describes what kind of block it was.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionType {
    PomodoroWork,
    PomodoroShortBreak,
    PomodoroLongBreak,
    Countdown,
    // Future: ProgressivePomodoroWork, ProgressivePomodoroShortBreak, ProgressivePomodoroLongBreak,
}

impl SessionType {
    pub fn as_str(&self) -> &'static str {
        return match self {
            SessionType::PomodoroWork => "pomodoro:work",
            SessionType::PomodoroShortBreak => "pomodoro:short_break",
            SessionType::PomodoroLongBreak => "pomodoro:long_break",
            SessionType::Countdown => "countdown",
        };
    }

    pub fn from_str(s: &str) -> Option<Self> {
        return match s {
            "pomodoro:work" => Some(SessionType::PomodoroWork),
            "pomodoro:short_break" => Some(SessionType::PomodoroShortBreak),
            "pomodoro:long_break" => Some(SessionType::PomodoroLongBreak),
            "countdown" => Some(SessionType::Countdown),
            _ => None,
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum SessionStatus {
    Active,
    Completed,
    Cancelled,
}

impl SessionStatus {
    pub fn from_str(s: &str) -> Option<Self> {
        return match s {
            "active" => Some(SessionStatus::Active),
            "completed" => Some(SessionStatus::Completed),
            "cancelled" => Some(SessionStatus::Cancelled),
            _ => None,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SessionEvent {
    Started { timestamp: i64 },
    Paused { timestamp: i64 },
    Resumed { timestamp: i64 },
    Extended { timestamp: i64, seconds: u32 },
    OvertimeStarted { timestamp: i64 },
    Completed { timestamp: i64 },
    Cancelled { timestamp: i64 },
}

impl SessionEvent {
    /// Parse from database fields.
    pub fn from_db(event_type: &str, timestamp: i64, content: Option<&str>) -> Option<Self> {
        return match event_type {
            "started" => Some(SessionEvent::Started { timestamp }),
            "paused" => Some(SessionEvent::Paused { timestamp }),
            "resumed" => Some(SessionEvent::Resumed { timestamp }),
            "extended" => {
                let seconds = content
                    .and_then(|json| serde_json::from_str::<serde_json::Value>(json).ok())
                    .and_then(|v| v.get("seconds").and_then(|s| s.as_u64()))
                    .unwrap_or(0) as u32;
                Some(SessionEvent::Extended { timestamp, seconds })
            }
            "overtime_started" => Some(SessionEvent::OvertimeStarted { timestamp }),
            "completed" => Some(SessionEvent::Completed { timestamp }),
            "cancelled" => Some(SessionEvent::Cancelled { timestamp }),
            _ => None,
        };
    }

    pub fn event_type(&self) -> &'static str {
        return match self {
            SessionEvent::Started { .. } => "started",
            SessionEvent::Paused { .. } => "paused",
            SessionEvent::Resumed { .. } => "resumed",
            SessionEvent::Extended { .. } => "extended",
            SessionEvent::OvertimeStarted { .. } => "overtime_started",
            SessionEvent::Completed { .. } => "completed",
            SessionEvent::Cancelled { .. } => "cancelled",
        };
    }

    pub fn timestamp(&self) -> i64 {
        return match self {
            SessionEvent::Started { timestamp }
            | SessionEvent::Paused { timestamp }
            | SessionEvent::Resumed { timestamp }
            | SessionEvent::Extended { timestamp, .. }
            | SessionEvent::OvertimeStarted { timestamp }
            | SessionEvent::Completed { timestamp }
            | SessionEvent::Cancelled { timestamp } => *timestamp,
        };
    }

    /// JSON content for DB storage (only for events with extra data).
    pub fn content(&self) -> Option<String> {
        return match self {
            SessionEvent::Extended { seconds, .. } => Some(format!(r#"{{"seconds":{}}}"#, seconds)),
            _ => None,
        };
    }
}

// MARK: - Tests

#[cfg(test)]
mod tests {
    use super::*;

    const START_MS: i64 = 1_000_000; // 1 second

    fn make_session() -> Session {
        return Session::new(1, SessionType::PomodoroWork, 1500, None, START_MS);
    }

    #[test]
    fn test_compute_paused_seconds_no_pauses() {
        let session = make_session();
        // 500 seconds later
        assert_eq!(session.compute_paused_seconds(START_MS + 500_000), 0);
    }

    #[test]
    fn test_compute_paused_seconds_single_pause() {
        let mut session = make_session();
        // Pause at +100s, resume at +200s = 100s paused
        session.add_event(SessionEvent::Paused {
            timestamp: START_MS + 100_000,
        });
        session.add_event(SessionEvent::Resumed {
            timestamp: START_MS + 200_000,
        });
        assert_eq!(session.compute_paused_seconds(START_MS + 500_000), 100);
    }

    #[test]
    fn test_compute_paused_seconds_multiple_pauses() {
        let mut session = make_session();
        // Pause at +100s, resume at +150s = 50s paused
        // Pause at +200s, resume at +300s = 100s paused
        // Total = 150s
        session.add_event(SessionEvent::Paused {
            timestamp: START_MS + 100_000,
        });
        session.add_event(SessionEvent::Resumed {
            timestamp: START_MS + 150_000,
        });
        session.add_event(SessionEvent::Paused {
            timestamp: START_MS + 200_000,
        });
        session.add_event(SessionEvent::Resumed {
            timestamp: START_MS + 300_000,
        });
        assert_eq!(session.compute_paused_seconds(START_MS + 500_000), 150);
    }

    #[test]
    fn test_compute_paused_seconds_currently_paused() {
        let mut session = make_session();
        // Pause at +100s, still paused at +500s = 400s paused
        session.add_event(SessionEvent::Paused {
            timestamp: START_MS + 100_000,
        });
        assert_eq!(session.compute_paused_seconds(START_MS + 500_000), 400);
    }

    #[test]
    fn test_compute_extended_seconds() {
        let mut session = make_session();
        session.add_event(SessionEvent::Extended {
            timestamp: START_MS + 100_000,
            seconds: 300,
        });
        session.add_event(SessionEvent::Extended {
            timestamp: START_MS + 200_000,
            seconds: 600,
        });
        assert_eq!(session.compute_extended_seconds(), 900);
    }

    #[test]
    fn test_compute_actual_seconds() {
        let mut session = make_session();
        // Pause at +100s, resume at +200s = 100s paused
        // Current time at +500s = 500s elapsed - 100s paused = 400s actual
        session.add_event(SessionEvent::Paused {
            timestamp: START_MS + 100_000,
        });
        session.add_event(SessionEvent::Resumed {
            timestamp: START_MS + 200_000,
        });
        assert_eq!(session.compute_actual_seconds(START_MS + 500_000), 400);
    }

    #[test]
    fn test_compute_overtime_seconds() {
        // Session: planned 1500s, started at START_MS
        let mut session = make_session();
        // Work until +3000s (3000s elapsed, no pauses = 3000 actual)
        // Overtime = 3000 - 1500 = 1500
        assert_eq!(session.compute_overtime_seconds(START_MS + 3_000_000), 1500);

        // With extension of 500s: Overtime = 3000 - 2000 = 1000
        session.add_event(SessionEvent::Extended {
            timestamp: START_MS + 1_000_000,
            seconds: 500,
        });
        assert_eq!(session.compute_overtime_seconds(START_MS + 3_000_000), 1000);
    }

    #[test]
    fn test_compute_stats() {
        let mut session = make_session();
        // Pause at +100s, resume at +200s = 100s paused
        session.add_event(SessionEvent::Paused {
            timestamp: START_MS + 100_000,
        });
        session.add_event(SessionEvent::Resumed {
            timestamp: START_MS + 200_000,
        });
        session.add_event(SessionEvent::Extended {
            timestamp: START_MS + 300_000,
            seconds: 300,
        });

        // At +1500s: Elapsed 1500s, Paused 100s, Actual 1400s
        // Planned 1500 + Extended 300 = 1800, Overtime = 0
        let stats = session.compute_stats(START_MS + 1_500_000);
        assert_eq!(stats.actual_seconds, 1400);
        assert_eq!(stats.paused_seconds, 100);
        assert_eq!(stats.extended_seconds, 300);
        assert_eq!(stats.overtime_seconds, 0);
    }
}
