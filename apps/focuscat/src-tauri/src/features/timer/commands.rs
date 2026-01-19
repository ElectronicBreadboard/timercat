use super::runner::TimerRunner;
use super::timer::{Timer, TimerConfig, TimerStatus, WorkSessionStats};
use super::types::{TimerState, TimerUpdatedEvent};
use crate::environment::db::DatabaseState;
use crate::features::session::repository::SessionRepository;
use crate::features::session::session::{Phase, SessionEvent, SessionStatus};
use crate::features::settings::types::AppSettingsState;
use chrono::Utc;
use std::sync::Mutex;
use tauri::{AppHandle, State};
use tauri_specta::Event;

#[cfg(target_os = "macos")]
use crate::app::tray::TrayState;

// MARK: - Commands

#[tauri::command]
#[specta::specta]
pub fn get_timer(state: State<'_, TimerState>) -> Timer {
    return state.lock().unwrap().clone();
}

#[tauri::command]
#[specta::specta]
pub async fn start_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    app_settings: State<'_, AppSettingsState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let now = Utc::now().timestamp();

    // Extract data
    let (phase, planned_seconds, config) = {
        let timer = state.lock().unwrap();
        if timer.status != TimerStatus::Idle {
            return Err("Timer is not idle".to_string());
        }
        let settings = app_settings.lock().unwrap();
        (timer.phase, timer.total_seconds, TimerConfig::from(&*settings))
    };

    // DB operation
    let session = SessionRepository::create(&db.pool, phase, planned_seconds, now)
        .await
        .map_err(db_err)?;

    // Update state
    let timer = {
        let mut timer = state.lock().unwrap();
        timer.session = Some(session);
        timer.status = TimerStatus::Running;
        timer.speed = config.speed;
        timer.clone()
    };

    let _ = TimerUpdatedEvent(timer.clone()).emit(&app);

    #[cfg(target_os = "macos")]
    TrayState::set_timer(&app, Some(timer.remaining_seconds));

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
    let now = Utc::now().timestamp();

    // Extract data
    let session_id = {
        let timer = state.lock().unwrap();
        if timer.status != TimerStatus::Running {
            return Err("Timer is not running".to_string());
        }
        timer.session_id()
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

    let _ = TimerUpdatedEvent(timer).emit(&app);
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
    let now = Utc::now().timestamp();

    // Extract data
    let session_id = {
        let timer = state.lock().unwrap();
        if timer.status != TimerStatus::Paused {
            return Err("Timer is not paused".to_string());
        }
        timer.session_id()
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

    let _ = TimerUpdatedEvent(timer).emit(&app);
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
    let now = Utc::now().timestamp();

    // Extract data
    let (config, session_data) = {
        let timer = state.lock().unwrap();
        let settings = app_settings.lock().unwrap();
        let config = TimerConfig::from(&*settings);
        let session_data = timer.session.as_ref().map(|s| {
            (s.id, s.compute_actual_seconds(now))
        });
        (config, session_data)
    };

    // DB operation
    if let Some((id, actual_seconds)) = session_data {
        SessionRepository::cancel(&db.pool, id, now, actual_seconds)
            .await
            .map_err(db_err)?;
    }

    // Update state
    let timer = {
        let mut timer = state.lock().unwrap();
        timer.session = None;
        timer.status = TimerStatus::Idle;
        timer.phase = Phase::Work;
        timer.total_seconds = config.work_duration;
        timer.remaining_seconds = config.work_duration;
        timer.overtime_seconds = 0;
        timer.sessions_completed = 0;
        timer.clone()
    };

    let _ = TimerUpdatedEvent(timer).emit(&app);

    #[cfg(target_os = "macos")]
    TrayState::set_timer(&app, None);

    stop_runner(&runner);
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn skip_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    app_settings: State<'_, AppSettingsState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let now = Utc::now().timestamp();

    // Extract data
    let (config, is_work_phase, session_data, sessions_completed) = {
        let timer = state.lock().unwrap();
        let settings = app_settings.lock().unwrap();
        let config = TimerConfig::from(&*settings);
        let is_work_phase = timer.phase == Phase::Work;
        let session_data = timer.session.as_ref().map(|s| {
            (s.id, s.planned_seconds, s.compute_actual_seconds(now), s.compute_extended_seconds())
        });
        (config, is_work_phase, session_data, timer.sessions_completed)
    };

    // Complete current session
    let work_stats = if let Some((id, planned, actual, extended)) = session_data {
        SessionRepository::complete(&db.pool, id, now, actual)
            .await
            .map_err(db_err)?;

        if is_work_phase {
            // Overtime = time worked beyond planned (base + extensions)
            let planned_total = planned + extended;
            let overtime = actual.saturating_sub(planned_total);
            Some(WorkSessionStats {
                base_seconds: planned,
                extended_seconds: extended,
                overtime_seconds: overtime,
                completed_seconds: actual,
            })
        } else {
            None
        }
    } else {
        None
    };

    // Determine next phase
    let new_sessions_completed = if is_work_phase { sessions_completed + 1 } else { sessions_completed };
    let next_phase = if is_work_phase {
        if new_sessions_completed % config.sessions_before_long_break == 0 {
            Phase::LongBreak
        } else {
            Phase::ShortBreak
        }
    } else {
        Phase::Work
    };
    let next_duration = Timer::get_duration_for_phase(next_phase, &config);

    // Create next session
    let new_session = SessionRepository::create(&db.pool, next_phase, next_duration, now)
        .await
        .map_err(db_err)?;

    // Update state
    let timer = {
        let mut timer = state.lock().unwrap();

        // Update completed session
        if let Some(session) = &mut timer.session {
            session.status = SessionStatus::Completed;
            session.ended_at = Some(now);
            session.add_event(SessionEvent::Completed { timestamp: now });
        }

        if let Some(stats) = work_stats {
            timer.last_work_session = Some(stats);
            timer.sessions_completed += 1;
        }

        timer.session = Some(new_session);
        timer.phase = next_phase;
        timer.total_seconds = next_duration;
        timer.remaining_seconds = next_duration;
        timer.overtime_seconds = 0;
        timer.status = TimerStatus::Running;
        timer.clone()
    };

    let _ = TimerUpdatedEvent(timer.clone()).emit(&app);

    #[cfg(target_os = "macos")]
    TrayState::set_timer(&app, Some(timer.remaining_seconds));

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
    let now = Utc::now().timestamp();
    let seconds = minutes * 60;

    // Extract data
    let (is_idle, session_id) = {
        let timer = state.lock().unwrap();
        (timer.status == TimerStatus::Idle, timer.session_id())
    };

    // DB operation (only if active)
    let event = SessionEvent::Extended { timestamp: now, seconds };
    if !is_idle {
        if let Some(id) = session_id {
            SessionRepository::insert_event(&db.pool, id, &event)
                .await
                .map_err(db_err)?;
        }
    }

    // Update state
    let timer = {
        let mut timer = state.lock().unwrap();

        if !is_idle {
            if let Some(session) = &mut timer.session {
                session.add_event(event);
            }
        }

        timer.total_seconds = seconds;
        timer.remaining_seconds = seconds;
        timer.overtime_seconds = 0;
        timer.clone()
    };

    let _ = TimerUpdatedEvent(timer.clone()).emit(&app);

    #[cfg(target_os = "macos")]
    if timer.status != TimerStatus::Idle {
        TrayState::set_timer(&app, Some(timer.remaining_seconds));
    }

    return Ok(());
}

// MARK: - Helpers

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
