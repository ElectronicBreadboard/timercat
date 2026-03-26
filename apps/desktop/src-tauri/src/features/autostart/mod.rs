use tauri_plugin_autostart::ManagerExt;

pub fn apply<R: tauri::Runtime>(app: &tauri::AppHandle<R>, enabled: bool) {
    let autolaunch = app.autolaunch();
    if enabled {
        let _ = autolaunch.enable();
    } else {
        let _ = autolaunch.disable();
    }
}
