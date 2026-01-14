use super::runner::TimerRunner;
use super::types::{
    Timer, TimerConfig, TimerPhase, TimerState, TimerStatus, TimerTickEvent, WorkSessionStats,
};
use crate::environment::db::DatabaseState;
use crate::features::session::{repository::SessionRepository, types::InsertSessionInput};
use crate::features::settings::types::AppSettingsState;
use chrono::Utc;
use std::sync::Mutex;
use tauri::{AppHandle, State};
use tauri_specta::Event;

#[cfg(target_os = "macos")]
use crate::app::tray::TrayState;

// NOTE: Timer commands are async to avoid blocking the main thread.
// The runner updates the tray (which dispatches to main thread on macOS) while holding
// the timer lock. Sync commands would block the main thread waiting for that lock → deadlock.

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
    runner: State<'_, Mutex<Option<TimerRunner>>>,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();

    if timer.status != TimerStatus::Idle {
        return Err("Timer is not idle".to_string());
    }

    timer.status = TimerStatus::Running;
    timer.phase_started_at = Some(Utc::now().timestamp());

    // Emit initial tick
    let _ = TimerTickEvent(timer.clone()).emit(&app);

    // Update tray
    #[cfg(target_os = "macos")]
    TrayState::set_timer(&app, Some(timer.remaining_seconds));

    // Start runner
    let mut runner_guard = runner.lock().unwrap();
    if runner_guard.is_some() {
        runner_guard.as_ref().unwrap().stop();
    }
    *runner_guard = Some(TimerRunner::start(app));

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn pause_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();

    if timer.status != TimerStatus::Running {
        return Err("Timer is not running".to_string());
    }

    timer.status = TimerStatus::Paused;

    // Emit tick with paused state
    let _ = TimerTickEvent(timer.clone()).emit(&app);

    // Stop runner
    let mut runner_guard = runner.lock().unwrap();
    if let Some(r) = runner_guard.take() {
        r.stop();
    }

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn resume_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();

    if timer.status != TimerStatus::Paused {
        return Err("Timer is not paused".to_string());
    }

    timer.status = TimerStatus::Running;

    // Emit tick with running state
    let _ = TimerTickEvent(timer.clone()).emit(&app);

    // Start runner
    let mut runner_guard = runner.lock().unwrap();
    if runner_guard.is_some() {
        runner_guard.as_ref().unwrap().stop();
    }
    *runner_guard = Some(TimerRunner::start(app));

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn reset_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    app_settings: State<'_, AppSettingsState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();
    let settings = app_settings.lock().unwrap();
    let config = TimerConfig::from(&*settings);

    // Reset to initial state
    timer.status = TimerStatus::Idle;
    timer.phase = TimerPhase::Work;
    timer.total_seconds = config.work_duration;
    timer.remaining_seconds = config.work_duration;
    timer.overtime_seconds = 0;
    timer.sessions_completed = 0;
    timer.base_work_seconds = config.work_duration;
    timer.accumulated_work_seconds = 0;
    timer.total_extended_seconds = 0;
    timer.phase_started_at = None;

    // Emit tick with reset state
    let _ = TimerTickEvent(timer.clone()).emit(&app);

    // Clear tray
    #[cfg(target_os = "macos")]
    TrayState::set_timer(&app, None);

    // Stop runner
    let mut runner_guard = runner.lock().unwrap();
    if let Some(r) = runner_guard.take() {
        r.stop();
    }

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

    // Scope the locks to avoid holding them during async DB call
    let session_input = {
        let mut timer = state.lock().unwrap();
        let settings = app_settings.lock().unwrap();
        let config = TimerConfig::from(&*settings);

        let is_work_phase = timer.phase == TimerPhase::Work;

        // Prepare session input for DB persistence
        let session_input = if let Some(started_at) = timer.phase_started_at {
            let current_work =
                timer.total_seconds - timer.remaining_seconds + timer.overtime_seconds;
            let completed = if is_work_phase {
                timer.accumulated_work_seconds + current_work
            } else {
                current_work
            };
            let planned = timer.base_work_seconds + timer.total_extended_seconds;
            let overtime = if is_work_phase {
                completed.saturating_sub(planned)
            } else {
                0
            };

            Some(InsertSessionInput {
                phase: timer.phase,
                started_at,
                ended_at: now,
                base_seconds: if is_work_phase {
                    timer.base_work_seconds
                } else {
                    timer.total_seconds
                },
                extended_seconds: if is_work_phase {
                    timer.total_extended_seconds
                } else {
                    0
                },
                overtime_seconds: overtime,
                session_tag_ids: timer.session_tag_ids.clone(),
            })
        } else {
            None
        };

        // Capture work session stats before transitioning to break
        if is_work_phase {
            let current_work =
                timer.total_seconds - timer.remaining_seconds + timer.overtime_seconds;
            let completed = timer.accumulated_work_seconds + current_work;
            let planned = timer.base_work_seconds + timer.total_extended_seconds;
            let overtime = completed.saturating_sub(planned);

            timer.last_work_session = Some(WorkSessionStats {
                base_seconds: timer.base_work_seconds,
                extended_seconds: timer.total_extended_seconds,
                overtime_seconds: overtime,
                completed_seconds: completed,
            });
            timer.sessions_completed += 1;

            // Reset accumulators for next work session
            timer.accumulated_work_seconds = 0;
            timer.total_extended_seconds = 0;
        }

        // Determine next phase
        let next_phase = if is_work_phase {
            if timer.sessions_completed % config.sessions_before_long_break == 0 {
                TimerPhase::LongBreak
            } else {
                TimerPhase::ShortBreak
            }
        } else {
            TimerPhase::Work
        };

        // Update state
        let next_duration = Timer::get_duration_for_phase(next_phase, &config);
        timer.phase = next_phase;
        timer.total_seconds = next_duration;
        timer.remaining_seconds = next_duration;
        timer.overtime_seconds = 0;
        timer.phase_started_at = Some(now);

        // Update base_work_seconds when transitioning to work phase
        if next_phase == TimerPhase::Work {
            timer.base_work_seconds = config.work_duration;
        }

        // Auto-start next phase
        timer.status = TimerStatus::Running;

        // Emit tick with new state
        let _ = TimerTickEvent(timer.clone()).emit(&app);

        // Update tray with new time
        #[cfg(target_os = "macos")]
        TrayState::set_timer(&app, Some(timer.remaining_seconds));

        // Always restart runner for clean state
        let mut runner_guard = runner.lock().unwrap();
        if let Some(r) = runner_guard.take() {
            r.stop();
        }
        *runner_guard = Some(TimerRunner::start(app));

        session_input
    };

    // Persist session to database (outside of lock scope)
    if let Some(input) = session_input {
        if let Err(e) = SessionRepository::insert(&db.pool, &input).await {
            eprintln!("Failed to persist session: {}", e);
        }
    }

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn set_timer_duration(
    app: AppHandle,
    state: State<'_, TimerState>,
    app_settings: State<'_, AppSettingsState>,
    minutes: u32,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();
    let settings = app_settings.lock().unwrap();
    let seconds = minutes * 60;

    // If extending mid-session, capture work done before this segment
    if timer.status != TimerStatus::Idle {
        let current_work = timer.total_seconds - timer.remaining_seconds + timer.overtime_seconds;
        timer.accumulated_work_seconds += current_work;
        timer.total_extended_seconds += seconds;
    }

    // Set both total and remaining to selected value
    timer.total_seconds = seconds;
    timer.remaining_seconds = seconds;
    timer.overtime_seconds = 0;

    // Store base work duration for progress calculation
    timer.base_work_seconds = settings.work_duration_minutes * 60;

    // Emit tick with new duration
    let _ = TimerTickEvent(timer.clone()).emit(&app);

    // Update tray if timer is active
    #[cfg(target_os = "macos")]
    if timer.status != TimerStatus::Idle {
        TrayState::set_timer(&app, Some(timer.remaining_seconds));
    }

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn set_timer_tags(
    app: AppHandle,
    state: State<'_, TimerState>,
    session_tag_ids: Vec<i32>,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();
    timer.session_tag_ids = session_tag_ids;

    // Emit tick with new tags
    let _ = TimerTickEvent(timer.clone()).emit(&app);

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn cycle_timer_speed(app: AppHandle, state: State<'_, TimerState>) -> Result<(), String> {
    let mut timer = state.lock().unwrap();

    timer.speed = match timer.speed {
        1 => 2,
        2 => 4,
        4 => 8,
        8 => 16,
        16 => 32,
        32 => 64,
        64 => 128,
        _ => 1,
    };

    let _ = TimerTickEvent(timer.clone()).emit(&app);

    return Ok(());
}
