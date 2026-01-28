use sqlx::{Row, SqlitePool};

// MARK: - Tag Repository

pub struct TagRepository;

impl TagRepository {
    pub async fn create(
        pool: &SqlitePool,
        name: &str,
        color: Option<&str>,
    ) -> Result<TagRow, sqlx::Error> {
        let row = sqlx::query(
            r#"
            INSERT INTO tag (name, color)
            VALUES (?, ?)
            RETURNING id, name, color, created_at
            "#,
        )
        .bind(name)
        .bind(color)
        .fetch_one(pool)
        .await?;

        return Ok(TagRow {
            id: row.get("id"),
            name: row.get("name"),
            color: row.get("color"),
            created_at: row.get("created_at"),
        });
    }

    pub async fn update(
        pool: &SqlitePool,
        id: i64,
        name: &str,
        color: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE tag SET name = ?, color = ? WHERE id = ?")
            .bind(name)
            .bind(color)
            .bind(id)
            .execute(pool)
            .await?;

        return Ok(());
    }

    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM tag WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        return Ok(());
    }

    pub async fn get_by_id(pool: &SqlitePool, id: i64) -> Result<Option<TagRow>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT id, name, color, created_at
            FROM tag
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        return Ok(row.map(|r| TagRow {
            id: r.get("id"),
            name: r.get("name"),
            color: r.get("color"),
            created_at: r.get("created_at"),
        }));
    }

    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<TagRow>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, color, created_at
            FROM tag
            ORDER BY name ASC
            "#,
        )
        .fetch_all(pool)
        .await?;

        let tags = rows
            .into_iter()
            .map(|row| TagRow {
                id: row.get("id"),
                name: row.get("name"),
                color: row.get("color"),
                created_at: row.get("created_at"),
            })
            .collect();

        return Ok(tags);
    }
}

pub struct TagRow {
    pub id: i64,
    pub name: String,
    pub color: Option<String>,
    pub created_at: i64,
}

// MARK: - Restriction Repository

pub struct RestrictionRepository;

impl RestrictionRepository {
    pub async fn create(
        pool: &SqlitePool,
        input: &CreateRestrictionInput,
    ) -> Result<RestrictionRow, sqlx::Error> {
        let row = sqlx::query(
            r#"
            INSERT INTO tag_restriction (tag_id, action, app_id, website_id)
            VALUES (?, ?, ?, ?)
            RETURNING id
            "#,
        )
        .bind(input.tag_id)
        .bind(&input.action)
        .bind(input.app_id)
        .bind(input.website_id)
        .fetch_one(pool)
        .await?;

        let id: i64 = row.get("id");

        // Fetch with joined app/website info
        return Self::get_by_id(pool, id)
            .await?
            .ok_or_else(|| sqlx::Error::RowNotFound);
    }

    pub async fn get_by_id(
        pool: &SqlitePool,
        id: i64,
    ) -> Result<Option<RestrictionRow>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT
                r.id, r.tag_id, r.action,
                r.app_id, a.bundle_id as app_bundle_id, a.name as app_name, a.icon as app_icon,
                r.website_id, w.domain as website_domain, w.name as website_name, w.icon as website_icon
            FROM tag_restriction r
            LEFT JOIN app a ON a.id = r.app_id
            LEFT JOIN website w ON w.id = r.website_id
            WHERE r.id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        return Ok(row.map(|r| RestrictionRow {
            id: r.get("id"),
            tag_id: r.get("tag_id"),
            action: r.get("action"),
            app_id: r.get("app_id"),
            app_bundle_id: r.get("app_bundle_id"),
            app_name: r.get("app_name"),
            app_icon: r.get("app_icon"),
            website_id: r.get("website_id"),
            website_domain: r.get("website_domain"),
            website_name: r.get("website_name"),
            website_icon: r.get("website_icon"),
        }));
    }

    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM tag_restriction WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        return Ok(());
    }

    pub async fn get_by_tag(
        pool: &SqlitePool,
        tag_id: i64,
    ) -> Result<Vec<RestrictionRow>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT
                r.id, r.tag_id, r.action,
                r.app_id, a.bundle_id as app_bundle_id, a.name as app_name, a.icon as app_icon,
                r.website_id, w.domain as website_domain, w.name as website_name, w.icon as website_icon
            FROM tag_restriction r
            LEFT JOIN app a ON a.id = r.app_id
            LEFT JOIN website w ON w.id = r.website_id
            WHERE r.tag_id = ?
            ORDER BY r.created_at ASC
            "#,
        )
        .bind(tag_id)
        .fetch_all(pool)
        .await?;

        let restrictions = rows
            .into_iter()
            .map(|r| RestrictionRow {
                id: r.get("id"),
                tag_id: r.get("tag_id"),
                action: r.get("action"),
                app_id: r.get("app_id"),
                app_bundle_id: r.get("app_bundle_id"),
                app_name: r.get("app_name"),
                app_icon: r.get("app_icon"),
                website_id: r.get("website_id"),
                website_domain: r.get("website_domain"),
                website_name: r.get("website_name"),
                website_icon: r.get("website_icon"),
            })
            .collect();

        return Ok(restrictions);
    }
}

pub struct CreateRestrictionInput {
    pub tag_id: i64,
    pub action: String,
    pub app_id: Option<i64>,
    pub website_id: Option<i64>,
}

pub struct RestrictionRow {
    pub id: i64,
    pub tag_id: i64,
    pub action: String,
    pub app_id: Option<i64>,
    pub app_bundle_id: Option<String>,
    pub app_name: Option<String>,
    pub app_icon: Option<String>,
    pub website_id: Option<i64>,
    pub website_domain: Option<String>,
    pub website_name: Option<String>,
    pub website_icon: Option<String>,
}

// MARK: - Schedule Repository

pub struct ScheduleRepository;

impl ScheduleRepository {
    pub async fn create(
        pool: &SqlitePool,
        name: &str,
        days: &str,
        start_time: &str,
        end_time: &str,
    ) -> Result<ScheduleRow, sqlx::Error> {
        let row = sqlx::query(
            r#"
            INSERT INTO schedule (name, days, start_time, end_time)
            VALUES (?, ?, ?, ?)
            RETURNING id, name, days, start_time, end_time, created_at
            "#,
        )
        .bind(name)
        .bind(days)
        .bind(start_time)
        .bind(end_time)
        .fetch_one(pool)
        .await?;

        return Ok(ScheduleRow {
            id: row.get("id"),
            name: row.get("name"),
            days: row.get("days"),
            start_time: row.get("start_time"),
            end_time: row.get("end_time"),
            created_at: row.get("created_at"),
        });
    }

    pub async fn update(
        pool: &SqlitePool,
        id: i64,
        name: &str,
        days: &str,
        start_time: &str,
        end_time: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE schedule SET name = ?, days = ?, start_time = ?, end_time = ? WHERE id = ?",
        )
        .bind(name)
        .bind(days)
        .bind(start_time)
        .bind(end_time)
        .bind(id)
        .execute(pool)
        .await?;

        return Ok(());
    }

    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM schedule WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        return Ok(());
    }

    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<ScheduleRow>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, days, start_time, end_time, created_at
            FROM schedule
            ORDER BY name ASC
            "#,
        )
        .fetch_all(pool)
        .await?;

        let schedules = rows
            .into_iter()
            .map(|row| ScheduleRow {
                id: row.get("id"),
                name: row.get("name"),
                days: row.get("days"),
                start_time: row.get("start_time"),
                end_time: row.get("end_time"),
                created_at: row.get("created_at"),
            })
            .collect();

        return Ok(schedules);
    }
}

pub struct ScheduleRow {
    pub id: i64,
    pub name: String,
    pub days: String,
    pub start_time: String,
    pub end_time: String,
    pub created_at: i64,
}

// MARK: - Schedule Tag Repository

pub struct ScheduleTagRepository;

impl ScheduleTagRepository {
    pub async fn add(pool: &SqlitePool, schedule_id: i64, tag_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT OR IGNORE INTO schedule_tag (schedule_id, tag_id)
            VALUES (?, ?)
            "#,
        )
        .bind(schedule_id)
        .bind(tag_id)
        .execute(pool)
        .await?;

        return Ok(());
    }

    pub async fn remove(
        pool: &SqlitePool,
        schedule_id: i64,
        tag_id: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM schedule_tag WHERE schedule_id = ? AND tag_id = ?")
            .bind(schedule_id)
            .bind(tag_id)
            .execute(pool)
            .await?;

        return Ok(());
    }

    pub async fn get_tags_for_schedule(
        pool: &SqlitePool,
        schedule_id: i64,
    ) -> Result<Vec<i64>, sqlx::Error> {
        let rows = sqlx::query("SELECT tag_id FROM schedule_tag WHERE schedule_id = ?")
            .bind(schedule_id)
            .fetch_all(pool)
            .await?;

        return Ok(rows.into_iter().map(|r| r.get("tag_id")).collect());
    }

    pub async fn get_schedules_for_tag(
        pool: &SqlitePool,
        tag_id: i64,
    ) -> Result<Vec<i64>, sqlx::Error> {
        let rows = sqlx::query("SELECT schedule_id FROM schedule_tag WHERE tag_id = ?")
            .bind(tag_id)
            .fetch_all(pool)
            .await?;

        return Ok(rows.into_iter().map(|r| r.get("schedule_id")).collect());
    }
}
