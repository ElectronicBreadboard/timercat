use super::repository::{CreateTagInput, TagRepository, UpdateTagInput};
use super::types::TagDto;
use crate::environment::db::DatabaseState;
use crate::features::restriction::types::RestrictionSet;
use tauri::State;

// MARK: - Tag Commands

#[tauri::command]
#[specta::specta]
pub async fn get_tags(db: State<'_, DatabaseState>) -> Result<Vec<TagDto>, String> {
    let rows = TagRepository::get_all(&db.pool)
        .await
        .map_err(|e| e.to_string())?;

    let tags = rows
        .into_iter()
        .map(|row| TagDto {
            id: row.id as i32,
            name: row.name,
            color: row.color,
            created_at: row.created_at as f64,
        })
        .collect();

    return Ok(tags);
}

#[tauri::command]
#[specta::specta]
pub async fn get_tag(db: State<'_, DatabaseState>, id: i32) -> Result<Option<TagDto>, String> {
    let result = TagRepository::get(&db.pool, id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(result.map(|r| TagDto {
        id: r.tag.id as i32,
        name: r.tag.name,
        color: r.tag.color,
        created_at: r.tag.created_at as f64,
    }));
}

/// Create new tag with optional restrictions.
#[tauri::command]
#[specta::specta]
pub async fn create_tag(
    db: State<'_, DatabaseState>,
    name: String,
    color: Option<String>,
    restrictions: Option<RestrictionSet>,
) -> Result<TagDto, String> {
    let row = TagRepository::create(
        &db.pool,
        &CreateTagInput {
            name,
            color,
            restrictions,
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    return Ok(TagDto {
        id: row.id as i32,
        name: row.name,
        color: row.color,
        created_at: row.created_at as f64,
    });
}

/// Update existing tag with optional restrictions.
#[tauri::command]
#[specta::specta]
pub async fn update_tag(
    db: State<'_, DatabaseState>,
    id: i32,
    name: String,
    color: Option<String>,
    restrictions: Option<RestrictionSet>,
) -> Result<TagDto, String> {
    let row = TagRepository::update(
        &db.pool,
        id as i64,
        &UpdateTagInput {
            name,
            color,
            restrictions,
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    return Ok(TagDto {
        id: row.id as i32,
        name: row.name,
        color: row.color,
        created_at: row.created_at as f64,
    });
}

#[tauri::command]
#[specta::specta]
pub async fn delete_tag(db: State<'_, DatabaseState>, id: i32) -> Result<(), String> {
    TagRepository::delete(&db.pool, id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(());
}

/// Get restrictions for a tag.
#[tauri::command]
#[specta::specta]
pub async fn get_tag_restrictions(
    db: State<'_, DatabaseState>,
    tag_id: i32,
) -> Result<Option<RestrictionSet>, String> {
    let result = TagRepository::get(&db.pool, tag_id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(result.and_then(|r| r.restrictions));
}
