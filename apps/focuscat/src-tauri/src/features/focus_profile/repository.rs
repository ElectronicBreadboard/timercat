use super::types::{RuleAction, RuleTargetDto, ScheduleMode};
use crate::features::app::repository::{
    AppRepository, UpsertAppInput, UpsertWebsiteInput, WebsiteRepository,
};
use chrono::Datelike;
use sqlx::{FromRow, Row, SqliteConnection, SqlitePool};

pub struct FocusProfileRepository;

impl FocusProfileRepository {
    /// Create new focus profile with rules and schedules.
    pub async fn create(
        pool: &SqlitePool,
        input: &CreateFocusProfileInput,
    ) -> Result<FocusProfileWithRelations, sqlx::Error> {
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
        Self::insert_schedules(&mut *tx, profile.id, &input.schedules).await?;

        tx.commit().await?;

        let rules = Self::get_rules(pool, profile.id).await?;
        let schedules = Self::get_schedules(pool, profile.id).await?;

        return Ok(FocusProfileWithRelations {
            profile,
            rules,
            schedules,
        });
    }

    /// Get focus profile by id with rules and schedules.
    pub async fn get(
        pool: &SqlitePool,
        id: i64,
    ) -> Result<Option<FocusProfileWithRelations>, sqlx::Error> {
        let profile: Option<FocusProfileRow> =
            sqlx::query_as("SELECT id, name, color, created_at FROM focus_profile WHERE id = ?")
                .bind(id)
                .fetch_optional(pool)
                .await?;

        match profile {
            Some(profile) => {
                let rules = Self::get_rules(pool, profile.id).await?;
                let schedules = Self::get_schedules(pool, profile.id).await?;
                return Ok(Some(FocusProfileWithRelations {
                    profile,
                    rules,
                    schedules,
                }));
            }
            None => return Ok(None),
        }
    }

    /// Get all focus profiles with rules and schedules.
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<FocusProfileWithRelations>, sqlx::Error> {
        let profiles: Vec<FocusProfileRow> = sqlx::query_as(
            "SELECT id, name, color, created_at FROM focus_profile ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await?;

        let mut results = Vec::with_capacity(profiles.len());
        for profile in profiles {
            let rules = Self::get_rules(pool, profile.id).await?;
            let schedules = Self::get_schedules(pool, profile.id).await?;
            results.push(FocusProfileWithRelations {
                profile,
                rules,
                schedules,
            });
        }

        return Ok(results);
    }

    /// Get all currently active focus profiles.
    ///
    /// A profile is active if:
    /// - It's linked to an active session (via session_focus_profile), OR
    /// - It has an always_on schedule matching the current day and time.
    pub async fn get_active(
        pool: &SqlitePool,
    ) -> Result<Vec<FocusProfileWithRelations>, sqlx::Error> {
        let all = Self::get_all(pool).await?;

        let now = chrono::Local::now();
        let current_day = now.weekday().num_days_from_monday() as i32;
        let current_time = now.format("%H:%M").to_string();

        // Get profile IDs linked to active sessions
        let session_profile_ids: Vec<i64> = sqlx::query_scalar(
            r#"
            SELECT sfp.focus_profile_id
            FROM session_focus_profile sfp
            JOIN sessions s ON s.id = sfp.session_id
            WHERE s.status = 'active'
            ORDER BY sfp.priority DESC
            "#,
        )
        .fetch_all(pool)
        .await?;

        let active = all
            .into_iter()
            .filter(|p| {
                // Linked to active session
                session_profile_ids.contains(&p.profile.id)
                // Or has an always_on schedule matching current day + time
                || p.schedules.iter().any(|s| {
                    let mode = ScheduleMode::from_str(&s.mode);
                    let days: Vec<i32> = serde_json::from_str(&s.days).unwrap_or_default();
                    let in_time_range = if s.start_time <= s.end_time {
                        // Same-day range (e.g. 09:00–17:00)
                        s.start_time <= current_time && current_time < s.end_time
                    } else {
                        // Midnight-spanning range (e.g. 23:00–01:00)
                        current_time >= s.start_time || current_time < s.end_time
                    };
                    matches!(mode, Some(ScheduleMode::AlwaysOn))
                        && days.contains(&current_day)
                        && in_time_range
                })
            })
            .collect();

        return Ok(active);
    }

    /// Update focus profile with rules and schedules (replaces all).
    pub async fn update(
        pool: &SqlitePool,
        id: i64,
        input: &UpdateFocusProfileInput,
    ) -> Result<FocusProfileWithRelations, sqlx::Error> {
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

        // Delete existing schedules and insert new ones
        sqlx::query("DELETE FROM focus_profile_schedule WHERE focus_profile_id = ?")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        Self::insert_schedules(&mut *tx, id, &input.schedules).await?;

        tx.commit().await?;

        // Fetch updated profile
        let profile: FocusProfileRow =
            sqlx::query_as("SELECT id, name, color, created_at FROM focus_profile WHERE id = ?")
                .bind(id)
                .fetch_one(pool)
                .await?;

        let rules = Self::get_rules(pool, profile.id).await?;
        let schedules = Self::get_schedules(pool, profile.id).await?;

        return Ok(FocusProfileWithRelations {
            profile,
            rules,
            schedules,
        });
    }

    /// Delete focus profile (rules and schedules cascade).
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

    /// Get schedules for a profile.
    async fn get_schedules(
        pool: &SqlitePool,
        profile_id: i64,
    ) -> Result<Vec<FocusProfileScheduleRow>, sqlx::Error> {
        let rows = sqlx::query_as(
            r#"
            SELECT id, mode, days, start_time, end_time
            FROM focus_profile_schedule
            WHERE focus_profile_id = ?
            ORDER BY created_at ASC
            "#,
        )
        .bind(profile_id)
        .fetch_all(pool)
        .await?;

        return Ok(rows);
    }

    /// Insert schedules for a profile.
    async fn insert_schedules(
        conn: &mut SqliteConnection,
        profile_id: i64,
        schedules: &[FocusProfileScheduleInput],
    ) -> Result<(), sqlx::Error> {
        for schedule in schedules {
            let days_json = serde_json::to_string(&schedule.days).unwrap_or_default();
            sqlx::query(
                r#"
                INSERT INTO focus_profile_schedule (focus_profile_id, mode, days, start_time, end_time)
                VALUES (?, ?, ?, ?, ?)
                "#,
            )
            .bind(profile_id)
            .bind(schedule.mode.as_str())
            .bind(&days_json)
            .bind(&schedule.start_time)
            .bind(&schedule.end_time)
            .execute(&mut *conn)
            .await?;
        }

        return Ok(());
    }
}

pub struct CreateFocusProfileInput {
    pub name: String,
    pub color: Option<String>,
    pub rules: Vec<FocusProfileRuleInput>,
    pub schedules: Vec<FocusProfileScheduleInput>,
}

pub struct UpdateFocusProfileInput {
    pub name: String,
    pub color: Option<String>,
    pub rules: Vec<FocusProfileRuleInput>,
    pub schedules: Vec<FocusProfileScheduleInput>,
}

pub struct FocusProfileRuleInput {
    pub action: RuleAction,
    pub target: RuleTargetDto,
}

pub struct FocusProfileScheduleInput {
    pub mode: ScheduleMode,
    pub days: Vec<i32>,
    pub start_time: String,
    pub end_time: String,
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

#[derive(Debug, FromRow)]
pub struct FocusProfileScheduleRow {
    pub id: i64,
    pub mode: String,
    pub days: String,
    pub start_time: String,
    pub end_time: String,
}

pub struct FocusProfileWithRelations {
    pub profile: FocusProfileRow,
    pub rules: Vec<FocusProfileRuleRow>,
    pub schedules: Vec<FocusProfileScheduleRow>,
}
