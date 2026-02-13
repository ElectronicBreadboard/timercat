use crate::common::path::get_app_data_dir;
use crate::environment::configs::db::DbConfig;
use sqlx::{sqlite::SqlitePool, Pool, Sqlite};
use std::ops::Deref;
use tauri::{App, Manager};

// MARK: - Setup

pub fn setup(app: &App) {
    app.manage(DatabaseState::init(app));
}

// MARK: - Database

pub struct Database {
    pub pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new(app: &App) -> Result<Self, Box<dyn std::error::Error>> {
        let data_dir_path = get_app_data_dir(app);
        let db_path = data_dir_path.join(DbConfig::db_name());
        let connection_options = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

        let pool = SqlitePool::connect_with(connection_options).await?;

        // Embedded so the built app has migrations (no migration files on disk in prod)
        sqlx::migrate!("./migrations").run(&pool).await?;

        return Ok(Database { pool });
    }
}

// MARK: - State

pub struct DatabaseState(Database);

impl DatabaseState {
    pub fn init(app: &App) -> Self {
        let db = tauri::async_runtime::block_on(Database::new(app))
            .expect("Failed to initialize database");
        return Self(db);
    }
}

impl Deref for DatabaseState {
    type Target = Database;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}
