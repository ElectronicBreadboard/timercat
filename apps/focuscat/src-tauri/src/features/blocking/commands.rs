use super::repository::{BlockRuleRepository, CreateBlockRuleInput, TagRepository};
use super::types::{BlockRuleDto, BlockRuleType, TagDto, TagSchedule};
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
            schedule: row.schedule.and_then(|s| serde_json::from_str(&s).ok()),
            created_at: row.created_at as f64,
        })
        .collect();

    return Ok(tags);
}

#[tauri::command]
#[specta::specta]
pub async fn create_tag(
    db: State<'_, DatabaseState>,
    name: String,
    schedule: Option<TagSchedule>,
) -> Result<TagDto, String> {
    let schedule_json = schedule
        .as_ref()
        .map(|s| serde_json::to_string(s))
        .transpose()
        .map_err(|e| e.to_string())?;

    let row = TagRepository::create(&db.pool, &name, schedule_json.as_deref())
        .await
        .map_err(|e| e.to_string())?;

    return Ok(TagDto {
        id: row.id as i32,
        name: row.name,
        schedule,
        created_at: row.created_at as f64,
    });
}

#[tauri::command]
#[specta::specta]
pub async fn update_tag(
    db: State<'_, DatabaseState>,
    id: i32,
    name: String,
    schedule: Option<TagSchedule>,
) -> Result<(), String> {
    let schedule_json = schedule
        .as_ref()
        .map(|s| serde_json::to_string(s))
        .transpose()
        .map_err(|e| e.to_string())?;

    TagRepository::update(&db.pool, id as i64, &name, schedule_json.as_deref())
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

// MARK: - Block Rule Commands

#[tauri::command]
#[specta::specta]
pub async fn get_tag_block_rules(
    db: State<'_, DatabaseState>,
    tag_id: i32,
) -> Result<Vec<BlockRuleDto>, String> {
    let rows = BlockRuleRepository::get_by_tag(&db.pool, tag_id as i64)
        .await
        .map_err(|e| e.to_string())?;

    let rules = rows
        .into_iter()
        .filter_map(|row| {
            let rule_type = BlockRuleType::from_str(&row.rule_type)?;
            Some(BlockRuleDto {
                id: row.id as i32,
                tag_id: row.tag_id as i32,
                rule_type,
                app_id: row.app_id.map(|id| id as i32),
                app_bundle_id: row.app_bundle_id,
                app_name: row.app_name,
                app_icon: row.app_icon,
                website_id: row.website_id.map(|id| id as i32),
                website_domain: row.website_domain,
                website_name: row.website_name,
                website_icon: row.website_icon,
            })
        })
        .collect();

    return Ok(rules);
}

/// Upserts the app (created if new, found by bundle_id if exists).
#[tauri::command]
#[specta::specta]
pub async fn add_app_block_rule(
    db: State<'_, DatabaseState>,
    tag_id: i32,
    rule_type: BlockRuleType,
    bundle_id: String,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
) -> Result<BlockRuleDto, String> {
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

    // Create block rule
    let input = CreateBlockRuleInput {
        tag_id: tag_id as i64,
        rule_type: rule_type.as_str().to_string(),
        app_id: Some(app_id),
        website_id: None,
    };

    let row = BlockRuleRepository::create(&db.pool, &input)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(BlockRuleDto {
        id: row.id as i32,
        tag_id: row.tag_id as i32,
        rule_type,
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
pub async fn add_website_block_rule(
    db: State<'_, DatabaseState>,
    tag_id: i32,
    rule_type: BlockRuleType,
    domain: String,
) -> Result<BlockRuleDto, String> {
    // Upsert website to get website_id
    let website_id = WebsiteRepository::upsert(&db.pool, &domain)
        .await
        .map_err(|e| e.to_string())?;

    // Create block rule
    let input = CreateBlockRuleInput {
        tag_id: tag_id as i64,
        rule_type: rule_type.as_str().to_string(),
        app_id: None,
        website_id: Some(website_id),
    };

    let row = BlockRuleRepository::create(&db.pool, &input)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(BlockRuleDto {
        id: row.id as i32,
        tag_id: row.tag_id as i32,
        rule_type,
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
pub async fn remove_block_rule(db: State<'_, DatabaseState>, id: i32) -> Result<(), String> {
    BlockRuleRepository::delete(&db.pool, id as i64)
        .await
        .map_err(|e| e.to_string())?;

    return Ok(());
}
