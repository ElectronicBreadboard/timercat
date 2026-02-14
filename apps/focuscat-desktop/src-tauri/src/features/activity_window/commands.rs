use super::repository::{GetWindowActivitiesInput, WindowActivityRepository, WindowActivityRow};
use super::types::{CurrentActivityDto, WindowActivityDto};
use crate::environment::db::DatabaseState;
use mado::QueryConfig;
use serde::Deserialize;
use tauri::State;

/// Get current active app or window by querying the OS.
#[tauri::command]
#[specta::specta]
pub fn get_current_activity(
    params: GetCurrentActivityParams,
) -> Result<CurrentActivityDto, String> {
    let config = QueryConfig {
        include_app_icon: true,
        include_browser_info: true,
        include_website_info: true,
        ..QueryConfig::default()
    };

    match params.poll_target {
        CurrentActivityPollTarget::App => {
            let app = mado::get_active_app_with_config(config).map_err(|e| e.to_string())?;
            return Ok(CurrentActivityDto::AppActivated { app });
        }
        CurrentActivityPollTarget::Window => {
            let window = mado::get_active_window_with_config(config).map_err(|e| e.to_string())?;
            return Ok(CurrentActivityDto::WindowChanged { window });
        }
    }
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetCurrentActivityParams {
    pub poll_target: CurrentActivityPollTarget,
}

#[derive(Debug, Clone, Copy, Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum CurrentActivityPollTarget {
    App,
    Window,
}

/// Get past window activities within a time range.
#[tauri::command]
#[specta::specta]
pub async fn get_window_activities(
    db: State<'_, DatabaseState>,
    params: GetWindowActivitiesParams,
) -> Result<Vec<WindowActivityDto>, String> {
    let rows = WindowActivityRepository::get(
        &db.pool,
        &GetWindowActivitiesInput {
            started_after: params.started_after as i64,
            started_before: params.started_before as i64,
            limit: params.limit.map(|l| l as i64),
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    return Ok(rows.into_iter().map(WindowActivityDto::from).collect());
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetWindowActivitiesParams {
    pub started_after: f64,
    pub started_before: f64,
    pub limit: Option<i32>,
}

// MARK: - Conversions

impl From<WindowActivityRow> for WindowActivityDto {
    fn from(row: WindowActivityRow) -> Self {
        return Self {
            app_bundle_id: row.app_bundle_id,
            app_name: row.app_name,
            app_icon: row.app_icon,
            app_color: row.app_color,
            website_domain: row.website_domain,
            website_name: row.website_name,
            website_icon: row.website_icon,
            website_color: row.website_color,
            window_title: row.window_title,
            browser_url: row.browser_url,
            started_at: row.started_at as f64,
            ended_at: row.ended_at as f64,
        };
    }
}
