use super::app::AppConfig;
use std::path::PathBuf;

pub struct DbConfig;

impl DbConfig {
    pub fn db_name() -> &'static str {
        return "focuscat.db";
    }

    pub fn migrations_dir() -> PathBuf {
        return AppConfig::cargo_manifest_dir().join("migrations");
    }
}
