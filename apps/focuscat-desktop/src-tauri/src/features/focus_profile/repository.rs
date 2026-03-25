use super::{
    resolution::is_always_on_now,
    types::{ActivationMode, FocusCategory, FocusSessionType, FocusTargetDto},
};
use crate::features::app::repository::{
    AppRepository, UpsertAppInput, UpsertWebsiteInput, WebsiteRepository,
};
use chrono::Datelike;
use sqlx::{FromRow, Row, SqliteConnection, SqlitePool};

pub struct FocusProfileRepository;

impl FocusProfileRepository {
    /// Create a new focus profile with categories and activations.
    pub async fn create(
        pool: &SqlitePool,
        input: &CreateFocusProfileInput,
    ) -> Result<FocusProfileWithRelations, sqlx::Error> {
        let mut tx = pool.begin().await?;

        let result = sqlx::query(
            r#"
            INSERT INTO focus_profile (name, color, enabled)
            VALUES (?, ?, ?)
            RETURNING id, name, color, enabled, created_at
            "#,
        )
        .bind(&input.name)
        .bind(&input.color)
        .bind(input.enabled)
        .fetch_one(&mut *tx)
        .await?;

        let profile = FocusProfileRow {
            id: result.get(0),
            name: result.get(1),
            color: result.get(2),
            enabled: result.get(3),
            created_at: result.get(4),
        };

        Self::insert_categories(&mut *tx, profile.id, &input.categories).await?;
        Self::insert_activations(&mut *tx, profile.id, &input.activations).await?;

        tx.commit().await?;

        let categories = Self::get_categories(pool, profile.id).await?;
        let activations = Self::get_activations(pool, profile.id).await?;

        return Ok(FocusProfileWithRelations {
            profile,
            categories,
            activations,
        });
    }

    /// Get a focus profile by id with categories and activations.
    pub async fn get(
        pool: &SqlitePool,
        id: i64,
    ) -> Result<Option<FocusProfileWithRelations>, sqlx::Error> {
        let profile: Option<FocusProfileRow> = sqlx::query_as(
            "SELECT id, name, color, enabled, created_at FROM focus_profile WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        match profile {
            Some(profile) => {
                let categories = Self::get_categories(pool, profile.id).await?;
                let activations = Self::get_activations(pool, profile.id).await?;
                return Ok(Some(FocusProfileWithRelations {
                    profile,
                    categories,
                    activations,
                }));
            }
            None => return Ok(None),
        }
    }

    /// Get all focus profiles with categories and activations.
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<FocusProfileWithRelations>, sqlx::Error> {
        let profiles: Vec<FocusProfileRow> = sqlx::query_as(
            "SELECT id, name, color, enabled, created_at FROM focus_profile ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await?;

        let mut results = Vec::with_capacity(profiles.len());
        for profile in profiles {
            let categories = Self::get_categories(pool, profile.id).await?;
            let activations = Self::get_activations(pool, profile.id).await?;
            results.push(FocusProfileWithRelations {
                profile,
                categories,
                activations,
            });
        }

        return Ok(results);
    }

    /// Get all currently active focus profiles with their priority.
    ///
    /// A profile is active if:
    /// - It's linked to an active session (via session_focus_profile), OR
    /// - It has an always_on activation rule matching the current day, time, and session type.
    ///
    /// Disabled profiles are never active.
    pub async fn get_active(
        pool: &SqlitePool,
        session_type: Option<&FocusSessionType>,
    ) -> Result<Vec<(FocusProfileWithRelations, i64)>, sqlx::Error> {
        let now = chrono::Local::now();
        let current_day = now.weekday().num_days_from_monday() as i32;
        let current_time = now.format("%H:%M").to_string();

        let session_rows = sqlx::query(
            r#"
            SELECT sfp.focus_profile_id, MAX(sfp.priority) as priority
            FROM session_focus_profile sfp
            JOIN session s ON s.id = sfp.session_id
            WHERE s.status = 'active'
            GROUP BY sfp.focus_profile_id
            "#,
        )
        .fetch_all(pool)
        .await?;

        let session_priorities: std::collections::HashMap<i64, i64> = session_rows
            .iter()
            .map(|r| (r.get("focus_profile_id"), r.get("priority")))
            .collect();

        let all = Self::get_all(pool).await?;

        let active = all
            .into_iter()
            .filter_map(|p| {
                // Skip disabled profiles
                if !p.profile.enabled {
                    return None;
                }

                if let Some(&priority) = session_priorities.get(&p.profile.id) {
                    return Some((p, priority));
                }

                if is_always_on_now(&p.activations, current_day, &current_time, session_type) {
                    return Some((p, 0));
                }

                return None;
            })
            .collect();

        return Ok(active);
    }

    /// Update a focus profile with categories and activations (replaces all).
    pub async fn update(
        pool: &SqlitePool,
        id: i64,
        input: &UpdateFocusProfileInput,
    ) -> Result<FocusProfileWithRelations, sqlx::Error> {
        let mut tx = pool.begin().await?;

        sqlx::query("UPDATE focus_profile SET name = ?, color = ?, enabled = ? WHERE id = ?")
            .bind(&input.name)
            .bind(&input.color)
            .bind(input.enabled)
            .bind(id)
            .execute(&mut *tx)
            .await?;

        sqlx::query("DELETE FROM focus_profile_category WHERE focus_profile_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        Self::insert_categories(&mut *tx, id, &input.categories).await?;

        sqlx::query("DELETE FROM focus_profile_activation WHERE focus_profile_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        Self::insert_activations(&mut *tx, id, &input.activations).await?;

        tx.commit().await?;

        let profile: FocusProfileRow = sqlx::query_as(
            "SELECT id, name, color, enabled, created_at FROM focus_profile WHERE id = ?",
        )
        .bind(id)
        .fetch_one(pool)
        .await?;

        let categories = Self::get_categories(pool, profile.id).await?;
        let activations = Self::get_activations(pool, profile.id).await?;

        return Ok(FocusProfileWithRelations {
            profile,
            categories,
            activations,
        });
    }

    /// Delete a focus profile (categories and activations cascade).
    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM focus_profile WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        return Ok(());
    }

    /// Get category assignments for a profile with joined app/website data.
    async fn get_categories(
        pool: &SqlitePool,
        profile_id: i64,
    ) -> Result<Vec<FocusProfileCategoryRow>, sqlx::Error> {
        let rows = sqlx::query_as(
            r#"
            SELECT
                c.id,
                c.category,
                a.bundle_id as app_bundle_id,
                a.name as app_name,
                a.icon as app_icon,
                a.color as app_color,
                w.domain as website_domain,
                w.name as website_name,
                w.icon as website_icon,
                w.color as website_color
            FROM focus_profile_category c
            LEFT JOIN app a ON a.id = c.app_id
            LEFT JOIN website w ON w.id = c.website_id
            WHERE c.focus_profile_id = ?
            ORDER BY c.created_at ASC
            "#,
        )
        .bind(profile_id)
        .fetch_all(pool)
        .await?;

        return Ok(rows);
    }

    /// Insert category assignments for a profile.
    async fn insert_categories(
        conn: &mut SqliteConnection,
        profile_id: i64,
        categories: &[FocusProfileCategoryInput],
    ) -> Result<(), sqlx::Error> {
        for cat in categories {
            match &cat.target {
                FocusTargetDto::All => {
                    sqlx::query(
                        "INSERT INTO focus_profile_category (focus_profile_id, category) VALUES (?, ?)",
                    )
                    .bind(profile_id)
                    .bind(cat.category.as_str())
                    .execute(&mut *conn)
                    .await?;
                }
                FocusTargetDto::App {
                    bundle_id,
                    name,
                    icon,
                    color,
                } => {
                    let app_id = AppRepository::upsert(
                        &mut *conn,
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
                        "INSERT INTO focus_profile_category (focus_profile_id, category, app_id) VALUES (?, ?, ?)",
                    )
                    .bind(profile_id)
                    .bind(cat.category.as_str())
                    .bind(app_id)
                    .execute(&mut *conn)
                    .await?;
                }
                FocusTargetDto::Website {
                    domain,
                    name,
                    icon,
                    color,
                } => {
                    let website_id = WebsiteRepository::upsert(
                        &mut *conn,
                        &UpsertWebsiteInput {
                            domain: domain.clone(),
                            name: name.clone(),
                            icon: icon.clone(),
                            color: color.clone(),
                        },
                    )
                    .await?;

                    sqlx::query(
                        "INSERT INTO focus_profile_category (focus_profile_id, category, website_id) VALUES (?, ?, ?)",
                    )
                    .bind(profile_id)
                    .bind(cat.category.as_str())
                    .bind(website_id)
                    .execute(&mut *conn)
                    .await?;
                }
            }
        }

        return Ok(());
    }

    /// Get activation rules for a profile.
    async fn get_activations(
        pool: &SqlitePool,
        profile_id: i64,
    ) -> Result<Vec<FocusProfileActivationRow>, sqlx::Error> {
        let rows = sqlx::query_as(
            r#"
            SELECT id, mode, session_types, schedule_days, schedule_start_time, schedule_end_time
            FROM focus_profile_activation
            WHERE focus_profile_id = ?
            ORDER BY created_at ASC
            "#,
        )
        .bind(profile_id)
        .fetch_all(pool)
        .await?;

        return Ok(rows);
    }

    /// Insert activation rules for a profile.
    async fn insert_activations(
        conn: &mut SqliteConnection,
        profile_id: i64,
        activations: &[FocusProfileActivationInput],
    ) -> Result<(), sqlx::Error> {
        for activation in activations {
            let session_types_json = activation
                .session_types
                .as_ref()
                .map(|types| serde_json::to_string(types).unwrap_or_default());
            let schedule_days_json = activation
                .schedule_days
                .as_ref()
                .map(|days| serde_json::to_string(days).unwrap_or_default());
            sqlx::query(
                r#"
                INSERT INTO focus_profile_activation
                    (focus_profile_id, mode, session_types, schedule_days, schedule_start_time, schedule_end_time)
                VALUES (?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(profile_id)
            .bind(activation.mode.as_str())
            .bind(&session_types_json)
            .bind(&schedule_days_json)
            .bind(&activation.schedule_start_time)
            .bind(&activation.schedule_end_time)
            .execute(&mut *conn)
            .await?;
        }

        return Ok(());
    }
}

// MARK: - Input

pub struct CreateFocusProfileInput {
    pub name: String,
    pub color: Option<String>,
    pub enabled: bool,
    pub categories: Vec<FocusProfileCategoryInput>,
    pub activations: Vec<FocusProfileActivationInput>,
}

pub struct UpdateFocusProfileInput {
    pub name: String,
    pub color: Option<String>,
    pub enabled: bool,
    pub categories: Vec<FocusProfileCategoryInput>,
    pub activations: Vec<FocusProfileActivationInput>,
}

pub struct FocusProfileCategoryInput {
    pub category: FocusCategory,
    pub target: FocusTargetDto,
}

pub struct FocusProfileActivationInput {
    pub mode: ActivationMode,
    pub session_types: Option<Vec<FocusSessionType>>,
    pub schedule_days: Option<Vec<i32>>,
    pub schedule_start_time: Option<String>,
    pub schedule_end_time: Option<String>,
}

// MARK: - Row

#[derive(Debug, FromRow)]
pub struct FocusProfileRow {
    pub id: i64,
    pub name: String,
    pub color: Option<String>,
    pub enabled: bool,
    pub created_at: i64,
}

#[derive(Debug, FromRow)]
pub struct FocusProfileCategoryRow {
    pub id: i64,
    pub category: String,
    pub app_bundle_id: Option<String>,
    pub app_name: Option<String>,
    pub app_icon: Option<String>,
    pub app_color: Option<String>,
    pub website_domain: Option<String>,
    pub website_name: Option<String>,
    pub website_icon: Option<String>,
    pub website_color: Option<String>,
}

#[derive(Debug, FromRow)]
pub struct FocusProfileActivationRow {
    pub id: i64,
    pub mode: String,
    pub session_types: Option<String>,
    pub schedule_days: Option<String>,
    pub schedule_start_time: Option<String>,
    pub schedule_end_time: Option<String>,
}

pub struct FocusProfileWithRelations {
    pub profile: FocusProfileRow,
    pub categories: Vec<FocusProfileCategoryRow>,
    pub activations: Vec<FocusProfileActivationRow>,
}
