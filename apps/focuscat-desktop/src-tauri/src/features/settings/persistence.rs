use crate::{
    common::path::get_app_data_dir,
    environment::configs::settings::SettingsConfig,
    features::settings::types::{AppSettings, SettingsVersion},
};
use serde_json::Value;
use std::{fs, path::PathBuf};
use tauri::{Manager, Runtime};

fn get_settings_path<R: Runtime, M: Manager<R>>(app: &M) -> PathBuf {
    let data_dir = get_app_data_dir(app);
    return data_dir.join(SettingsConfig::settings_file_name());
}

/// Load settings from disk, or return defaults if file doesn't exist.
pub fn load_settings<R: Runtime, M: Manager<R>>(app: &M) -> AppSettings {
    let settings_path = get_settings_path(app);

    if !settings_path.exists() {
        return AppSettings::default();
    }

    match fs::read_to_string(&settings_path) {
        Ok(content) => {
            let mut value: Value = match serde_json::from_str(&content) {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("[Settings] Failed to parse settings file: {}", e);
                    return AppSettings::default();
                }
            };

            let version_before = version_from_value(&value);
            while version_from_value(&value) != SettingsVersion::current() {
                migrate_value_one_step(&mut value);
            }

            match serde_json::from_value::<AppSettings>(value) {
                Ok(settings) => {
                    if version_before != SettingsVersion::current() {
                        if let Err(e) = save_settings(app, &settings) {
                            eprintln!("[Settings] Failed to persist migrated settings: {}", e);
                        }
                    }
                    return settings;
                }
                Err(e) => {
                    eprintln!(
                        "[Settings] Failed to deserialize settings after migration: {}",
                        e
                    );
                    return AppSettings::default();
                }
            }
        }
        Err(e) => {
            eprintln!("[Settings] Failed to read settings file: {}", e);
            return AppSettings::default();
        }
    }
}

/// Save settings to disk.
pub fn save_settings<R: Runtime, M: Manager<R>>(
    app: &M,
    settings: &AppSettings,
) -> Result<(), String> {
    let settings_path = get_settings_path(app);

    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&settings_path, json).map_err(|e| format!("Failed to write settings file: {}", e))?;

    return Ok(());
}

fn migrate_value_one_step(value: &mut Value) {
    let version = version_from_value(value);
    match version {
        SettingsVersion::V0_0_1 => {}
    }
}

fn version_from_value(value: &Value) -> SettingsVersion {
    return value
        .get("version")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_else(SettingsVersion::default);
}
