use std::sync::Mutex;
use tauri::{AppHandle, State};
use tauri_specta::Event;

use crate::features::settings::types::AppSettingsState;

use super::runner::TimerRunner;
use super::types::{
    FocusCategory, Timer, TimerConfig, TimerPhase, TimerState, TimerStatus, TimerTickEvent,
};

#[tauri::command]
#[specta::specta]
pub fn get_timer(state: State<'_, TimerState>) -> Timer {
    return state.lock().unwrap().clone();
}

#[tauri::command]
#[specta::specta]
pub fn start_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();

    if timer.status != TimerStatus::Idle {
        return Err("Timer is not idle".to_string());
    }

    timer.status = TimerStatus::Running;

    // Emit initial tick
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
pub fn pause_timer(
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
pub fn resume_timer(
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
pub fn reset_timer(
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
    timer.target_sessions = config.sessions_before_long_break;
    timer.base_work_seconds = config.work_duration;

    // Emit tick with reset state
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
pub fn skip_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    app_settings: State<'_, AppSettingsState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();
    let settings = app_settings.lock().unwrap();
    let config = TimerConfig::from(&*settings);

    let is_work_phase = timer.phase == TimerPhase::Work;

    // Increment sessions if skipping work phase
    if is_work_phase {
        timer.sessions_completed += 1;
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

    // Update base_work_seconds when transitioning to work phase
    if next_phase == TimerPhase::Work {
        timer.base_work_seconds = config.work_duration;
    }

    // Auto-start breaks, but require manual start for work
    timer.status = if is_work_phase {
        TimerStatus::Running
    } else {
        TimerStatus::Idle
    };

    // Emit tick with new state
    let _ = TimerTickEvent(timer.clone()).emit(&app);

    // Manage runner based on new status
    let mut runner_guard = runner.lock().unwrap();
    if timer.status == TimerStatus::Running {
        // Start runner for auto-started break
        if runner_guard.is_none() {
            *runner_guard = Some(TimerRunner::start(app));
        }
    } else {
        // Stop runner for idle state
        if let Some(r) = runner_guard.take() {
            r.stop();
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

    // Set both total and remaining to selected value
    timer.total_seconds = seconds;
    timer.remaining_seconds = seconds;
    timer.overtime_seconds = 0;

    // Store base work duration for progress calculation
    timer.base_work_seconds = settings.work_duration_minutes * 60;

    // Emit tick with new duration
    let _ = TimerTickEvent(timer.clone()).emit(&app);

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn set_timer_category(
    app: AppHandle,
    state: State<'_, TimerState>,
    category: Option<FocusCategory>,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();
    timer.category = category;

    // Emit tick with new category
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

#[tauri::command]
#[specta::specta]
pub fn set_target_sessions(
    app: AppHandle,
    state: State<'_, TimerState>,
    sessions: u32,
) -> Result<(), String> {
    if sessions < 1 || sessions > 16 {
        return Err("Target sessions must be between 1 and 16".to_string());
    }

    let mut timer = state.lock().unwrap();
    timer.target_sessions = sessions;

    // Emit tick with new target
    let _ = TimerTickEvent(timer.clone()).emit(&app);

    return Ok(());
}
