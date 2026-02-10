use super::{
    persistence,
    types::{AppSettings, AppSettingsChangedEvent, AppSettingsState},
};
use crate::common::path::get_app_data_dir;
use crate::environment::configs::app::{AppConfig, AppDistribution};
use crate::features::timer::timer::{TimerConfig, TimerStatus};
use crate::features::timer::types::{TimerDto, TimerState, TimerUpdatedEvent};
use std::process::Command;
use tauri::{AppHandle, Manager, State};
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
pub fn get_settings(state: State<'_, AppSettingsState>) -> AppSettings {
    return state.lock().unwrap().clone();
}

#[tauri::command]
#[specta::specta]
pub fn set_settings(
    app: AppHandle,
    state: State<'_, AppSettingsState>,
    settings: AppSettings,
) -> Result<(), String> {
    // Force cat_window off in App Store builds
    let mut settings = settings;
    if AppConfig::distribution() == AppDistribution::AppStore {
        settings.features.cat_window = false;
    }

    // Update in-memory state
    *state.lock().unwrap() = settings.clone();

    // Persist to disk
    persistence::save_settings(&app, &settings)?;

    // Sync idle timer with new settings
    if let Some(timer_state) = app.try_state::<TimerState>() {
        let mut timer = timer_state.lock().unwrap();
        if timer.status == TimerStatus::Idle {
            let config = TimerConfig::from(&settings);
            timer.total_seconds = config.work_duration;
            timer.remaining_seconds = config.work_duration;
            timer.speed = config.speed;
            let _ = TimerUpdatedEvent(TimerDto::from(&*timer)).emit(&app);
        }
    }

    // Emit event to notify frontend
    let _ = AppSettingsChangedEvent(settings).emit(&app);

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn get_data_directory_path(app: AppHandle) -> String {
    let data_dir_path = get_app_data_dir(&app);
    return data_dir_path.to_string_lossy().to_string();
}

#[tauri::command]
#[specta::specta]
pub fn open_data_directory(app: AppHandle) -> Result<(), String> {
    let data_dir_path = get_app_data_dir(&app);

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&data_dir_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        Command::new("xdg-open")
            .arg(&data_dir_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    return Ok(());
}
