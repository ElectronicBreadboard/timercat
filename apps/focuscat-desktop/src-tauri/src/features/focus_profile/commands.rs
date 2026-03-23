use super::{
    repository::{
        CreateFocusProfileInput, FocusProfileCategoryInput, FocusProfileCategoryRow,
        FocusProfileRepository, FocusProfileScheduleInput, FocusProfileScheduleRow,
        FocusProfileWithRelations, UpdateFocusProfileInput,
    },
    resolution::{is_always_on_now, schedule_time_matches},
    types::{
        CategoryAssignmentDto, FocusCategory, FocusProfileDto, FocusProfileScheduleDto,
        FocusTargetDto, ProfileActivation, ProfileChangedEvent, ScheduleMode, SessionProfileDto,
    },
};
use crate::environment::db::DatabaseState;
use chrono::Datelike;
use serde::Deserialize;
use tauri::{AppHandle, State};
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
pub async fn get_focus_profiles(
    db: State<'_, DatabaseState>,
) -> Result<Vec<FocusProfileDto>, String> {
    let results = FocusProfileRepository::get_all(&db.pool)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(results.into_iter().map(FocusProfileDto::from).collect());
}

#[tauri::command]
#[specta::specta]
pub async fn get_focus_profile(
    db: State<'_, DatabaseState>,
    id: i32,
) -> Result<Option<FocusProfileDto>, String> {
    let result = FocusProfileRepository::get(&db.pool, id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(result.map(FocusProfileDto::from));
}

#[tauri::command]
#[specta::specta]
pub async fn create_focus_profile(
    app: AppHandle,
    db: State<'_, DatabaseState>,
    name: String,
    color: Option<String>,
    enabled: bool,
    categories: Vec<FocusProfileCategoryParams>,
    schedules: Vec<FocusProfileScheduleParams>,
) -> Result<FocusProfileDto, String> {
    let result = FocusProfileRepository::create(
        &db.pool,
        &CreateFocusProfileInput {
            name,
            color,
            enabled,
            categories: categories
                .into_iter()
                .map(FocusProfileCategoryInput::from)
                .collect(),
            schedules: schedules
                .into_iter()
                .map(FocusProfileScheduleInput::from)
                .collect(),
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    let _ = ProfileChangedEvent.emit(&app);
    return Ok(FocusProfileDto::from(result));
}

#[tauri::command]
#[specta::specta]
pub async fn update_focus_profile(
    app: AppHandle,
    db: State<'_, DatabaseState>,
    id: i32,
    name: String,
    color: Option<String>,
    enabled: bool,
    categories: Vec<FocusProfileCategoryParams>,
    schedules: Vec<FocusProfileScheduleParams>,
) -> Result<FocusProfileDto, String> {
    let result = FocusProfileRepository::update(
        &db.pool,
        id as i64,
        &UpdateFocusProfileInput {
            name,
            color,
            enabled,
            categories: categories
                .into_iter()
                .map(FocusProfileCategoryInput::from)
                .collect(),
            schedules: schedules
                .into_iter()
                .map(FocusProfileScheduleInput::from)
                .collect(),
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    let _ = ProfileChangedEvent.emit(&app);
    return Ok(FocusProfileDto::from(result));
}

#[tauri::command]
#[specta::specta]
pub async fn delete_focus_profile(
    app: AppHandle,
    db: State<'_, DatabaseState>,
    id: i32,
) -> Result<(), String> {
    FocusProfileRepository::delete(&db.pool, id as i64)
        .await
        .map_err(|e| e.to_string())?;

    let _ = ProfileChangedEvent.emit(&app);
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn get_active_focus_profiles(
    db: State<'_, DatabaseState>,
) -> Result<Vec<FocusProfileDto>, String> {
    let active = FocusProfileRepository::get_active(&db.pool)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(active
        .into_iter()
        .map(|(profile, _priority)| FocusProfileDto::from(profile))
        .collect());
}

/// Returns all enabled profiles with their activation status for session setup.
///
/// - AlwaysOn: active always_on schedule — shown, not removable
/// - PreSelected: active pre_selected schedule — shown, removable
/// - Manual: no active schedule — user adds manually
#[tauri::command]
#[specta::specta]
pub async fn get_session_profiles(
    db: State<'_, DatabaseState>,
) -> Result<Vec<SessionProfileDto>, String> {
    let all = FocusProfileRepository::get_all(&db.pool)
        .await
        .map_err(|e| e.to_string())?;

    let now = chrono::Local::now();
    let current_day = now.weekday().num_days_from_monday() as i32;
    let current_time = now.format("%H:%M").to_string();

    let profiles = all
        .into_iter()
        .filter(|p| p.profile.enabled)
        .map(|p| {
            let activation = if is_always_on_now(&p.schedules, current_day, &current_time) {
                ProfileActivation::AlwaysOn
            } else if is_pre_selected_now(&p.schedules, current_day, &current_time) {
                ProfileActivation::PreSelected
            } else {
                ProfileActivation::Manual
            };

            SessionProfileDto {
                profile: FocusProfileDto::from(p),
                activation,
            }
        })
        .collect();

    return Ok(profiles);
}

/// True if any pre_selected schedule matches the current day and time.
fn is_pre_selected_now(
    schedules: &[FocusProfileScheduleRow],
    current_day: i32,
    current_time: &str,
) -> bool {
    schedules.iter().any(|s| {
        if s.mode != ScheduleMode::PreSelected.as_str() {
            return false;
        }
        let days: Vec<i32> = serde_json::from_str(&s.days).unwrap_or_default();
        if !days.contains(&current_day) {
            return false;
        }
        schedule_time_matches(&s.start_time, &s.end_time, current_time)
    })
}

// MARK: - Params

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusProfileCategoryParams {
    pub category: FocusCategory,
    pub target: FocusTargetDto,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusProfileScheduleParams {
    pub mode: ScheduleMode,
    pub days: Vec<i32>,
    pub start_time: String,
    pub end_time: String,
}

// MARK: - Conversions

impl From<FocusProfileCategoryParams> for FocusProfileCategoryInput {
    fn from(params: FocusProfileCategoryParams) -> Self {
        return Self {
            category: params.category,
            target: params.target,
        };
    }
}

impl From<FocusProfileScheduleParams> for FocusProfileScheduleInput {
    fn from(params: FocusProfileScheduleParams) -> Self {
        return Self {
            mode: params.mode,
            days: params.days,
            start_time: params.start_time,
            end_time: params.end_time,
        };
    }
}

impl From<FocusProfileWithRelations> for FocusProfileDto {
    fn from(data: FocusProfileWithRelations) -> Self {
        return Self {
            id: data.profile.id as i32,
            name: data.profile.name,
            color: data.profile.color,
            enabled: data.profile.enabled,
            categories: data
                .categories
                .into_iter()
                .map(CategoryAssignmentDto::from)
                .collect(),
            schedules: data
                .schedules
                .into_iter()
                .map(FocusProfileScheduleDto::from)
                .collect(),
            created_at: data.profile.created_at as f64,
        };
    }
}

impl From<FocusProfileCategoryRow> for CategoryAssignmentDto {
    fn from(row: FocusProfileCategoryRow) -> Self {
        let target = if let Some(bundle_id) = row.app_bundle_id {
            FocusTargetDto::App {
                bundle_id,
                name: row.app_name,
                icon: row.app_icon,
                color: row.app_color,
            }
        } else if let Some(domain) = row.website_domain {
            FocusTargetDto::Website {
                domain,
                name: row.website_name,
                icon: row.website_icon,
                color: row.website_color,
            }
        } else {
            FocusTargetDto::All
        };

        return Self {
            id: row.id as i32,
            category: FocusCategory::from_str(&row.category).unwrap_or(FocusCategory::Neutral),
            target,
        };
    }
}

impl From<FocusProfileScheduleRow> for FocusProfileScheduleDto {
    fn from(row: FocusProfileScheduleRow) -> Self {
        let days: Vec<i32> = serde_json::from_str(&row.days).unwrap_or_default();
        return Self {
            id: row.id as i32,
            mode: ScheduleMode::from_str(&row.mode).unwrap_or(ScheduleMode::AlwaysOn),
            days,
            start_time: row.start_time,
            end_time: row.end_time,
        };
    }
}
