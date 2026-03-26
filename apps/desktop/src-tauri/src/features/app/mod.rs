mod bundle_id;
pub mod commands;
mod matcher;
pub mod repository;
mod search;
pub mod types;

use tauri::{App, Manager};
use types::AppSearchState;

pub fn setup(app: &App) {
    app.manage(AppSearchState::init());
}
