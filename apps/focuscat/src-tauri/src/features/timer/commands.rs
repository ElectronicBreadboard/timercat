use super::runner::TimerRunner;
use super::timer::TimerStatus;
use super::types::{TimerDto, TimerState, TimerUpdatedEvent};
use crate::environment::db::DatabaseState;
use crate::features::session::repository::SessionRepository;
use crate::features::session::session::{SessionEvent, SessionStatus, SessionType};
use crate::features::session::types::{
    SessionChangedEvent, SessionCompletedEvent, SessionSummaryDto,
};
use crate::features::settings::types::AppSettingsState;
use chrono::Utc;
use std::sync::Mutex;
use tauri::{AppHandle, State};
use tauri_specta::Event;

#[cfg(target_os = "macos")]
use crate::app::tray::TrayState;

#[tauri::command]
#[specta::specta]
pub fn get_timer(state: State<'_, TimerState>) -> TimerDto {
    return TimerDto::from(&*state.lock().unwrap());
}

#[tauri::command]
#[specta::specta]
pub async fn start_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    app_settings: State<'_, AppSettingsState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
    db: State<'_, DatabaseState>,
    intention: Option<String>,
    profile_ids: Option<Vec<i32>>,
) -> Result<(), String> {
    let now = Utc::now().timestamp_millis();

    // Normalize empty intention to None
    let intention = intention.filter(|s| !s.trim().is_empty());

    // Extract data
    let (session_type, planned_seconds, settings) = {
        let timer = state.lock().unwrap();
        if timer.status != TimerStatus::Idle {
            return Err("Timer is not idle".to_string());
        }
        let settings = app_settings.lock().unwrap();
        let (session_type, planned_seconds) = timer.first_session();
        (session_type, planned_seconds, (*settings).clone())
    };

    // DB operation
    let session = SessionRepository::create(
        &db.pool,
        session_type,
        planned_seconds,
        intention.as_deref(),
        now,
    )
    .await
    .map_err(db_err)?;

    // Link profiles if provided
    if let Some(ids) = &profile_ids {
        if !ids.is_empty() {
            SessionRepository::link_profiles(&db.pool, session.id, ids)
                .await
                .map_err(db_err)?;
        }
    }

    // Update state
    let timer = {
        let mut timer = state.lock().unwrap();
        timer.session = Some(session);
        timer.status = TimerStatus::Running;
        timer.speed = settings.debug.timer_speed;
        timer.clone()
    };

    let _ = TimerUpdatedEvent(TimerDto::from(&timer)).emit(&app);

    #[cfg(target_os = "macos")]
    TrayState::set_timer(&app, Some(timer.remaining_seconds));

    let _ = SessionChangedEvent.emit(&app);
    start_runner(&app, &runner);
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn pause_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let now = Utc::now().timestamp_millis();

    // Extract data
    let session_id = {
        let timer = state.lock().unwrap();
        if timer.status != TimerStatus::Running {
            return Err("Timer is not running".to_string());
        }
        timer.active_session_id()
    };

    // DB operation
    let event = SessionEvent::Paused { timestamp: now };
    if let Some(id) = session_id {
        SessionRepository::insert_event(&db.pool, id, &event)
            .await
            .map_err(db_err)?;
    }

    // Update state
    let timer = {
        let mut timer = state.lock().unwrap();
        if let Some(session) = &mut timer.session {
            session.add_event(event);
        }
        timer.status = TimerStatus::Paused;
        timer.clone()
    };

    let _ = TimerUpdatedEvent(TimerDto::from(&timer)).emit(&app);
    stop_runner(&runner);
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn resume_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let now = Utc::now().timestamp_millis();

    // Extract data
    let session_id = {
        let timer = state.lock().unwrap();
        if timer.status != TimerStatus::Paused {
            return Err("Timer is not paused".to_string());
        }
        timer.active_session_id()
    };

    // DB operation
    let event = SessionEvent::Resumed { timestamp: now };
    if let Some(id) = session_id {
        SessionRepository::insert_event(&db.pool, id, &event)
            .await
            .map_err(db_err)?;
    }

    // Update state
    let timer = {
        let mut timer = state.lock().unwrap();
        if let Some(session) = &mut timer.session {
            session.add_event(event);
        }
        timer.status = TimerStatus::Running;
        timer.clone()
    };

    let _ = TimerUpdatedEvent(TimerDto::from(&timer)).emit(&app);
    start_runner(&app, &runner);
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn reset_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    app_settings: State<'_, AppSettingsState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let now = Utc::now().timestamp_millis();

    // Extract data
    let (settings, session_data) = {
        let timer = state.lock().unwrap();
        let settings = app_settings.lock().unwrap();
        let session_data = timer
            .session
            .as_ref()
            .map(|s| (s.id, s.compute_actual_seconds(now)));
        ((*settings).clone(), session_data)
    };

    // Cancel session in DB
    if let Some((id, actual_seconds)) = session_data {
        SessionRepository::cancel(&db.pool, id, now, actual_seconds)
            .await
            .map_err(db_err)?;
    }

    let timer = {
        let mut timer = state.lock().unwrap();
        timer.reset_to_idle(&settings);
        timer.clone()
    };

    let _ = TimerUpdatedEvent(TimerDto::from(&timer)).emit(&app);

    #[cfg(target_os = "macos")]
    TrayState::set_timer(&app, None);

    let _ = SessionChangedEvent.emit(&app);
    stop_runner(&runner);
    return Ok(());
}

/// Finish the current session and reset timer.
/// Like reset, but marks session as completed instead of cancelled.
#[tauri::command]
#[specta::specta]
pub async fn finish_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    app_settings: State<'_, AppSettingsState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let now = Utc::now().timestamp_millis();

    // Extract data
    let (settings, session_data) = {
        let timer = state.lock().unwrap();
        let settings = app_settings.lock().unwrap();
        let session_data = timer.session.as_ref().map(|s| {
            (
                s.id,
                s.session_type.as_str().to_string(),
                s.planned_seconds,
                s.compute_actual_seconds(now),
                s.started_at,
            )
        });
        ((*settings).clone(), session_data)
    };

    // Complete session in DB
    if let Some(data) = session_data {
        complete_and_emit_session(&db.pool, &app, data, now).await?;
    }

    let timer = {
        let mut timer = state.lock().unwrap();
        timer.reset_to_idle(&settings);
        timer.clone()
    };

    let _ = TimerUpdatedEvent(TimerDto::from(&timer)).emit(&app);

    #[cfg(target_os = "macos")]
    TrayState::set_timer(&app, None);

    let _ = SessionChangedEvent.emit(&app);
    stop_runner(&runner);
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn skip_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    _app_settings: State<'_, AppSettingsState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let now = Utc::now().timestamp_millis();

    // Extract data (need timer clone to call next_session / first_session)
    let (timer_clone, session_data) = {
        let timer = state.lock().unwrap();
        let session_data = timer.session.as_ref().map(|s| {
            (
                s.id,
                s.session_type.as_str().to_string(),
                s.planned_seconds,
                s.compute_actual_seconds(now),
                s.started_at,
            )
        });
        (timer.clone(), session_data)
    };
    if timer_clone.session.is_none() {
        return Err("No active session".to_string());
    }
    let current_session_type = timer_clone.session.as_ref().unwrap().session_type;
    let sessions_completed = timer_clone.sessions_completed;
    let is_work = current_session_type == SessionType::PomodoroWork;

    // Complete current session
    if let Some(data) = session_data {
        complete_and_emit_session(&db.pool, &app, data, now).await?;
    }

    let (next_session_type, next_duration_seconds) = timer_clone
        .next_session(current_session_type, sessions_completed)
        .unwrap_or_else(|| timer_clone.first_session());

    let new_session = SessionRepository::create(
        &db.pool,
        next_session_type,
        next_duration_seconds,
        None,
        now,
    )
    .await
    .map_err(db_err)?;

    let timer = {
        let mut timer = state.lock().unwrap();
        timer.skip_to_next_session(new_session, next_duration_seconds, is_work, now);
        timer.clone()
    };

    let _ = TimerUpdatedEvent(TimerDto::from(&timer)).emit(&app);

    #[cfg(target_os = "macos")]
    TrayState::set_timer(&app, Some(timer.remaining_seconds));

    let _ = SessionChangedEvent.emit(&app);
    restart_runner(&app, &runner);
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn set_timer_duration(
    app: AppHandle,
    state: State<'_, TimerState>,
    db: State<'_, DatabaseState>,
    minutes: u32,
) -> Result<(), String> {
    let now = Utc::now().timestamp_millis();
    let new_seconds = minutes * 60;

    // Extract data
    let (is_idle, session_id, old_seconds) = {
        let timer = state.lock().unwrap();
        (
            timer.status == TimerStatus::Idle,
            timer.active_session_id(),
            timer.total_seconds,
        )
    };

    // Calculate delta (how much time was added/removed)
    let delta_seconds = new_seconds as i64 - old_seconds as i64;

    // DB operation (only if active and time was added)
    if !is_idle && delta_seconds > 0 {
        let event = SessionEvent::Extended {
            timestamp: now,
            seconds: delta_seconds as u32,
        };
        if let Some(id) = session_id {
            SessionRepository::insert_event(&db.pool, id, &event)
                .await
                .map_err(db_err)?;
        }

        // Update session state
        let mut timer = state.lock().unwrap();
        if let Some(session) = &mut timer.session {
            session.add_event(event);
        }
    }

    // Update timer state
    let timer = {
        let mut timer = state.lock().unwrap();
        timer.total_seconds = new_seconds;
        timer.remaining_seconds = new_seconds;
        timer.overtime_seconds = 0;
        timer.clone()
    };

    let _ = TimerUpdatedEvent(TimerDto::from(&timer)).emit(&app);

    #[cfg(target_os = "macos")]
    if timer.status != TimerStatus::Idle {
        TrayState::set_timer(&app, Some(timer.remaining_seconds));
    }

    return Ok(());
}

// MARK: - Helpers

/// Complete session in DB and emit SessionCompletedEvent.
async fn complete_and_emit_session(
    db: &sqlx::SqlitePool,
    app: &AppHandle,
    session_data: (i64, String, u32, u32, i64),
    now: i64,
) -> Result<(), String> {
    let (id, session_type, planned, actual, started_at) = session_data;
    SessionRepository::complete(db, id, now, actual)
        .await
        .map_err(db_err)?;

    let _ = SessionCompletedEvent(SessionSummaryDto {
        id: id as i32,
        session_type,
        status: SessionStatus::Completed,
        planned_seconds: planned,
        actual_seconds: Some(actual),
        intention: None,
        started_at: started_at as f64,
        ended_at: Some(now as f64),
    })
    .emit(app);

    return Ok(());
}

fn db_err(e: sqlx::Error) -> String {
    return format!("Database error: {}", e);
}

fn start_runner(app: &AppHandle, runner: &State<'_, Mutex<Option<TimerRunner>>>) {
    let mut guard = runner.lock().unwrap();
    if guard.is_some() {
        guard.as_ref().unwrap().stop();
    }
    *guard = Some(TimerRunner::start(app.clone()));
}

fn stop_runner(runner: &State<'_, Mutex<Option<TimerRunner>>>) {
    let mut guard = runner.lock().unwrap();
    if let Some(r) = guard.take() {
        r.stop();
    }
}

fn restart_runner(app: &AppHandle, runner: &State<'_, Mutex<Option<TimerRunner>>>) {
    let mut guard = runner.lock().unwrap();
    if let Some(r) = guard.take() {
        r.stop();
    }
    *guard = Some(TimerRunner::start(app.clone()));
}
