use super::repository::SessionRepository;
use crate::environment::db::DatabaseState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_today_focus_seconds(db: State<'_, DatabaseState>) -> Result<u32, String> {
    return SessionRepository::get_today_focus_seconds(&db.pool)
        .await
        .map_err(|e| e.to_string());
}
