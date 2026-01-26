use super::types::{ItemType, SearchableItem, SearchResult};
use super::website::WebsiteConfig;
use mado::{get_app_icon, get_installed_apps, InstalledAppsConfig};

/// Load apps from macOS (without icons for speed).
pub fn load_apps_from_system() -> Vec<SearchableItem> {
	let config = InstalledAppsConfig {
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

/// Populate icons for search results.
pub fn populate_icons(results: &mut [SearchResult]) {
	for result in results.iter_mut() {
		match result.item_type {
			ItemType::App => {
				let icon = get_app_icon(&result.id, 64);
				result.icon = icon.data_url;
				result.color = icon.color;
			}
			ItemType::Website => {
				result.icon = Some(WebsiteConfig::favicon_url(&result.id, 64));
			}
		}
	}
}
