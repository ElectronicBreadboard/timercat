use super::{
    repository::{
        CreateFocusProfileInput, FocusProfileActivationInput, FocusProfileActivationRow,
        FocusProfileCategoryInput, FocusProfileCategoryRow, FocusProfileRepository,
        FocusProfileWithRelations, UpdateFocusProfileInput,
    },
    resolution::{activation_matches_session_type, is_always_on_now, schedule_time_matches},
    types::{
        ActivationMode, CategoryAssignmentDto, FocusCategory, FocusProfileActivationDto,
        FocusProfileDto, FocusSessionType, FocusTargetDto, ProfileActivation, ProfileChangedEvent,
        SessionProfileDto,
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
    activations: Vec<FocusProfileActivationParams>,
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
            activations: activations
                .into_iter()
                .map(FocusProfileActivationInput::from)
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
    activations: Vec<FocusProfileActivationParams>,
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
            activations: activations
                .into_iter()
                .map(FocusProfileActivationInput::from)
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

/// Returns all enabled profiles with their activation status for session setup.
///
/// - AlwaysOn: active always_on activation — shown, not removable
/// - PreSelected: active pre_selected activation — shown, removable
/// - Manual: no active activation — user adds manually
///
/// `session_type`: None = no session type filter, show all.
#[tauri::command]
#[specta::specta]
pub async fn get_session_profiles(
    db: State<'_, DatabaseState>,
    session_type: Option<FocusSessionType>,
) -> Result<Vec<SessionProfileDto>, String> {
    let all = FocusProfileRepository::get_all(&db.pool)
        .await
        .map_err(|e| e.to_string())?;

    let now = chrono::Local::now();
    let current_day = now.weekday().num_days_from_monday() as i32;
    let current_time = now.format("%H:%M").to_string();
    let focus_session_type_ref = session_type.as_ref();

    let profiles = all
        .into_iter()
        .filter(|p| p.profile.enabled)
        .map(|p| {
            let activation = if is_always_on_now(
                &p.activations,
                current_day,
                &current_time,
                focus_session_type_ref,
            ) {
                ProfileActivation::AlwaysOn
            } else if is_pre_selected_now(
                &p.activations,
                current_day,
                &current_time,
                focus_session_type_ref,
            ) {
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

/// True if any pre_selected activation matches the current day, time, and session type.
fn is_pre_selected_now(
    activations: &[FocusProfileActivationRow],
    current_day: i32,
    current_time: &str,
    session_type: Option<&FocusSessionType>,
) -> bool {
    activations.iter().any(|a| {
        if a.mode != ActivationMode::PreSelected.as_str() {
            return false;
        }
        if !activation_matches_session_type(a, session_type) {
            return false;
        }
        let days: Vec<i32> = a
            .schedule_days
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();
        if !days.is_empty() && !days.contains(&current_day) {
            return false;
        }
        let start = a.schedule_start_time.as_deref().unwrap_or("");
        let end = a.schedule_end_time.as_deref().unwrap_or("");
        if start.is_empty() || end.is_empty() {
            return true;
        }
        schedule_time_matches(start, end, current_time)
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
pub struct FocusProfileActivationParams {
    pub mode: ActivationMode,
    pub session_types: Option<Vec<FocusSessionType>>,
    pub schedule_days: Option<Vec<i32>>,
    pub schedule_start_time: Option<String>,
    pub schedule_end_time: Option<String>,
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

impl From<FocusProfileActivationParams> for FocusProfileActivationInput {
    fn from(params: FocusProfileActivationParams) -> Self {
        return Self {
            mode: params.mode,
            session_types: params.session_types,
            schedule_days: params.schedule_days,
            schedule_start_time: params.schedule_start_time,
            schedule_end_time: params.schedule_end_time,
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
            activations: data
                .activations
                .into_iter()
                .map(FocusProfileActivationDto::from)
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

impl From<FocusProfileActivationRow> for FocusProfileActivationDto {
    fn from(row: FocusProfileActivationRow) -> Self {
        let session_types: Option<Vec<FocusSessionType>> = row
            .session_types
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok());
        let schedule_days: Option<Vec<i32>> = row
            .schedule_days
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok());
        return Self {
            id: row.id as i32,
            mode: ActivationMode::from_str(&row.mode).unwrap_or(ActivationMode::AlwaysOn),
            session_types,
            schedule_days,
            schedule_start_time: row.schedule_start_time,
            schedule_end_time: row.schedule_end_time,
        };
    }
}
