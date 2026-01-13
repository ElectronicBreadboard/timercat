use super::{
    persistence,
    types::{AppSettings, AppSettingsChangedEvent, AppSettingsState},
};
use crate::common::path::get_app_data_dir;
use std::process::Command;
use tauri::{AppHandle, State};
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
    // Update in-memory state
    *state.lock().unwrap() = settings.clone();

    // Persist to disk
    persistence::save_settings(&app, &settings)?;

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
