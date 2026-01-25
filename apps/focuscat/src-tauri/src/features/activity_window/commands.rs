use super::repository::WindowActivityRepository;
use crate::{
    environment::db::DatabaseState, features::activity_window::repository::GetWindowActivitiesInput,
};
use serde::{Deserialize, Serialize};
use specta::Type;
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

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WindowActivityDto {
    // App fields
    pub app_bundle_id: Option<String>,
    pub app_name: Option<String>,
    pub app_icon: Option<String>,
    pub app_color: Option<String>,
    // Website fields (NULL for non-browser)
    pub website_domain: Option<String>,
    pub website_name: Option<String>,
    pub website_icon: Option<String>,
    pub website_color: Option<String>,
    // Window fields
    pub window_title: Option<String>,
    pub browser_url: Option<String>,
    pub started_at: f64,
    pub ended_at: f64,
}

#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GetWindowActivitiesParams {
    pub started_after: f64,
    pub started_before: f64,
    pub limit: Option<i32>,
}
