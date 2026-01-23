use super::repository::{GetSessionsInput, SessionRepository};
use super::session::{Phase, Session, SessionEvent, SessionStatus};
use super::types::{
    SessionDetailDto, SessionEventDataDto, SessionEventDto, SessionStatsDto, SessionSummaryDto,
};
use crate::environment::db::DatabaseState;
use chrono::Utc;
use tauri::State;

// MARK: - Commands

#[tauri::command]
#[specta::specta]
pub async fn get_today_focus_seconds(db: State<'_, DatabaseState>) -> Result<u32, String> {
    return SessionRepository::get_today_focus_seconds(&db.pool)
        .await
        .map_err(|e| e.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn get_sessions(
    db: State<'_, DatabaseState>,
    started_after: f64,
    started_before: f64,
    limit: Option<i32>,
    min_duration_secs: Option<i32>,
) -> Result<Vec<SessionSummaryDto>, String> {
    let input = GetSessionsInput {
        started_after: started_after as i64,
        started_before: started_before as i64,
        limit: limit.map(|l| l as i64),
        min_duration_secs: min_duration_secs.map(|s| s as i64),
    };

    let rows = SessionRepository::get_sessions(&db.pool, &input)
        .await
        .map_err(|e| e.to_string())?;

    let sessions = rows
        .into_iter()
        .filter_map(|row| {
            let phase = Phase::from_str(&row.phase)?;
            let status = SessionStatus::from_str(&row.status)?;
            Some(SessionSummaryDto {
                id: row.id as i32,
                phase,
                status,
                planned_seconds: row.planned_seconds as u32,
                actual_seconds: row.actual_seconds.map(|s| s as u32),
                started_at: row.started_at as f64,
                ended_at: row.ended_at.map(|t| t as f64),
            })
        })
        .collect();

    return Ok(sessions);
}

#[tauri::command]
#[specta::specta]
pub async fn get_session(
    db: State<'_, DatabaseState>,
    session_id: i32,
) -> Result<Option<SessionDetailDto>, String> {
    let now = Utc::now().timestamp_millis();
    let id = session_id as i64;

    // Get session row
    let session_row = SessionRepository::get_by_id(&db.pool, id)
        .await
        .map_err(|e| e.to_string())?;

    let Some(row) = session_row else {
        return Ok(None);
    };

    // Get and parse events
    let event_rows = SessionRepository::get_events(&db.pool, id)
        .await
        .map_err(|e| e.to_string())?;

    let events: Vec<SessionEvent> = event_rows
        .iter()
        .filter_map(|e| SessionEvent::from_db(&e.event_type, e.timestamp, e.content.as_deref()))
        .collect();

    // Build session with events
    let session = Session::from_db(
        row.id,
        &row.phase,
        &row.status,
        row.planned_seconds as u32,
        row.started_at,
        row.ended_at,
        events,
    )
    .ok_or("Invalid session data")?;

    // Map events to DTOs
    let event_dtos: Vec<SessionEventDto> = session
        .events
        .iter()
        .map(|e| {
            let data = if let SessionEvent::Extended { seconds, .. } = e {
                Some(SessionEventDataDto {
                    seconds: Some(*seconds),
                })
            } else {
                None
            };
            SessionEventDto {
                event_type: e.event_type().to_string(),
                timestamp: e.timestamp() as f64,
                data,
            }
        })
        .collect();

    return Ok(Some(SessionDetailDto {
        id: session.id as i32,
        phase: session.phase,
        status: session.status,
        planned_seconds: session.planned_seconds,
        actual_seconds: row.actual_seconds.map(|s| s as u32),
        started_at: session.started_at as f64,
        ended_at: session.ended_at.map(|t| t as f64),
        events: event_dtos,
        stats: SessionStatsDto {
            paused_seconds: session.compute_paused_seconds(now),
            extended_seconds: session.compute_extended_seconds(),
            overtime_seconds: session.compute_overtime_seconds(now),
        },
    }));
}

/// Get the most recent completed work session.
#[tauri::command]
#[specta::specta]
pub async fn get_last_work_session(
    db: State<'_, DatabaseState>,
    min_duration_secs: Option<i32>,
) -> Result<Option<SessionDetailDto>, String> {
    let Some(id) =
        SessionRepository::get_last_work_session_id(&db.pool, min_duration_secs.map(|s| s as i64))
            .await
            .map_err(|e| e.to_string())?
    else {
        return Ok(None);
    };

    return get_session(db, id as i32).await;
}
