use sqlx::{Row, SqlitePool};

// MARK: - Tag Repository

pub struct TagRepository;

impl TagRepository {
    pub async fn create(
        pool: &SqlitePool,
        name: &str,
        schedule: Option<&str>,
    ) -> Result<TagRow, sqlx::Error> {
        let row = sqlx::query(
            r#"
            INSERT INTO tag (name, schedule)
            VALUES (?, ?)
            RETURNING id, name, schedule, created_at
            "#,
        )
        .bind(name)
        .bind(schedule)
        .fetch_one(pool)
        .await?;

        return Ok(TagRow {
            id: row.get("id"),
            name: row.get("name"),
            schedule: row.get("schedule"),
            created_at: row.get("created_at"),
        });
    }

    pub async fn update(
        pool: &SqlitePool,
        id: i64,
        name: &str,
        schedule: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE tag SET name = ?, schedule = ? WHERE id = ?")
            .bind(name)
            .bind(schedule)
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

    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<TagRow>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, schedule, created_at
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
                schedule: row.get("schedule"),
                created_at: row.get("created_at"),
            })
            .collect();

        return Ok(tags);
    }
}

pub struct TagRow {
    pub id: i64,
    pub name: String,
    pub schedule: Option<String>,
    pub created_at: i64,
}

// MARK: - Block Rule Repository

pub struct BlockRuleRepository;

impl BlockRuleRepository {
    pub async fn create(
        pool: &SqlitePool,
        input: &CreateBlockRuleInput,
    ) -> Result<BlockRuleRow, sqlx::Error> {
        let row = sqlx::query(
            r#"
            INSERT INTO block_rule (tag_id, rule_type, app_id, website_id)
            VALUES (?, ?, ?, ?)
            RETURNING id, tag_id, rule_type, app_id, website_id, created_at
            "#,
        )
        .bind(input.tag_id)
        .bind(&input.rule_type)
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

    /// Get a block rule by id with app/website info.
    pub async fn get_by_id(
        pool: &SqlitePool,
        id: i64,
    ) -> Result<Option<BlockRuleRow>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT
                br.id, br.tag_id, br.rule_type, br.created_at,
                br.app_id, a.bundle_id as app_bundle_id, a.name as app_name, a.icon as app_icon,
                br.website_id, w.domain as website_domain, w.name as website_name, w.icon as website_icon
            FROM block_rule br
            LEFT JOIN app a ON a.id = br.app_id
            LEFT JOIN website w ON w.id = br.website_id
            WHERE br.id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        return Ok(row.map(|r| BlockRuleRow {
            id: r.get("id"),
            tag_id: r.get("tag_id"),
            rule_type: r.get("rule_type"),
            app_id: r.get("app_id"),
            app_bundle_id: r.get("app_bundle_id"),
            app_name: r.get("app_name"),
            app_icon: r.get("app_icon"),
            website_id: r.get("website_id"),
            website_domain: r.get("website_domain"),
            website_name: r.get("website_name"),
            website_icon: r.get("website_icon"),
            created_at: r.get("created_at"),
        }));
    }

    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM block_rule WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        return Ok(());
    }

    pub async fn get_by_tag(
        pool: &SqlitePool,
        tag_id: i64,
    ) -> Result<Vec<BlockRuleRow>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT
                br.id, br.tag_id, br.rule_type, br.created_at,
                br.app_id, a.bundle_id as app_bundle_id, a.name as app_name, a.icon as app_icon,
                br.website_id, w.domain as website_domain, w.name as website_name, w.icon as website_icon
            FROM block_rule br
            LEFT JOIN app a ON a.id = br.app_id
            LEFT JOIN website w ON w.id = br.website_id
            WHERE br.tag_id = ?
            ORDER BY br.created_at ASC
            "#,
        )
        .bind(tag_id)
        .fetch_all(pool)
        .await?;

        let rules = rows
            .into_iter()
            .map(|r| BlockRuleRow {
                id: r.get("id"),
                tag_id: r.get("tag_id"),
                rule_type: r.get("rule_type"),
                app_id: r.get("app_id"),
                app_bundle_id: r.get("app_bundle_id"),
                app_name: r.get("app_name"),
                app_icon: r.get("app_icon"),
                website_id: r.get("website_id"),
                website_domain: r.get("website_domain"),
                website_name: r.get("website_name"),
                website_icon: r.get("website_icon"),
                created_at: r.get("created_at"),
            })
            .collect();

        return Ok(rules);
    }
}

pub struct CreateBlockRuleInput {
    pub tag_id: i64,
    pub rule_type: String,
    pub app_id: Option<i64>,
    pub website_id: Option<i64>,
}

pub struct BlockRuleRow {
    pub id: i64,
    pub tag_id: i64,
    pub rule_type: String,
    pub app_id: Option<i64>,
    pub app_bundle_id: Option<String>,
    pub app_name: Option<String>,
    pub app_icon: Option<String>,
    pub website_id: Option<i64>,
    pub website_domain: Option<String>,
    pub website_name: Option<String>,
    pub website_icon: Option<String>,
    #[allow(dead_code)]
    pub created_at: i64,
}
