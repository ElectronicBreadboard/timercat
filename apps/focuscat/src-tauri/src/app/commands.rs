use super::window::{ShowWindow, WindowId};

// MARK: - Window Commands

#[tauri::command]
#[specta::specta]
pub fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    ShowWindow::Main.show(&app).map_err(|e| e.to_string())?;
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn show_cat_window(app: tauri::AppHandle) -> Result<(), String> {
    ShowWindow::Cat.show(&app).map_err(|e| e.to_string())?;
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn hide_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = WindowId::Main.get(&app) {
        window.hide().map_err(|e| e.to_string())?;
    }
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn hide_cat_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = WindowId::Cat.get(&app) {
        window.hide().map_err(|e| e.to_string())?;
    }
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn show_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    // Hide main window first
    if let Some(main_window) = WindowId::Main.get(&app) {
        main_window.hide().map_err(|e| e.to_string())?;
    }
    // Show settings window
    ShowWindow::Settings.show(&app).map_err(|e| e.to_string())?;
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn hide_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = WindowId::Settings.get(&app) {
        window.hide().map_err(|e| e.to_string())?;
    }
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}
