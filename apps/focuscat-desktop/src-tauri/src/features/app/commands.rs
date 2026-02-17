use super::types::{AppSearchState, GroupMemberDto, SearchResultDto, SearchableItem};
use serde::Deserialize;
use tauri::State;

/// Search for apps and websites.
#[tauri::command]
#[specta::specta]
pub fn search(
    state: State<'_, AppSearchState>,
    params: SearchParams,
) -> Result<Vec<SearchResultDto>, String> {
    let query = params.query.trim();
    let limit = params.limit.unwrap_or(20) as usize;

    if query.is_empty() {
        return Ok(Vec::new());
    }

    let mut search = state.lock().unwrap();
    let matches = search.search(
        query,
        params.include_apps,
        params.include_websites,
        params.include_icons,
        limit,
    );

    return Ok(matches.into_iter().map(SearchResultDto::from).collect());
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchParams {
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

// MARK: - Conversions

impl From<(SearchableItem, u32)> for SearchResultDto {
    fn from((item, score): (SearchableItem, u32)) -> Self {
        match item {
            SearchableItem::App { app, .. } => Self::App { app, score },
            SearchableItem::Website { website, .. } => Self::Website { website, score },
            SearchableItem::Group {
                name,
                websites,
                apps,
                ..
            } => {
                let icon = websites.first().and_then(|w| w.icon.clone());
                let members = websites
                    .into_iter()
                    .map(|w| GroupMemberDto::Website { website: w })
                    .chain(apps.into_iter().map(|a| GroupMemberDto::App { app: a }))
                    .collect();
                return Self::Group {
                    name,
                    icon,
                    members,
                    score,
                };
            }
        }
    }
}
