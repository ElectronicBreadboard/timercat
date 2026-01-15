use super::repository::{InsertSessionTagInput, InsertSessionTagRuleInput, SessionTagRepository};
use super::types::{SessionTag, SessionTagWithRules};
use crate::environment::db::DatabaseState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_session_tags(db: State<'_, DatabaseState>) -> Result<Vec<SessionTag>, String> {
    SessionTagRepository::get_all(&db.pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_session_tag_with_rules(
    db: State<'_, DatabaseState>,
    id: i32,
) -> Result<Option<SessionTagWithRules>, String> {
    SessionTagRepository::get_with_rules(&db.pool, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn create_session_tag(
    db: State<'_, DatabaseState>,
    name: String,
    color: String,
) -> Result<i32, String> {
    let input = InsertSessionTagInput { name, color };
    SessionTagRepository::insert(&db.pool, &input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn update_session_tag(
    db: State<'_, DatabaseState>,
    id: i32,
    name: String,
    color: String,
) -> Result<(), String> {
    SessionTagRepository::update(&db.pool, id, &name, &color)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_session_tag(db: State<'_, DatabaseState>, id: i32) -> Result<(), String> {
    SessionTagRepository::delete(&db.pool, id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn add_session_tag_rule(
    db: State<'_, DatabaseState>,
    session_tag_id: i32,
    app_bundle_id: String,
    app_name: Option<String>,
) -> Result<i32, String> {
    let input = InsertSessionTagRuleInput {
        session_tag_id,
        app_bundle_id,
        app_name,
    };
    SessionTagRepository::insert_rule(&db.pool, &input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_session_tag_rule(
    db: State<'_, DatabaseState>,
    rule_id: i32,
) -> Result<(), String> {
    SessionTagRepository::delete_rule(&db.pool, rule_id)
        .await
        .map_err(|e| e.to_string())
}
