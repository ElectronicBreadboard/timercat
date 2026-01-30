use super::types::{RuleAction, RuleTargetDto};
use crate::features::app::repository::{
    AppRepository, UpsertAppInput, UpsertWebsiteInput, WebsiteRepository,
};
use sqlx::{FromRow, Row, SqliteConnection, SqlitePool};

pub struct FocusProfileRepository;

impl FocusProfileRepository {
    /// Create new focus profile with rules.
    pub async fn create(
        pool: &SqlitePool,
        input: &CreateFocusProfileInput,
    ) -> Result<FocusProfileWithRules, sqlx::Error> {
        let mut tx = pool.begin().await?;

        let result = sqlx::query(
            r#"
            INSERT INTO focus_profile (name, color)
            VALUES (?, ?)
            RETURNING id, name, color, created_at
            "#,
        )
        .bind(&input.name)
        .bind(&input.color)
        .fetch_one(&mut *tx)
        .await?;

        let profile = FocusProfileRow {
            id: result.get(0),
            name: result.get(1),
            color: result.get(2),
            created_at: result.get(3),
        };

        Self::insert_rules(&mut *tx, profile.id, &input.rules).await?;

        tx.commit().await?;

        let rules = Self::get_rules(pool, profile.id).await?;

        return Ok(FocusProfileWithRules { profile, rules });
    }

    /// Get focus profile by id with rules.
    pub async fn get(
        pool: &SqlitePool,
        id: i64,
    ) -> Result<Option<FocusProfileWithRules>, sqlx::Error> {
        let profile: Option<FocusProfileRow> =
            sqlx::query_as("SELECT id, name, color, created_at FROM focus_profile WHERE id = ?")
                .bind(id)
                .fetch_optional(pool)
                .await?;

        match profile {
            Some(profile) => {
                let rules = Self::get_rules(pool, profile.id).await?;
                return Ok(Some(FocusProfileWithRules { profile, rules }));
            }
            None => return Ok(None),
        }
    }

    /// Get all focus profiles with rules.
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<FocusProfileWithRules>, sqlx::Error> {
        let profiles: Vec<FocusProfileRow> = sqlx::query_as(
            "SELECT id, name, color, created_at FROM focus_profile ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await?;

        let mut results = Vec::with_capacity(profiles.len());
        for profile in profiles {
            let rules = Self::get_rules(pool, profile.id).await?;
            results.push(FocusProfileWithRules { profile, rules });
        }

        return Ok(results);
    }

    /// Update focus profile with rules (replaces all rules).
    pub async fn update(
        pool: &SqlitePool,
        id: i64,
        input: &UpdateFocusProfileInput,
    ) -> Result<FocusProfileWithRules, sqlx::Error> {
        let mut tx = pool.begin().await?;

        sqlx::query("UPDATE focus_profile SET name = ?, color = ? WHERE id = ?")
            .bind(&input.name)
            .bind(&input.color)
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // Delete existing rules and insert new ones
        sqlx::query("DELETE FROM focus_profile_rule WHERE focus_profile_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        Self::insert_rules(&mut *tx, id, &input.rules).await?;

        tx.commit().await?;

        // Fetch updated profile
        let profile: FocusProfileRow =
            sqlx::query_as("SELECT id, name, color, created_at FROM focus_profile WHERE id = ?")
                .bind(id)
                .fetch_one(pool)
                .await?;

        let rules = Self::get_rules(pool, profile.id).await?;

        return Ok(FocusProfileWithRules { profile, rules });
    }

    /// Delete focus profile (rules cascade).
    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM focus_profile WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        return Ok(());
    }

    /// Get rules for a profile with joined app/website data.
    async fn get_rules(
        pool: &SqlitePool,
        profile_id: i64,
    ) -> Result<Vec<FocusProfileRuleRow>, sqlx::Error> {
        let rows = sqlx::query_as(
            r#"
            SELECT
                r.id,
                r.action,
                a.bundle_id as app_bundle_id,
                a.name as app_name,
                a.icon as app_icon,
                a.color as app_color,
                w.domain as website_domain,
                w.name as website_name,
                w.icon as website_icon,
                w.color as website_color
            FROM focus_profile_rule r
            LEFT JOIN app a ON a.id = r.app_id
            LEFT JOIN website w ON w.id = r.website_id
            WHERE r.focus_profile_id = ?
            ORDER BY r.created_at ASC
            "#,
        )
        .bind(profile_id)
        .fetch_all(pool)
        .await?;

        return Ok(rows);
    }

    /// Insert rules for a profile.
    async fn insert_rules(
        conn: &mut SqliteConnection,
        profile_id: i64,
        rules: &[FocusProfileRuleInput],
    ) -> Result<(), sqlx::Error> {
        for rule in rules {
            match &rule.target {
                RuleTargetDto::All => {
                    sqlx::query(
                        "INSERT INTO focus_profile_rule (focus_profile_id, action) VALUES (?, ?)",
                    )
                    .bind(profile_id)
                    .bind(rule.action.as_str())
                    .execute(&mut *conn)
                    .await?;
                }
                RuleTargetDto::App {
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
                        "INSERT INTO focus_profile_rule (focus_profile_id, action, app_id) VALUES (?, ?, ?)",
                    )
                    .bind(profile_id)
                    .bind(rule.action.as_str())
                    .bind(app_id)
                    .execute(&mut *conn)
                    .await?;
                }
                RuleTargetDto::Website {
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
                        "INSERT INTO focus_profile_rule (focus_profile_id, action, website_id) VALUES (?, ?, ?)",
                    )
                    .bind(profile_id)
                    .bind(rule.action.as_str())
                    .bind(website_id)
                    .execute(&mut *conn)
                    .await?;
                }
            }
        }

        return Ok(());
    }
}

pub struct CreateFocusProfileInput {
    pub name: String,
    pub color: Option<String>,
    pub rules: Vec<FocusProfileRuleInput>,
}

pub struct UpdateFocusProfileInput {
    pub name: String,
    pub color: Option<String>,
    pub rules: Vec<FocusProfileRuleInput>,
}

pub struct FocusProfileRuleInput {
    pub action: RuleAction,
    pub target: RuleTargetDto,
}

#[derive(Debug, FromRow)]
pub struct FocusProfileRow {
    pub id: i64,
    pub name: String,
    pub color: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, FromRow)]
pub struct FocusProfileRuleRow {
    pub id: i64,
    pub action: String,
    pub app_bundle_id: Option<String>,
    pub app_name: Option<String>,
    pub app_icon: Option<String>,
    pub app_color: Option<String>,
    pub website_domain: Option<String>,
    pub website_name: Option<String>,
    pub website_icon: Option<String>,
    pub website_color: Option<String>,
}

pub struct FocusProfileWithRules {
    pub profile: FocusProfileRow,
    pub rules: Vec<FocusProfileRuleRow>,
}
