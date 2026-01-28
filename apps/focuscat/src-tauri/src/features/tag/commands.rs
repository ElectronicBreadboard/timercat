use super::repository::{
    CreateRestrictionInput, RestrictionRepository, ScheduleRepository, ScheduleTagRepository,
    TagRepository,
};
use super::types::{RestrictionAction, RestrictionDto, ScheduleDto, TagDto};
use crate::environment::db::DatabaseState;
use crate::features::activity_window::repository::{
    AppRepository, UpsertAppInput, WebsiteRepository,
};
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
            created_at: row.created_at as f64,
        })
        .collect();

    return Ok(tags);
}

#[tauri::command]
#[specta::specta]
pub async fn create_tag(db: State<'_, DatabaseState>, name: String) -> Result<TagDto, String> {
    let row = TagRepository::create(&db.pool, &name)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(TagDto {
        id: row.id as i32,
        name: row.name,
        created_at: row.created_at as f64,
    });
}

#[tauri::command]
#[specta::specta]
pub async fn update_tag(
    db: State<'_, DatabaseState>,
    id: i32,
    name: String,
) -> Result<(), String> {
    TagRepository::update(&db.pool, id as i64, &name)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn delete_tag(db: State<'_, DatabaseState>, id: i32) -> Result<(), String> {
    TagRepository::delete(&db.pool, id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(());
}

// MARK: - Restriction Commands

#[tauri::command]
#[specta::specta]
pub async fn get_tag_restrictions(
    db: State<'_, DatabaseState>,
    tag_id: i32,
) -> Result<Vec<RestrictionDto>, String> {
    let rows = RestrictionRepository::get_by_tag(&db.pool, tag_id as i64)
        .await
        .map_err(|e| e.to_string())?;

    let restrictions = rows
        .into_iter()
        .map(|row| RestrictionDto {
            id: row.id as i32,
            tag_id: row.tag_id as i32,
            action: RestrictionAction::from_str(&row.action).unwrap_or(RestrictionAction::Block),
            app_id: row.app_id.map(|id| id as i32),
            app_bundle_id: row.app_bundle_id,
            app_name: row.app_name,
            app_icon: row.app_icon,
            website_id: row.website_id.map(|id| id as i32),
            website_domain: row.website_domain,
            website_name: row.website_name,
            website_icon: row.website_icon,
        })
        .collect();

    return Ok(restrictions);
}

/// Upserts the app (created if new, found by bundle_id if exists).
#[tauri::command]
#[specta::specta]
pub async fn add_app_restriction(
    db: State<'_, DatabaseState>,
    tag_id: i32,
    action: RestrictionAction,
    bundle_id: String,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
) -> Result<RestrictionDto, String> {
    // Upsert app to get app_id
    let app_id = AppRepository::upsert(
        &db.pool,
        &UpsertAppInput {
            bundle_id: Some(bundle_id),
            name,
            process_path: None,
            icon,
            color,
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    // Create restriction
    let input = CreateRestrictionInput {
        tag_id: tag_id as i64,
        action: action.as_str().to_string(),
        app_id: Some(app_id),
        website_id: None,
    };

    let row = RestrictionRepository::create(&db.pool, &input)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(RestrictionDto {
        id: row.id as i32,
        tag_id: row.tag_id as i32,
        action,
        app_id: row.app_id.map(|id| id as i32),
        app_bundle_id: row.app_bundle_id,
        app_name: row.app_name,
        app_icon: row.app_icon,
        website_id: None,
        website_domain: None,
        website_name: None,
        website_icon: None,
    });
}

/// Upserts the website (created if new, found by domain if exists).
#[tauri::command]
#[specta::specta]
pub async fn add_website_restriction(
    db: State<'_, DatabaseState>,
    tag_id: i32,
    action: RestrictionAction,
    domain: String,
) -> Result<RestrictionDto, String> {
    // Upsert website to get website_id
    let website_id = WebsiteRepository::upsert(&db.pool, &domain)
        .await
        .map_err(|e| e.to_string())?;

    // Create restriction
    let input = CreateRestrictionInput {
        tag_id: tag_id as i64,
        action: action.as_str().to_string(),
        app_id: None,
        website_id: Some(website_id),
    };

    let row = RestrictionRepository::create(&db.pool, &input)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(RestrictionDto {
        id: row.id as i32,
        tag_id: row.tag_id as i32,
        action,
        app_id: None,
        app_bundle_id: None,
        app_name: None,
        app_icon: None,
        website_id: row.website_id.map(|id| id as i32),
        website_domain: row.website_domain,
        website_name: row.website_name,
        website_icon: row.website_icon,
    });
}

#[tauri::command]
#[specta::specta]
pub async fn remove_restriction(db: State<'_, DatabaseState>, id: i32) -> Result<(), String> {
    RestrictionRepository::delete(&db.pool, id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(());
}

// MARK: - Schedule Commands

#[tauri::command]
#[specta::specta]
pub async fn get_schedules(db: State<'_, DatabaseState>) -> Result<Vec<ScheduleDto>, String> {
    let rows = ScheduleRepository::get_all(&db.pool)
        .await
        .map_err(|e| e.to_string())?;

    let schedules = rows
        .into_iter()
        .map(|row| {
            let days: Vec<u8> = serde_json::from_str(&row.days).unwrap_or_default();
            ScheduleDto {
                id: row.id as i32,
                name: row.name,
                days,
                start_time: row.start_time,
                end_time: row.end_time,
                created_at: row.created_at as f64,
            }
        })
        .collect();

    return Ok(schedules);
}

#[tauri::command]
#[specta::specta]
pub async fn create_schedule(
    db: State<'_, DatabaseState>,
    name: String,
    days: Vec<u8>,
    start_time: String,
    end_time: String,
) -> Result<ScheduleDto, String> {
    let days_json = serde_json::to_string(&days).map_err(|e| e.to_string())?;

    let row = ScheduleRepository::create(&db.pool, &name, &days_json, &start_time, &end_time)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(ScheduleDto {
        id: row.id as i32,
        name: row.name,
        days,
        start_time: row.start_time,
        end_time: row.end_time,
        created_at: row.created_at as f64,
    });
}

#[tauri::command]
#[specta::specta]
pub async fn update_schedule(
    db: State<'_, DatabaseState>,
    id: i32,
    name: String,
    days: Vec<u8>,
    start_time: String,
    end_time: String,
) -> Result<(), String> {
    let days_json = serde_json::to_string(&days).map_err(|e| e.to_string())?;

    ScheduleRepository::update(&db.pool, id as i64, &name, &days_json, &start_time, &end_time)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn delete_schedule(db: State<'_, DatabaseState>, id: i32) -> Result<(), String> {
    ScheduleRepository::delete(&db.pool, id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(());
}

// MARK: - Schedule Tag Commands

#[tauri::command]
#[specta::specta]
pub async fn add_schedule_tag(
    db: State<'_, DatabaseState>,
    schedule_id: i32,
    tag_id: i32,
) -> Result<(), String> {
    ScheduleTagRepository::add(&db.pool, schedule_id as i64, tag_id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn remove_schedule_tag(
    db: State<'_, DatabaseState>,
    schedule_id: i32,
    tag_id: i32,
) -> Result<(), String> {
    ScheduleTagRepository::remove(&db.pool, schedule_id as i64, tag_id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn get_schedule_tags(
    db: State<'_, DatabaseState>,
    schedule_id: i32,
) -> Result<Vec<i32>, String> {
    let tag_ids = ScheduleTagRepository::get_tags_for_schedule(&db.pool, schedule_id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(tag_ids.into_iter().map(|id| id as i32).collect());
}
