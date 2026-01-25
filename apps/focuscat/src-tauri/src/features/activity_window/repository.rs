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

// MARK: - App Activity Repository

pub struct AppActivityRepository;

impl AppActivityRepository {
    /// Insert an app activity.
    pub async fn insert(
        pool: &SqlitePool,
        input: &InsertAppActivityInput,
    ) -> Result<i64, sqlx::Error> {
        let result = sqlx::query(
            r#"
            INSERT INTO activity_app (app_id, started_at, ended_at)
            VALUES (?, ?, ?)
            RETURNING id
            "#,
        )
        .bind(input.app_id)
        .bind(input.started_at)
        .bind(input.ended_at)
        .fetch_one(pool)
        .await?;

        return Ok(sqlx::Row::get(&result, 0));
    }
}

pub struct InsertAppActivityInput {
    pub app_id: i64,
    pub started_at: i64,
    pub ended_at: i64,
}

pub struct InsertWindowActivityInput {
    pub app_id: i64,
    pub website_id: Option<i64>,
    // Window fields
    pub window_title: Option<String>,
    pub window_id: Option<u32>,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_width: Option<f64>,
    pub window_height: Option<f64>,
    // Browser fields
    pub browser_url: Option<String>,
    pub browser_is_private: Option<bool>,
    // Timestamps
    pub started_at: i64,
    pub ended_at: i64,
}

// MARK: - Window Activity Repository

pub struct WindowActivityRepository;

impl WindowActivityRepository {
    /// Insert a window activity.
    pub async fn insert(
        pool: &SqlitePool,
        input: &InsertWindowActivityInput,
    ) -> Result<i64, sqlx::Error> {
        let result = sqlx::query(
            r#"
            INSERT INTO activity_window (
                app_id, website_id,
                window_title, window_id, window_x, window_y, window_width, window_height,
                browser_url, browser_is_private,
                started_at, ended_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            "#,
        )
        .bind(input.app_id)
        .bind(input.website_id)
        .bind(&input.window_title)
        .bind(input.window_id.map(|id| id as i64))
        .bind(input.window_x)
        .bind(input.window_y)
        .bind(input.window_width)
        .bind(input.window_height)
        .bind(&input.browser_url)
        .bind(input.browser_is_private)
        .bind(input.started_at)
        .bind(input.ended_at)
        .fetch_one(pool)
        .await?;

        return Ok(sqlx::Row::get(&result, 0));
    }

    /// Get window activities that overlap with a time range.
    pub async fn get(
        pool: &SqlitePool,
        input: &GetWindowActivitiesInput,
    ) -> Result<Vec<WindowActivityRow>, sqlx::Error> {
        let limit = input.limit.unwrap_or(1000);

        // Fetch activities that overlap with the time range:
        // Activity started before range ends AND activity ended after range starts
        let rows = sqlx::query(
            r#"
            SELECT
                a.bundle_id as app_bundle_id,
                a.name as app_name,
                a.icon as app_icon,
                a.color as app_color,
                w.domain as website_domain,
                w.name as website_name,
                w.icon as website_icon,
                w.color as website_color,
                aw.window_title,
                aw.browser_url,
                aw.started_at,
                aw.ended_at
            FROM activity_window aw
            JOIN app a ON a.id = aw.app_id
            LEFT JOIN website w ON w.id = aw.website_id
            WHERE aw.started_at < ? AND aw.ended_at > ?
            ORDER BY aw.started_at DESC
            LIMIT ?
            "#,
        )
        .bind(input.started_before)
        .bind(input.started_after)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        let activities = rows
            .into_iter()
            .map(|row| WindowActivityRow {
                app_bundle_id: row.get("app_bundle_id"),
                app_name: row.get("app_name"),
                app_icon: row.get("app_icon"),
                app_color: row.get("app_color"),
                website_domain: row.get("website_domain"),
                website_name: row.get("website_name"),
                website_icon: row.get("website_icon"),
                website_color: row.get("website_color"),
                window_title: row.get("window_title"),
                browser_url: row.get("browser_url"),
                started_at: row.get("started_at"),
                ended_at: row.get("ended_at"),
            })
            .collect();

        return Ok(activities);
    }
}

pub struct GetWindowActivitiesInput {
    pub started_after: i64,
    pub started_before: i64,
    pub limit: Option<i64>,
}

pub struct WindowActivityRow {
    pub app_bundle_id: Option<String>,
    pub app_name: Option<String>,
    pub app_icon: Option<String>,
    pub app_color: Option<String>,
    pub website_domain: Option<String>,
    pub website_name: Option<String>,
    pub website_icon: Option<String>,
    pub website_color: Option<String>,
    pub window_title: Option<String>,
    pub browser_url: Option<String>,
    pub started_at: i64,
    pub ended_at: i64,
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
