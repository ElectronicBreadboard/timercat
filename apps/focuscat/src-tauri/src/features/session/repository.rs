use crate::features::timer::types::TimerPhase;
use chrono::{Local, TimeZone};
use sqlx::{Row, SqlitePool};

pub struct SessionRepository;

impl SessionRepository {
    /// Insert a completed session and its applied tags.
    pub async fn insert(pool: &SqlitePool, input: &InsertSessionInput) -> Result<i64, sqlx::Error> {
        let phase_str = match input.phase {
            TimerPhase::Work => "work",
            TimerPhase::ShortBreak => "short_break",
            TimerPhase::LongBreak => "long_break",
        };

        let result = sqlx::query(
            r#"
            INSERT INTO sessions (
                phase,
                started_at,
                ended_at,
                base_seconds,
                extended_seconds,
                overtime_seconds
            ) VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id
            "#,
        )
        .bind(phase_str)
        .bind(input.started_at)
        .bind(input.ended_at)
        .bind(input.base_seconds as i64)
        .bind(input.extended_seconds as i64)
        .bind(input.overtime_seconds as i64)
        .fetch_one(pool)
        .await?;

        let session_id: i64 = result.get("id");

        // Insert applied tags
        Self::insert_applied_tags(pool, session_id, &input.session_tag_ids).await?;

        return Ok(session_id);
    }

    /// Insert tags applied to a session.
    pub async fn insert_applied_tags(
        pool: &SqlitePool,
        session_id: i64,
        tag_ids: &[i32],
    ) -> Result<(), sqlx::Error> {
        for (position, tag_id) in tag_ids.iter().enumerate() {
            sqlx::query(
                r#"
                INSERT INTO session_applied_tags (session_id, session_tag_id, position)
                VALUES (?, ?, ?)
                "#,
            )
            .bind(session_id)
            .bind(tag_id)
            .bind(position as i64)
            .execute(pool)
            .await?;
        }

        return Ok(());
    }

    /// Get total focus seconds for today (midnight-to-now).
    /// Includes base, extended, and overtime seconds from work sessions only.
    pub async fn get_today_focus_seconds(pool: &SqlitePool) -> Result<u32, sqlx::Error> {
        // Get today's midnight in local time as Unix timestamp
        let today = Local::now().date_naive();
        let midnight = Local
            .from_local_datetime(&today.and_hms_opt(0, 0, 0).unwrap())
            .unwrap();
        let today_start = midnight.timestamp();

        let result: Option<i64> = sqlx::query_scalar(
            r#"
            SELECT COALESCE(SUM(base_seconds + extended_seconds + overtime_seconds), 0)
            FROM sessions
            WHERE phase = 'work' AND started_at >= ?
            "#,
        )
        .bind(today_start)
        .fetch_one(pool)
        .await?;

        return Ok(result.unwrap_or(0) as u32);
    }
}

pub struct InsertSessionInput {
    pub phase: TimerPhase,
    pub started_at: i64,
    pub ended_at: i64,
    pub base_seconds: u32,
    pub extended_seconds: u32,
    pub overtime_seconds: u32,
    pub session_tag_ids: Vec<i32>,
}
