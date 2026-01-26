use super::types::{AppSearchState, SearchResultDto};
use serde::{Deserialize, Serialize};
use tauri::State;

/// Search for apps and websites.
#[tauri::command]
#[specta::specta]
pub fn search(
    state: State<'_, AppSearchState>,
    input: SearchInput,
) -> Result<Vec<SearchResultDto>, String> {
    let query = input.query.trim();
    let limit = input.limit.unwrap_or(20) as usize;

    if query.is_empty() {
        return Ok(Vec::new());
    }

    let mut search = state.lock().unwrap();
    let matches = search.search(
        query,
        input.include_apps,
        input.include_websites,
        input.include_icons,
        limit,
    );

    return Ok(matches
        .into_iter()
        .map(|(item, score)| item.to_result(score))
        .collect());
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

/// Refresh the search cache (reloads apps from system).
#[tauri::command]
#[specta::specta]
pub fn refresh_search_cache(state: State<'_, AppSearchState>) -> Result<(), String> {
    state.lock().unwrap().refresh();
    return Ok(());
}
