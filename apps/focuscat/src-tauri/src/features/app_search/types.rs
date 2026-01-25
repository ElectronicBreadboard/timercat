use super::app::load_apps_from_system;
use super::website::WebsiteConfig;
use serde::{Deserialize, Serialize};
use std::sync::RwLock;
use tauri::App;

/// Search result item.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    /// Unique identifier - bundleId for apps, domain for websites
    pub id: String,
    /// Display name
    pub name: String,
    /// Type of result
    pub item_type: ItemType,
    /// Icon as base64 PNG data URL (apps) or favicon URL (websites)
    pub icon: Option<String>,
    /// Brand color as hex string like "#5865F2" (apps only)
    pub color: Option<String>,
    /// Match score (higher = better match)
    pub score: u32,
}

/// Type of search result.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum ItemType {
    App,
    Website,
}

/// Searchable item (internal use).
#[derive(Debug, Clone)]
pub struct SearchableItem {
    pub id: String,
    pub name: String,
    pub item_type: ItemType,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub keywords: Vec<String>,
}

impl SearchableItem {
    /// Create a custom domain item from user input.
    pub fn custom_domain(domain: &str) -> Self {
        return Self {
            id: domain.to_string(),
            name: domain.to_string(),
            item_type: ItemType::Website,
            icon: None,
            color: None,
            keywords: vec![domain.to_string()],
        };
    }

    /// Convert to SearchResult with score.
    pub fn into_result(self, score: u32) -> SearchResult {
        return SearchResult {
            id: self.id,
            name: self.name,
            item_type: self.item_type,
            icon: self.icon,
            color: self.color,
            score,
        };
    }
}

// MARK: - State

pub struct AppSearchState(RwLock<AppSearchCache>);

struct AppSearchCache {
    apps: Option<Vec<SearchableItem>>,
    websites: Vec<SearchableItem>,
}

impl AppSearchState {
    pub fn init(_app: &App) -> Self {
        return Self(RwLock::new(AppSearchCache {
            apps: None,
            websites: WebsiteConfig::websites(),
        }));
    }

    /// Get cached apps or load them from system.
    pub fn get_apps(&self) -> Vec<SearchableItem> {
        {
            let cache = self.0.read().unwrap();
            if let Some(ref apps) = cache.apps {
                return apps.clone();
            }
        }

        let apps = load_apps_from_system();
        let mut cache = self.0.write().unwrap();
        cache.apps = Some(apps.clone());

        return apps;
    }

    /// Refresh the apps cache.
    pub fn refresh_apps(&self) {
        let apps = load_apps_from_system();
        let mut cache = self.0.write().unwrap();
        cache.apps = Some(apps);
    }

    /// Get websites (always cached).
    pub fn get_websites(&self) -> Vec<SearchableItem> {
        let cache = self.0.read().unwrap();
        return cache.websites.clone();
    }
}
