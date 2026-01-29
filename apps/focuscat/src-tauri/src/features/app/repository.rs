use sqlx::{Row, SqlitePool};

// MARK: - App Repository

pub struct AppRepository;

impl AppRepository {
    /// Upsert app (insert or return existing id).
    pub async fn upsert(pool: &SqlitePool, input: &UpsertAppInput) -> Result<i64, sqlx::Error> {
        // Try to find existing app by bundle_id
        if let Some(bundle_id) = &input.bundle_id {
            let existing: Option<(i64,)> = sqlx::query_as("SELECT id FROM app WHERE bundle_id = ?")
                .bind(bundle_id)
                .fetch_optional(pool)
                .await?;

            if let Some((id,)) = existing {
                return Ok(id);
            }
        }

        // Insert new app
        let result = sqlx::query(
            r#"
            INSERT INTO app (bundle_id, name, process_path, icon, color)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id
            "#,
        )
        .bind(&input.bundle_id)
        .bind(&input.name)
        .bind(&input.process_path)
        .bind(&input.icon)
        .bind(&input.color)
        .fetch_one(pool)
        .await?;

        return Ok(sqlx::Row::get(&result, 0));
    }
}

pub struct UpsertAppInput {
    pub bundle_id: Option<String>,
    pub name: Option<String>,
    pub process_path: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

// MARK: - Website Repository

pub struct WebsiteRepository;

impl WebsiteRepository {
    /// Upsert website (insert or return existing id).
    pub async fn upsert(pool: &SqlitePool, domain: &str) -> Result<i64, sqlx::Error> {
        let result = sqlx::query(
            r#"
            INSERT INTO website (domain) VALUES (?)
            ON CONFLICT(domain) DO UPDATE SET domain = domain
            RETURNING id
            "#,
        )
        .bind(domain)
        .fetch_one(pool)
        .await?;

        return Ok(result.get(0));
    }
}
