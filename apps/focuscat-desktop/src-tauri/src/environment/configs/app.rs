use serde::Serialize;
use std::path::Path;

pub struct AppConfig;

impl AppConfig {
    pub fn cargo_manifest_dir() -> &'static Path {
        Path::new(env!("CARGO_MANIFEST_DIR"))
    }

    pub fn app_name() -> &'static str {
        return "FocusCat";
    }

    pub fn app_title() -> &'static str {
        return "FocusCat";
    }

    pub fn tray_tooltip() -> &'static str {
        return Self::app_name();
    }

    pub fn app_data_subdir() -> Option<&'static str> {
        if cfg!(debug_assertions) {
            return Some("dev");
        }
        return None;
    }

    pub fn distribution() -> AppDistribution {
        if cfg!(feature = "app-store") {
            return AppDistribution::AppStore;
        }
        return AppDistribution::Direct;
    }

    pub fn tray_icon_bytes() -> &'static [u8] {
        if cfg!(debug_assertions) {
            return include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/icons/tray-default-icon-dev.png"
            ));
        }
        return include_bytes!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/icons/tray-default-icon.png"
        ));
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum AppDistribution {
    Direct,
    AppStore,
}
