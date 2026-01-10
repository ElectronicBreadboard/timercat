use std::sync::Mutex;
use tauri::{AppHandle, State};
use tauri_specta::Event;

use super::runner::TimerRunner;
use super::types::{
    FocusCategory, Timer, TimerPhase, TimerSettings, TimerSettingsState, TimerState, TimerStatus,
    TimerTickEvent,
};

#[tauri::command]
#[specta::specta]
pub fn get_timer(state: State<'_, TimerState>) -> Timer {
    return state.lock().unwrap().clone();
}

#[tauri::command]
#[specta::specta]
pub fn get_timer_settings(state: State<'_, TimerSettingsState>) -> TimerSettings {
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
    runner: State<'_, Mutex<Option<TimerRunner>>>,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();

    timer.status = TimerStatus::Idle;
    timer.remaining_seconds = timer.total_seconds;

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
    settings: State<'_, TimerSettingsState>,
    runner: State<'_, Mutex<Option<TimerRunner>>>,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();
    let timer_settings = settings.lock().unwrap();

    let is_work_phase = timer.phase == TimerPhase::Work;

    // Increment sessions if skipping work phase
    if is_work_phase {
        timer.sessions_completed += 1;
    }

    // Determine next phase
    let next_phase = if is_work_phase {
        if timer.sessions_completed % timer_settings.sessions_before_long_break == 0 {
            TimerPhase::LongBreak
        } else {
            TimerPhase::ShortBreak
        }
    } else {
        TimerPhase::Work
    };

    // Update state
    let next_duration = Timer::get_duration_for_phase(next_phase, &timer_settings);
    timer.status = TimerStatus::Idle;
    timer.phase = next_phase;
    timer.total_seconds = next_duration;
    timer.remaining_seconds = next_duration;

    // Emit tick with new state
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
pub fn set_timer_duration(
    app: AppHandle,
    state: State<'_, TimerState>,
    minutes: u32,
) -> Result<(), String> {
    let mut timer = state.lock().unwrap();

    if timer.status != TimerStatus::Idle {
        return Err("Cannot change duration while timer is not idle".to_string());
    }

    let seconds = minutes * 60;
    timer.total_seconds = seconds;
    timer.remaining_seconds = seconds;

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
