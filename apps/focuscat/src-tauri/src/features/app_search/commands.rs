use super::app::populate_icons;
use super::matcher::fuzzy_match;
use super::types::{AppSearchState, SearchResult, SearchableItem};
use crate::common::url::{extract_domain, is_domain_like};
use serde::{Deserialize, Serialize};
use tauri::State;

/// Search for apps and websites.
#[tauri::command]
#[specta::specta]
pub fn search(
    state: State<'_, AppSearchState>,
    input: SearchInput,
) -> Result<Vec<SearchResult>, String> {
    let query = input.query.trim();
    let limit = input.limit.unwrap_or(20) as usize;

    if query.is_empty() {
        return Ok(Vec::new());
    }

    let mut results: Vec<(SearchableItem, u32)> = Vec::new();

    // Search apps
    if input.include_apps {
        let apps = state.get_apps();
        for (item, score) in fuzzy_match(&apps, query) {
            results.push((item.clone(), score));
        }
    }

    // Search websites
    if input.include_websites {
        let websites = state.get_websites();
        for (item, score) in fuzzy_match(&websites, query) {
            results.push((item.clone(), score));
        }

        // Add custom domain if query looks like one
        if is_domain_like(query) {
            if let Some(domain) = extract_domain(query) {
                if !results.iter().any(|(item, _)| item.id == domain) {
                    results.push((SearchableItem::custom_domain(&domain), 100));
                }
            }
        }
    }

    // Sort by score descending, take top N
    results.sort_by(|a, b| b.1.cmp(&a.1));
    let mut final_results: Vec<SearchResult> = results
        .into_iter()
        .take(limit)
        .map(|(item, score)| item.into_result(score))
        .collect();

    // Add icons if requested
    if input.include_icons {
        populate_icons(&mut final_results);
    }

    return Ok(final_results);
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchInput {
    /// Search query
    pub query: String,
    /// Include installed apps (default: true)
    #[serde(default = "default_true")]
    pub include_apps: bool,
    /// Include websites (default: true)
    #[serde(default = "default_true")]
    pub include_websites: bool,
    /// Include icons - slower (default: false)
    #[serde(default)]
    pub include_icons: bool,
    /// Maximum results (default: 20)
    pub limit: Option<u32>,
}

impl Default for SearchInput {
    fn default() -> Self {
        Self {
            query: String::new(),
            include_apps: true,
            include_websites: true,
            include_icons: false,
            limit: None,
        }
    }
}

fn default_true() -> bool {
    true
}

/// Refresh the cached apps list.
#[tauri::command]
#[specta::specta]
pub fn refresh_apps_cache(state: State<'_, AppSearchState>) -> Result<(), String> {
    state.refresh_apps();
    return Ok(());
}
