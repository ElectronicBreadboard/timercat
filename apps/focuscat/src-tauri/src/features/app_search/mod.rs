mod app;
pub mod commands;
mod matcher;
pub mod types;
mod website;

use tauri::{App, Manager};
use types::AppSearchState;

pub fn setup(app: &App) {
    app.manage(AppSearchState::init(app));
}
