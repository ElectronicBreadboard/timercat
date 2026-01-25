mod apps;
pub mod commands;
mod config;
mod domain;
mod icon;
mod matcher;
pub mod types;

use tauri::{App, Manager};
use types::AppSearchState;

pub fn setup(app: &App) {
    app.manage(AppSearchState::init(app));
}
