use serde::{Deserialize, Serialize};

/// A timer session (work or break period).
#[derive(Debug, Clone)]
pub struct Session {
    pub id: i64,
    pub phase: Phase,
    pub status: SessionStatus,
    /// Original duration at start (seconds)
    pub planned_seconds: u32,
    /// Unix timestamp when session started
    pub started_at: i64,
    /// Unix timestamp when session ended (set on complete/cancel)
    pub ended_at: Option<i64>,
    /// In-memory events for computing stats
    pub events: Vec<SessionEvent>,
}

impl Session {
    pub fn new(id: i64, phase: Phase, planned_seconds: u32, started_at: i64) -> Self {
        return Self {
            id,
            phase,
            status: SessionStatus::Active,
            planned_seconds,
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
        phase: &str,
        status: &str,
        planned_seconds: u32,
        started_at: i64,
        ended_at: Option<i64>,
        events: Vec<SessionEvent>,
    ) -> Option<Self> {
        return Some(Self {
            id,
            phase: Phase::from_str(phase)?,
            status: SessionStatus::from_str(status)?,
            planned_seconds,
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
        let mut total_paused: i64 = 0;
        let mut pause_start: Option<i64> = None;

        for event in &self.events {
            match event {
                SessionEvent::Paused { timestamp } => {
                    pause_start = Some(*timestamp);
                }
                SessionEvent::Resumed { timestamp } => {
                    if let Some(start) = pause_start {
                        total_paused += timestamp - start;
                        pause_start = None;
                    }
                }
                SessionEvent::Completed { timestamp } | SessionEvent::Cancelled { timestamp } => {
                    // Session ended while paused - count remaining pause time
                    if let Some(start) = pause_start {
                        total_paused += timestamp - start;
                        pause_start = None;
                    }
                }
                _ => {}
            }
        }

        // Currently paused (no end event yet)
        if let Some(start) = pause_start {
            total_paused += current_time - start;
        }

        return total_paused.max(0) as u32;
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
        let total_elapsed = (end_time - self.started_at).max(0) as u32;
        let paused = self.compute_paused_seconds(current_time);
        return total_elapsed.saturating_sub(paused);
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum Phase {
    Work,
    ShortBreak,
    LongBreak,
}

impl Phase {
    pub fn as_str(&self) -> &'static str {
        return match self {
            Phase::Work => "work",
            Phase::ShortBreak => "short_break",
            Phase::LongBreak => "long_break",
        };
    }

    pub fn from_str(s: &str) -> Option<Self> {
        return match s {
            "work" => Some(Phase::Work),
            "short_break" => Some(Phase::ShortBreak),
            "long_break" => Some(Phase::LongBreak),
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

    fn make_session() -> Session {
        return Session::new(1, Phase::Work, 1500, 1000);
    }

    #[test]
    fn test_compute_paused_seconds_no_pauses() {
        let session = make_session();
        assert_eq!(session.compute_paused_seconds(1500), 0);
    }

    #[test]
    fn test_compute_paused_seconds_single_pause() {
        let mut session = make_session();
        session.add_event(SessionEvent::Paused { timestamp: 1100 });
        session.add_event(SessionEvent::Resumed { timestamp: 1200 });
        assert_eq!(session.compute_paused_seconds(1500), 100);
    }

    #[test]
    fn test_compute_paused_seconds_multiple_pauses() {
        let mut session = make_session();
        session.add_event(SessionEvent::Paused { timestamp: 1100 });
        session.add_event(SessionEvent::Resumed { timestamp: 1150 });
        session.add_event(SessionEvent::Paused { timestamp: 1200 });
        session.add_event(SessionEvent::Resumed { timestamp: 1300 });
        assert_eq!(session.compute_paused_seconds(1500), 150);
    }

    #[test]
    fn test_compute_paused_seconds_currently_paused() {
        let mut session = make_session();
        session.add_event(SessionEvent::Paused { timestamp: 1100 });
        assert_eq!(session.compute_paused_seconds(1500), 400);
    }

    #[test]
    fn test_compute_extended_seconds() {
        let mut session = make_session();
        session.add_event(SessionEvent::Extended {
            timestamp: 1100,
            seconds: 300,
        });
        session.add_event(SessionEvent::Extended {
            timestamp: 1200,
            seconds: 600,
        });
        assert_eq!(session.compute_extended_seconds(), 900);
    }

    #[test]
    fn test_compute_actual_seconds() {
        let mut session = make_session();
        session.add_event(SessionEvent::Paused { timestamp: 1100 });
        session.add_event(SessionEvent::Resumed { timestamp: 1200 });
        // Elapsed: 500, Paused: 100, Actual: 400
        assert_eq!(session.compute_actual_seconds(1500), 400);
    }

    #[test]
    fn test_compute_overtime_seconds() {
        // Session: planned 1500s, started at 1000
        let mut session = make_session();
        // Work until 4000 (3000s elapsed, no pauses = 3000 actual)
        // Overtime = 3000 - 1500 = 1500
        assert_eq!(session.compute_overtime_seconds(4000), 1500);

        // With extension of 500s: Overtime = 3000 - 2000 = 1000
        session.add_event(SessionEvent::Extended {
            timestamp: 2000,
            seconds: 500,
        });
        assert_eq!(session.compute_overtime_seconds(4000), 1000);
    }

    #[test]
    fn test_compute_stats() {
        let mut session = make_session();
        session.add_event(SessionEvent::Paused { timestamp: 1100 });
        session.add_event(SessionEvent::Resumed { timestamp: 1200 });
        session.add_event(SessionEvent::Extended {
            timestamp: 1300,
            seconds: 300,
        });

        // At time 2500: Elapsed 1500, Paused 100, Actual 1400
        // Planned 1500 + Extended 300 = 1800, Overtime = 0
        let stats = session.compute_stats(2500);
        assert_eq!(stats.actual_seconds, 1400);
        assert_eq!(stats.paused_seconds, 100);
        assert_eq!(stats.extended_seconds, 300);
        assert_eq!(stats.overtime_seconds, 0);
    }
}
