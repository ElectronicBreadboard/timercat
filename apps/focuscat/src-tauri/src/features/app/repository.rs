use sqlx::Row;

// MARK: - App Repository

pub struct AppRepository;

impl AppRepository {
    /// Upsert app (insert or return existing id).
    pub async fn upsert<'e, E>(executor: E, input: &UpsertAppInput) -> Result<i64, sqlx::Error>
    where
        E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
    {
        let result = sqlx::query(
            r#"
            INSERT INTO app (bundle_id, name, process_path, icon, color)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(bundle_id) DO UPDATE SET bundle_id = bundle_id
            RETURNING id
            "#,
        )
        .bind(&input.bundle_id)
        .bind(&input.name)
        .bind(&input.process_path)
        .bind(&input.icon)
        .bind(&input.color)
        .fetch_one(executor)
        .await?;

        return Ok(result.get(0));
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
    pub async fn upsert<'e, E>(executor: E, domain: &str) -> Result<i64, sqlx::Error>
    where
        E: sqlx::Executor<'e, Database = sqlx::Sqlite>,
    {
        let result = sqlx::query(
            r#"
            INSERT INTO website (domain) VALUES (?)
            ON CONFLICT(domain) DO UPDATE SET domain = domain
            RETURNING id
            "#,
        )
        .bind(domain)
        .fetch_one(executor)
        .await?;

        return Ok(result.get(0));
    }
}
