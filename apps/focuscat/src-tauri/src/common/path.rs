use std::path::PathBuf;
use crate::environment::configs::app::AppConfig;
use tauri::{Manager, Runtime};

/// Get the app data directory, creating it if it doesn't exist.
pub fn get_app_data_dir<R: Runtime, M: Manager<R>>(app: &M) -> PathBuf {
    let base_data_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    let data_dir_path = if let Some(subdir) = AppConfig::app_data_subdir() {
        base_data_dir.join(subdir)
    } else {
        base_data_dir
    };

    std::fs::create_dir_all(&data_dir_path).unwrap_or_else(|err| {
        panic!(
            "Failed to create app data directory at {}: {}",
            data_dir_path.display(),
            err
        )
    });

    return data_dir_path;
}
