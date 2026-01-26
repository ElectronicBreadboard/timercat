pub mod commands;
mod matcher;
mod search;
pub mod types;

use tauri::{App, Manager};
use types::AppSearchState;

pub fn setup(app: &App) {
    app.manage(AppSearchState::init());
}
