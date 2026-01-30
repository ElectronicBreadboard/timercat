use super::repository::{
    CreateFocusProfileInput, FocusProfileRepository, FocusProfileRuleInput, FocusProfileRuleRow,
    FocusProfileWithRules, UpdateFocusProfileInput,
};
use super::types::{FocusProfileDto, FocusProfileRuleDto, RuleAction, RuleTargetDto};
use crate::environment::db::DatabaseState;
use serde::Deserialize;
use tauri::State;

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
    db: State<'_, DatabaseState>,
    name: String,
    color: Option<String>,
    rules: Vec<FocusProfileRuleParams>,
) -> Result<FocusProfileDto, String> {
    let rules = rules.into_iter().map(FocusProfileRuleInput::from).collect();
    let result =
        FocusProfileRepository::create(&db.pool, &CreateFocusProfileInput { name, color, rules })
            .await
            .map_err(|e| e.to_string())?;

    return Ok(FocusProfileDto::from(result));
}

#[tauri::command]
#[specta::specta]
pub async fn update_focus_profile(
    db: State<'_, DatabaseState>,
    id: i32,
    name: String,
    color: Option<String>,
    rules: Vec<FocusProfileRuleParams>,
) -> Result<FocusProfileDto, String> {
    let rules = rules.into_iter().map(FocusProfileRuleInput::from).collect();
    let result = FocusProfileRepository::update(
        &db.pool,
        id as i64,
        &UpdateFocusProfileInput { name, color, rules },
    )
    .await
    .map_err(|e| e.to_string())?;

    return Ok(FocusProfileDto::from(result));
}

#[tauri::command]
#[specta::specta]
pub async fn delete_focus_profile(db: State<'_, DatabaseState>, id: i32) -> Result<(), String> {
    FocusProfileRepository::delete(&db.pool, id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(());
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusProfileRuleParams {
    pub action: RuleAction,
    pub target: RuleTargetDto,
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

impl From<FocusProfileWithRules> for FocusProfileDto {
    fn from(data: FocusProfileWithRules) -> Self {
        return Self {
            id: data.profile.id as i32,
            name: data.profile.name,
            color: data.profile.color,
            rules: data
                .rules
                .into_iter()
                .map(FocusProfileRuleDto::from)
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
