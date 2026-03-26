#[cfg(all(desktop, not(feature = "app-store"), not(debug_assertions)))]
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
#[specta::specta]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(all(desktop, not(feature = "app-store"), not(debug_assertions)))]
    {
        let updater = app.updater().map_err(|e| e.to_string())?;
        let update = updater
            .check()
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "No update available".to_string())?;

        update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| e.to_string())?;

        app.restart();
    }

    #[cfg(not(all(desktop, not(feature = "app-store"), not(debug_assertions))))]
    {
        let _ = app;
        return Err("Updates not supported in this distribution".to_string());
    }
}
