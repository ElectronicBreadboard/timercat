use super::repository::{
    CreateFocusProfileInput, FocusProfileRepository, FocusProfileRuleInput, FocusProfileRuleRow,
    FocusProfileScheduleInput, FocusProfileScheduleRow, FocusProfileWithRelations,
    UpdateFocusProfileInput,
};
use super::types::{
    EligibleProfileDto, FocusProfileDto, FocusProfileRuleDto, FocusProfileScheduleDto,
    ProfileChangedEvent, RuleAction, RuleTargetDto, ScheduleMode,
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
    rules: Vec<FocusProfileRuleParams>,
    schedules: Vec<FocusProfileScheduleParams>,
) -> Result<FocusProfileDto, String> {
    let rules = rules.into_iter().map(FocusProfileRuleInput::from).collect();
    let schedules = schedules
        .into_iter()
        .map(FocusProfileScheduleInput::from)
        .collect();
    let result = FocusProfileRepository::create(
        &db.pool,
        &CreateFocusProfileInput {
            name,
            color,
            rules,
            schedules,
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
    rules: Vec<FocusProfileRuleParams>,
    schedules: Vec<FocusProfileScheduleParams>,
) -> Result<FocusProfileDto, String> {
    let rules = rules.into_iter().map(FocusProfileRuleInput::from).collect();
    let schedules = schedules
        .into_iter()
        .map(FocusProfileScheduleInput::from)
        .collect();
    let result = FocusProfileRepository::update(
        &db.pool,
        id as i64,
        &UpdateFocusProfileInput {
            name,
            color,
            rules,
            schedules,
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

#[tauri::command]
#[specta::specta]
pub async fn get_session_eligible_profiles(
    db: State<'_, DatabaseState>,
) -> Result<Vec<EligibleProfileDto>, String> {
    let all = FocusProfileRepository::get_all(&db.pool)
        .await
        .map_err(|e| e.to_string())?;

    let now = chrono::Local::now();
    let current_day = now.weekday().num_days_from_monday() as i32;
    let current_time = now.format("%H:%M").to_string();

    let profiles = all
        .into_iter()
        // Exclude profiles that only have always_on schedules (they're enforced independently)
        .filter(|p| {
            p.schedules.is_empty()
                || p.schedules
                    .iter()
                    .any(|s| s.mode != ScheduleMode::AlwaysOn.as_str())
        })
        .map(|p| {
            // Auto-select if any sessions_only schedule matches current day and time
            let auto_selected = p.schedules.iter().any(|s| {
                if s.mode != ScheduleMode::SessionsOnly.as_str() {
                    return false;
                }
                let days: Vec<i32> = serde_json::from_str(&s.days).unwrap_or_default();
                if !days.contains(&current_day) {
                    return false;
                }
                if s.start_time <= s.end_time {
                    s.start_time <= current_time && current_time < s.end_time
                } else {
                    current_time >= s.start_time || current_time < s.end_time
                }
            });

            EligibleProfileDto {
                profile: FocusProfileDto::from(p),
                auto_selected,
            }
        })
        .collect();

    return Ok(profiles);
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusProfileRuleParams {
    pub action: RuleAction,
    pub target: RuleTargetDto,
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

impl From<FocusProfileRuleParams> for FocusProfileRuleInput {
    fn from(params: FocusProfileRuleParams) -> Self {
        return Self {
            action: params.action,
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
            rules: data
                .rules
                .into_iter()
                .map(FocusProfileRuleDto::from)
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

impl From<FocusProfileRuleRow> for FocusProfileRuleDto {
    fn from(row: FocusProfileRuleRow) -> Self {
        let target = if let Some(bundle_id) = row.app_bundle_id {
            RuleTargetDto::App {
                bundle_id,
                name: row.app_name,
                icon: row.app_icon,
                color: row.app_color,
            }
        } else if let Some(domain) = row.website_domain {
            RuleTargetDto::Website {
                domain,
                name: row.website_name,
                icon: row.website_icon,
                color: row.website_color,
            }
        } else {
            RuleTargetDto::All
        };

        return Self {
            id: row.id as i32,
            action: RuleAction::from_str(&row.action).unwrap_or(RuleAction::Block),
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
