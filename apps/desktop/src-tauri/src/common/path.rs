use crate::environment::configs::app::AppConfig;
use std::path::PathBuf;
use tauri::{Manager, Runtime};

/// Resolve path to a resource file from the app bundle (resource_dir).
pub fn get_resource_path<R: Runtime, M: Manager<R>>(
    app: &M,
    relative: &str,
) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;
    let path = dir.join("resources").join(relative);
    if !path.exists() {
        return Err(format!("Resource not found: {}", relative));
    }
    return Ok(path);
}

/// Get app data directory path, creating it if missing.
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
