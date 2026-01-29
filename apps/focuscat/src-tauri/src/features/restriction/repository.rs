use super::types::{RestrictionAction, RestrictionItem, RestrictionSet};
use crate::features::app::repository::{AppRepository, UpsertAppInput, WebsiteRepository};
use sqlx::{Row, SqlitePool};

// MARK: - Restriction Set Repository

pub struct RestrictionSetRepository;

impl RestrictionSetRepository {
    /// Create new restriction set with items.
    pub async fn create(pool: &SqlitePool, input: &RestrictionSet) -> Result<i64, sqlx::Error> {
        let row = sqlx::query("INSERT INTO restriction_set (action) VALUES (?) RETURNING id")
            .bind(input.action.as_str())
            .fetch_one(pool)
            .await?;

        let set_id: i64 = row.get("id");

        Self::insert_items(pool, set_id, &input.items).await?;

        return Ok(set_id);
    }

    /// Update existing restriction set with items.
    pub async fn update(
        pool: &SqlitePool,
        id: i64,
        input: &RestrictionSet,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE restriction_set SET action = ? WHERE id = ?")
            .bind(input.action.as_str())
            .bind(id)
            .execute(pool)
            .await?;

        // Clear existing items and insert new ones
        sqlx::query("DELETE FROM restriction WHERE restriction_set_id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        Self::insert_items(pool, id, &input.items).await?;

        return Ok(());
    }

    /// Delete restriction set and its items.
    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
        // Items deleted via ON DELETE CASCADE, but explicit is clearer
        sqlx::query("DELETE FROM restriction WHERE restriction_set_id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        sqlx::query("DELETE FROM restriction_set WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        return Ok(());
    }

    /// Get restriction set with items.
    pub async fn get(pool: &SqlitePool, id: i64) -> Result<Option<RestrictionSet>, sqlx::Error> {
        let set: Option<(String,)> =
            sqlx::query_as("SELECT action FROM restriction_set WHERE id = ?")
                .bind(id)
                .fetch_optional(pool)
                .await?;

        let Some((action_str,)) = set else {
            return Ok(None);
        };

        let action = RestrictionAction::from_str(&action_str).unwrap_or(RestrictionAction::Block);

        let rows = sqlx::query(
            r#"
            SELECT
                a.bundle_id, a.name as app_name, a.icon as app_icon, a.color as app_color,
                w.domain, w.name as website_name, w.icon as website_icon, w.color as website_color
            FROM restriction r
            LEFT JOIN app a ON a.id = r.app_id
            LEFT JOIN website w ON w.id = r.website_id
            WHERE r.restriction_set_id = ?
            ORDER BY r.created_at ASC
            "#,
        )
        .bind(id)
        .fetch_all(pool)
        .await?;

        let items = rows
            .into_iter()
            .filter_map(|r| {
                if let Some(bundle_id) = r.get::<Option<String>, _>("bundle_id") {
                    return Some(RestrictionItem::App {
                        bundle_id,
                        name: r.get("app_name"),
                        icon: r.get("app_icon"),
                        color: r.get("app_color"),
                    });
                }
                if let Some(domain) = r.get::<Option<String>, _>("domain") {
                    return Some(RestrictionItem::Website {
                        domain,
                        name: r.get("website_name"),
                        icon: r.get("website_icon"),
                        color: r.get("website_color"),
                    });
                }
                return None;
            })
            .collect();

        return Ok(Some(RestrictionSet { action, items }));
    }

    // MARK: - Private

    async fn insert_items(
        pool: &SqlitePool,
        set_id: i64,
        items: &[RestrictionItem],
    ) -> Result<(), sqlx::Error> {
        for item in items {
            match item {
                RestrictionItem::App {
                    bundle_id,
                    name,
                    icon,
                    color,
                } => {
                    let app_id = AppRepository::upsert(
                        pool,
                        &UpsertAppInput {
                            bundle_id: Some(bundle_id.clone()),
                            name: name.clone(),
                            process_path: None,
                            icon: icon.clone(),
                            color: color.clone(),
                        },
                    )
                    .await?;

                    sqlx::query(
                        "INSERT INTO restriction (restriction_set_id, app_id) VALUES (?, ?)",
                    )
                    .bind(set_id)
                    .bind(app_id)
                    .execute(pool)
                    .await?;
                }
                RestrictionItem::Website { domain, .. } => {
                    let website_id = WebsiteRepository::upsert(pool, domain).await?;

                    sqlx::query(
                        "INSERT INTO restriction (restriction_set_id, website_id) VALUES (?, ?)",
                    )
                    .bind(set_id)
                    .bind(website_id)
                    .execute(pool)
                    .await?;
                }
            }
        }

        return Ok(());
    }
}
