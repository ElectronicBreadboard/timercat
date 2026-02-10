use crate::environment::configs::app::AppConfig;
use std::path::PathBuf;
use tauri::{Manager, Runtime};

/// Get a resource file path, checking dev path first then bundled resources.
pub fn get_resource_path<R: Runtime, M: Manager<R>>(
    app: &M,
    relative: &str,
) -> Result<PathBuf, String> {
    // Dev: resources are at CARGO_MANIFEST_DIR/resources/
    let dev_path = AppConfig::cargo_manifest_dir()
        .join("resources")
        .join(relative);
    if dev_path.exists() {
        return Ok(dev_path);
    }

    // Prod: resources are bundled at resource_dir()/resources/
    app.path()
        .resource_dir()
        .map(|dir| dir.join("resources").join(relative))
        .map_err(|e| format!("Failed to get resource directory: {}", e))
}

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
