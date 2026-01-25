use super::config::WebsitesConfig;
use super::types::{ItemType, SearchResult};
use focuscat_macos::get_app_icon;

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
                result.icon = Some(WebsitesConfig::favicon_url(&result.id, 64));
            }
        }
    }
}
