use super::types::{ItemType, SearchableItem};
use focuscat_macos::{get_installed_apps, ScanConfig};

/// Load apps from macOS (without icons for speed).
pub fn load_apps_from_system() -> Vec<SearchableItem> {
    let config = ScanConfig {
        include_icons: false,
        icon_size: 0,
    };

    return get_installed_apps(config)
        .into_iter()
        .map(|app| SearchableItem {
            id: app.bundle_id.clone(),
            name: app.name,
            item_type: ItemType::App,
            icon: None,
            color: None,
            keywords: vec![app.bundle_id],
        })
        .collect();
}
