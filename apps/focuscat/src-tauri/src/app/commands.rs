use super::window::Window;

// MARK: - Window Commands

#[tauri::command]
#[specta::specta]
pub fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    Window::Main.show(&app).map_err(|e| e.to_string())?;
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn show_cat_window(app: tauri::AppHandle) -> Result<(), String> {
    Window::Cat.show(&app).map_err(|e| e.to_string())?;
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn hide_main_window(app: tauri::AppHandle) -> Result<(), String> {
    Window::Main.hide(&app).map_err(|e| e.to_string())?;
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn hide_cat_window(app: tauri::AppHandle) -> Result<(), String> {
    Window::Cat.hide(&app).map_err(|e| e.to_string())?;
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn show_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    Window::Main.hide(&app).map_err(|e| e.to_string())?;
    Window::Settings.show(&app).map_err(|e| e.to_string())?;
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn hide_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    Window::Settings.hide(&app).map_err(|e| e.to_string())?;
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}
