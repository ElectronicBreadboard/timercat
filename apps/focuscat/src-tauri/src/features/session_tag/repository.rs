use super::types::{SessionTag, SessionTagRule, SessionTagWithRules};
use sqlx::{Row, SqlitePool};

// MARK: - Session Tag Repository

pub struct SessionTagRepository;

impl SessionTagRepository {
    /// Get all session tags.
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<SessionTag>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, color
            FROM session_tags
            ORDER BY id ASC
            "#,
        )
        .fetch_all(pool)
        .await?;

        let tags = rows
            .iter()
            .map(|row| SessionTag {
                id: row.get("id"),
                name: row.get("name"),
                color: row.get("color"),
            })
            .collect();

        return Ok(tags);
    }

    /// Get a session tag by ID with its rules.
    pub async fn get_with_rules(
        pool: &SqlitePool,
        id: i32,
    ) -> Result<Option<SessionTagWithRules>, sqlx::Error> {
        let tag_row = sqlx::query(
            r#"
            SELECT id, name, color
            FROM session_tags
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        let tag_row = match tag_row {
            Some(row) => row,
            None => return Ok(None),
        };

        let rules = Self::get_rules_for_tag(pool, id).await?;

        return Ok(Some(SessionTagWithRules {
            id: tag_row.get("id"),
            name: tag_row.get("name"),
            color: tag_row.get("color"),
            rules,
        }));
    }

    /// Get rules for a specific tag.
    pub async fn get_rules_for_tag(
        pool: &SqlitePool,
        session_tag_id: i32,
    ) -> Result<Vec<SessionTagRule>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, session_tag_id, app_bundle_id, app_name
            FROM session_tag_rules
            WHERE session_tag_id = ?
            ORDER BY id ASC
            "#,
        )
        .bind(session_tag_id)
        .fetch_all(pool)
        .await?;

        let rules = rows
            .iter()
            .map(|row| SessionTagRule {
                id: row.get("id"),
                session_tag_id: row.get("session_tag_id"),
                app_bundle_id: row.get("app_bundle_id"),
                app_name: row.get("app_name"),
            })
            .collect();

        return Ok(rules);
    }

    /// Insert a new session tag.
    pub async fn insert(
        pool: &SqlitePool,
        input: &InsertSessionTagInput,
    ) -> Result<i32, sqlx::Error> {
        let result = sqlx::query(
            r#"
            INSERT INTO session_tags (name, color)
            VALUES (?, ?)
            RETURNING id
            "#,
        )
        .bind(&input.name)
        .bind(&input.color)
        .fetch_one(pool)
        .await?;

        let id: i32 = result.get("id");
        return Ok(id);
    }

    /// Update a session tag.
    pub async fn update(
        pool: &SqlitePool,
        id: i32,
        name: &str,
        color: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE session_tags
            SET name = ?, color = ?
            WHERE id = ?
            "#,
        )
        .bind(name)
        .bind(color)
        .bind(id)
        .execute(pool)
        .await?;

        return Ok(());
    }

    /// Delete a session tag.
    pub async fn delete(pool: &SqlitePool, id: i32) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM session_tags WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        return Ok(());
    }

    /// Add a rule to a session tag.
    pub async fn insert_rule(
        pool: &SqlitePool,
        input: &InsertSessionTagRuleInput,
    ) -> Result<i32, sqlx::Error> {
        let result = sqlx::query(
            r#"
            INSERT INTO session_tag_rules (session_tag_id, app_bundle_id, app_name)
            VALUES (?, ?, ?)
            RETURNING id
            "#,
        )
        .bind(input.session_tag_id)
        .bind(&input.app_bundle_id)
        .bind(&input.app_name)
        .fetch_one(pool)
        .await?;

        let id: i32 = result.get("id");
        return Ok(id);
    }

    /// Delete a rule from a session tag.
    pub async fn delete_rule(pool: &SqlitePool, rule_id: i32) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM session_tag_rules WHERE id = ?")
            .bind(rule_id)
            .execute(pool)
            .await?;

        return Ok(());
    }
}

pub struct InsertSessionTagInput {
    pub name: String,
    pub color: String,
}

pub struct InsertSessionTagRuleInput {
    pub session_tag_id: i32,
    pub app_bundle_id: String,
    pub app_name: Option<String>,
}
