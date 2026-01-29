use crate::features::restriction::repository::RestrictionSetRepository;
use crate::features::restriction::types::RestrictionSet;
use sqlx::{Row, SqlitePool};

// MARK: - Tag Repository

pub struct TagRepository;

impl TagRepository {
    /// Create new tag with optional restrictions.
    pub async fn create(pool: &SqlitePool, input: &CreateTagInput) -> Result<TagRow, sqlx::Error> {
        // Create restriction set if provided
        let restriction_set_id = match &input.restrictions {
            Some(restrictions) if !restrictions.items.is_empty() => {
                Some(RestrictionSetRepository::create(pool, restrictions).await?)
            }
            _ => None,
        };

        let row = sqlx::query(
            r#"
            INSERT INTO tag (name, color, restriction_set_id)
            VALUES (?, ?, ?)
            RETURNING id, name, color, restriction_set_id, created_at
            "#,
        )
        .bind(&input.name)
        .bind(&input.color)
        .bind(restriction_set_id)
        .fetch_one(pool)
        .await?;

        return Ok(TagRow {
            id: row.get("id"),
            name: row.get("name"),
            color: row.get("color"),
            restriction_set_id: row.get("restriction_set_id"),
            created_at: row.get("created_at"),
        });
    }

    /// Update existing tag with optional restrictions.
    pub async fn update(
        pool: &SqlitePool,
        id: i64,
        input: &UpdateTagInput,
    ) -> Result<TagRow, sqlx::Error> {
        // Get existing restriction_set_id
        let existing_set_id: Option<i64> =
            sqlx::query_scalar("SELECT restriction_set_id FROM tag WHERE id = ?")
                .bind(id)
                .fetch_optional(pool)
                .await?
                .flatten();

        // Handle restrictions
        let new_set_id = match (&input.restrictions, existing_set_id) {
            (Some(restrictions), _) if restrictions.items.is_empty() => {
                if let Some(set_id) = existing_set_id {
                    RestrictionSetRepository::delete(pool, set_id).await?;
                }
                None
            }
            (Some(restrictions), Some(set_id)) => {
                RestrictionSetRepository::update(pool, set_id, restrictions).await?;
                Some(set_id)
            }
            (Some(restrictions), None) => {
                Some(RestrictionSetRepository::create(pool, restrictions).await?)
            }
            (None, Some(set_id)) => {
                RestrictionSetRepository::delete(pool, set_id).await?;
                None
            }
            (None, None) => None,
        };

        let row = sqlx::query(
            r#"
            UPDATE tag SET name = ?, color = ?, restriction_set_id = ?
            WHERE id = ?
            RETURNING id, name, color, restriction_set_id, created_at
            "#,
        )
        .bind(&input.name)
        .bind(&input.color)
        .bind(new_set_id)
        .bind(id)
        .fetch_one(pool)
        .await?;

        return Ok(TagRow {
            id: row.get("id"),
            name: row.get("name"),
            color: row.get("color"),
            restriction_set_id: row.get("restriction_set_id"),
            created_at: row.get("created_at"),
        });
    }

    /// Get tag by id with restrictions.
    pub async fn get(
        pool: &SqlitePool,
        id: i64,
    ) -> Result<Option<TagWithRestrictions>, sqlx::Error> {
        let row = sqlx::query(
            "SELECT id, name, color, restriction_set_id, created_at FROM tag WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };

        let tag = TagRow {
            id: row.get("id"),
            name: row.get("name"),
            color: row.get("color"),
            restriction_set_id: row.get("restriction_set_id"),
            created_at: row.get("created_at"),
        };

        let restrictions = match tag.restriction_set_id {
            Some(set_id) => RestrictionSetRepository::get(pool, set_id).await?,
            None => None,
        };

        return Ok(Some(TagWithRestrictions { tag, restrictions }));
    }

    /// Get all tags.
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<TagRow>, sqlx::Error> {
        let rows = sqlx::query(
            "SELECT id, name, color, restriction_set_id, created_at FROM tag ORDER BY name ASC",
        )
        .fetch_all(pool)
        .await?;

        let tags = rows
            .into_iter()
            .map(|row| TagRow {
                id: row.get("id"),
                name: row.get("name"),
                color: row.get("color"),
                restriction_set_id: row.get("restriction_set_id"),
                created_at: row.get("created_at"),
            })
            .collect();

        return Ok(tags);
    }

    /// Delete tag and its restrictions.
    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
        let set_id: Option<i64> =
            sqlx::query_scalar("SELECT restriction_set_id FROM tag WHERE id = ?")
                .bind(id)
                .fetch_optional(pool)
                .await?
                .flatten();

        if let Some(set_id) = set_id {
            RestrictionSetRepository::delete(pool, set_id).await?;
        }

        sqlx::query("DELETE FROM tag WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        return Ok(());
    }
}

// MARK: - Types

pub struct CreateTagInput {
    pub name: String,
    pub color: Option<String>,
    pub restrictions: Option<RestrictionSet>,
}

pub struct UpdateTagInput {
    pub name: String,
    pub color: Option<String>,
    pub restrictions: Option<RestrictionSet>,
}

pub struct TagRow {
    pub id: i64,
    pub name: String,
    pub color: Option<String>,
    pub restriction_set_id: Option<i64>,
    pub created_at: i64,
}

pub struct TagWithRestrictions {
    pub tag: TagRow,
    pub restrictions: Option<RestrictionSet>,
}
