use super::session::{Phase, Session, SessionEvent};
use chrono::{Local, TimeZone};
use sqlx::{Row, SqlitePool};

pub struct SessionRepository;

impl SessionRepository {
    /// Create a new session in the database.
    /// Returns the session with its DB id.
    pub async fn create(
        pool: &SqlitePool,
        phase: Phase,
        planned_seconds: u32,
        goal: Option<&str>,
        started_at: i64,
    ) -> Result<Session, sqlx::Error> {
        let result = sqlx::query(
            r#"
            INSERT INTO sessions (phase, status, planned_seconds, goal, started_at)
            VALUES (?, 'active', ?, ?, ?)
            RETURNING id
            "#,
        )
        .bind(phase.as_str())
        .bind(planned_seconds as i64)
        .bind(goal)
        .bind(started_at)
        .fetch_one(pool)
        .await?;

        let id: i64 = result.get("id");

        // Insert the 'started' event
        Self::insert_event(
            pool,
            id,
            &SessionEvent::Started {
                timestamp: started_at,
            },
        )
        .await?;

        return Ok(Session::new(
            id,
            phase,
            planned_seconds,
            goal.map(|s| s.to_string()),
            started_at,
        ));
    }

    /// Link focus profiles to a session.
    pub async fn link_profiles(
        pool: &SqlitePool,
        session_id: i64,
        profile_ids: &[i32],
    ) -> Result<(), sqlx::Error> {
        for (i, profile_id) in profile_ids.iter().enumerate() {
            sqlx::query(
                r#"
                INSERT INTO session_focus_profile (session_id, focus_profile_id, priority)
                VALUES (?, ?, ?)
                "#,
            )
            .bind(session_id)
            .bind(*profile_id as i64)
            .bind(i as i64)
            .execute(pool)
            .await?;
        }

        return Ok(());
    }

    /// Insert a session event.
    pub async fn insert_event(
        pool: &SqlitePool,
        session_id: i64,
        event: &SessionEvent,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO session_events (session_id, event_type, timestamp, content)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(session_id)
        .bind(event.event_type())
        .bind(event.timestamp())
        .bind(event.content())
        .execute(pool)
        .await?;

        return Ok(());
    }

    /// Complete a session (mark as completed with actual_seconds).
    pub async fn complete(
        pool: &SqlitePool,
        session_id: i64,
        ended_at: i64,
        actual_seconds: u32,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE sessions
            SET status = 'completed', ended_at = ?, actual_seconds = ?
            WHERE id = ?
            "#,
        )
        .bind(ended_at)
        .bind(actual_seconds as i64)
        .bind(session_id)
        .execute(pool)
        .await?;

        // Insert the 'completed' event
        Self::insert_event(
            pool,
            session_id,
            &SessionEvent::Completed {
                timestamp: ended_at,
            },
        )
        .await?;

        return Ok(());
    }

    /// Cancel a session.
    pub async fn cancel(
        pool: &SqlitePool,
        session_id: i64,
        ended_at: i64,
        actual_seconds: u32,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE sessions
            SET status = 'cancelled', ended_at = ?, actual_seconds = ?
            WHERE id = ?
            "#,
        )
        .bind(ended_at)
        .bind(actual_seconds as i64)
        .bind(session_id)
        .execute(pool)
        .await?;

        // Insert the 'cancelled' event
        Self::insert_event(
            pool,
            session_id,
            &SessionEvent::Cancelled {
                timestamp: ended_at,
            },
        )
        .await?;

        return Ok(());
    }

    /// Get total focus seconds for today (midnight-to-now).
    /// Includes actual_seconds from completed work sessions only.
    pub async fn get_today_focus_seconds(pool: &SqlitePool) -> Result<u32, sqlx::Error> {
        // Get today's midnight in local time as Unix timestamp
        let today = Local::now().date_naive();
        let midnight = Local
            .from_local_datetime(&today.and_hms_opt(0, 0, 0).unwrap())
            .unwrap();
        let today_start = midnight.timestamp_millis();

        let result: Option<i64> = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(actual_seconds), 0)
            FROM sessions
            WHERE phase = 'work'
              AND status = 'completed'
              AND started_at >= ?
            "#,
        )
        .bind(today_start)
        .fetch_one(pool)
        .await?;

        return Ok(result.unwrap_or(0) as u32);
    }

    /// Get sessions within a time range.
    pub async fn get_sessions(
        pool: &SqlitePool,
        input: &GetSessionsInput,
    ) -> Result<Vec<SessionRow>, sqlx::Error> {
        let limit = input.limit.unwrap_or(100);

        let results = sqlx::query_as::<_, SessionRow>(
            r#"
            SELECT id, phase, status, planned_seconds, actual_seconds, goal, started_at, ended_at
            FROM sessions
            WHERE started_at >= ? AND started_at < ?
              AND (? IS NULL OR actual_seconds IS NULL OR actual_seconds >= ?)
            ORDER BY started_at DESC
            LIMIT ?
            "#,
        )
        .bind(input.started_after)
        .bind(input.started_before)
        .bind(input.min_duration_secs)
        .bind(input.min_duration_secs)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        return Ok(results);
    }

    /// Get session by id.
    pub async fn get_by_id(pool: &SqlitePool, id: i64) -> Result<Option<SessionRow>, sqlx::Error> {
        let result = sqlx::query_as::<_, SessionRow>(
            r#"
            SELECT id, phase, status, planned_seconds, actual_seconds, goal, started_at, ended_at
            FROM sessions
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        return Ok(result);
    }

    /// Load session events for a session.
    pub async fn get_events(
        pool: &SqlitePool,
        session_id: i64,
    ) -> Result<Vec<SessionEventRow>, sqlx::Error> {
        let results = sqlx::query_as::<_, SessionEventRow>(
            r#"
            SELECT id, session_id, event_type, timestamp, content
            FROM session_events
            WHERE session_id = ?
            ORDER BY timestamp ASC
            "#,
        )
        .bind(session_id)
        .fetch_all(pool)
        .await?;

        return Ok(results);
    }

    /// Get the ID of the most recent completed work session.
    pub async fn get_last_work_session_id(
        pool: &SqlitePool,
        min_duration_secs: Option<i64>,
    ) -> Result<Option<i64>, sqlx::Error> {
        let id: Option<i64> = sqlx::query_scalar(
            r#"
            SELECT id
            FROM sessions
            WHERE phase = 'work'
              AND status = 'completed'
              AND (? IS NULL OR actual_seconds >= ?)
            ORDER BY started_at DESC
            LIMIT 1
            "#,
        )
        .bind(min_duration_secs)
        .bind(min_duration_secs)
        .fetch_optional(pool)
        .await?;

        return Ok(id);
    }

    /// Find and cancel all orphaned sessions (active sessions without ended_at).
    /// Sets ended_at to the last event timestamp, marking them as cancelled.
    /// Returns the number of sessions that were cleaned up.
    pub async fn cleanup_orphaned(pool: &SqlitePool) -> Result<u32, sqlx::Error> {
        // Find orphaned sessions with their last event timestamp
        let orphaned = sqlx::query_as::<_, OrphanedSessionRow>(
            r#"
            SELECT s.id, s.started_at, MAX(e.timestamp) as last_event_at
            FROM sessions s
            JOIN session_events e ON e.session_id = s.id
            WHERE s.status = 'active' AND s.ended_at IS NULL
            GROUP BY s.id
            "#,
        )
        .fetch_all(pool)
        .await?;

        let count = orphaned.len() as u32;

        for session in orphaned {
            let ended_at = session.last_event_at;
            let actual_seconds = ((ended_at - session.started_at) / 1000) as i64;

            // Update session to cancelled
            sqlx::query(
                r#"
                UPDATE sessions
                SET status = 'cancelled', ended_at = ?, actual_seconds = ?
                WHERE id = ?
                "#,
            )
            .bind(ended_at)
            .bind(actual_seconds)
            .bind(session.id)
            .execute(pool)
            .await?;

            // Insert cancelled event
            Self::insert_event(
                pool,
                session.id,
                &SessionEvent::Cancelled {
                    timestamp: ended_at,
                },
            )
            .await?;
        }

        return Ok(count);
    }
}

pub struct GetSessionsInput {
    pub started_after: i64,
    pub started_before: i64,
    pub limit: Option<i64>,
    pub min_duration_secs: Option<i64>,
}

#[derive(Debug, sqlx::FromRow)]
pub struct SessionRow {
    pub id: i64,
    pub phase: String,
    pub status: String,
    pub planned_seconds: i64,
    pub actual_seconds: Option<i64>,
    pub goal: Option<String>,
    pub started_at: i64,
    pub ended_at: Option<i64>,
}

#[derive(Debug, sqlx::FromRow)]
pub struct SessionEventRow {
    pub id: i64,
    pub session_id: i64,
    pub event_type: String,
    pub timestamp: i64,
    pub content: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct OrphanedSessionRow {
    pub id: i64,
    pub started_at: i64,
    pub last_event_at: i64,
}
