use super::search::AppSearch;
use serde::{Deserialize, Serialize};
use std::{ops::Deref, sync::Mutex};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultDto {
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum ItemType {
    App,
    Website,
}

#[derive(Debug, Clone)]
pub struct SearchableItem {
    pub id: String,
    pub name: String,
    pub item_type: ItemType,
    pub keywords: Vec<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

impl SearchableItem {
    /// Create a custom domain item from user input.
    pub fn custom_domain(domain: &str) -> Self {
        return Self {
            id: domain.to_string(),
            name: domain.to_string(),
            item_type: ItemType::Website,
            keywords: vec![domain.to_string()],
            icon: None,
            color: None,
        };
    }

    /// Convert to SearchResultDto with score.
    pub fn to_result(self, score: u32) -> SearchResultDto {
        return SearchResultDto {
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

pub struct AppSearchState(Mutex<AppSearch>);

impl AppSearchState {
    pub fn init() -> Self {
        return Self(Mutex::new(AppSearch::new()));
    }
}

impl Deref for AppSearchState {
    type Target = Mutex<AppSearch>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}
