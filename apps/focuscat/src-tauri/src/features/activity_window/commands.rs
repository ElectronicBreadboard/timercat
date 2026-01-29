use super::repository::{GetWindowActivitiesInput, WindowActivityRepository};
use super::types::WindowActivityDto;
use crate::environment::db::DatabaseState;
use serde::Deserialize;
use tauri::State;

/// Get window activities within a time range.
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

    let activities = rows
        .into_iter()
        .map(|row| WindowActivityDto {
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
        })
        .collect();

    return Ok(activities);
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetWindowActivitiesParams {
    pub started_after: f64,
    pub started_before: f64,
    pub limit: Option<i32>,
}
