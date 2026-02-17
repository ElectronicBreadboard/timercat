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

    let (major_behind, minor_behind, patch_behind) =
        semver_behind(&update.current_version, &update.version);

    return Some(UpdateAvailableEvent(UpdateInfo {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
        major_behind,
        minor_behind,
        patch_behind,
    }));
}

fn semver_behind(current: &str, latest: &str) -> (u32, u32, u32) {
    let (cmaj, cmin, cpat) = parse_semver(current);
    let (lmaj, lmin, lpat) = parse_semver(latest);
    if lmaj > cmaj {
        return (lmaj - cmaj, 0, 0);
    }
    if lmaj < cmaj {
        return (0, 0, 0);
    }
    if lmin > cmin {
        return (0, lmin - cmin, 0);
    }
    if lmin < cmin {
        return (0, 0, 0);
    }
    if lpat > cpat {
        return (0, 0, lpat - cpat);
    }
    return (0, 0, 0);
}

fn parse_semver(s: &str) -> (u32, u32, u32) {
    let parts: Vec<u32> = s
        .split('.')
        .take(3)
        .filter_map(|p| p.parse().ok())
        .collect();
    if parts.len() < 3 {
        return (0, 0, 0);
    }
    return (parts[0], parts[1], parts[2]);
}
