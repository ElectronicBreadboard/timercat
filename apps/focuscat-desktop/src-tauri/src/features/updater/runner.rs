use super::types::{UpdateAvailableEvent, UpdateInfo};
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;
use tauri_specta::Event;

const CHECK_INTERVAL: Duration = Duration::from_secs(30 * 60); // 30 minutes
const INITIAL_DELAY: Duration = Duration::from_secs(5);

pub fn start(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(INITIAL_DELAY).await;

        loop {
            if let Some(event) = check_for_update(&app).await {
                let _ = event.emit(&app);
            }

            tokio::time::sleep(CHECK_INTERVAL).await;
        }
    });
}

async fn check_for_update(app: &AppHandle) -> Option<UpdateAvailableEvent> {
    let updater = app.updater().ok()?;
    let update = updater.check().await.ok()??;

    return Some(UpdateAvailableEvent(UpdateInfo {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
    }));
}
