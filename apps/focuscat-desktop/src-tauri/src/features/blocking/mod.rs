pub mod blocker;
pub mod commands;
pub mod config;
pub mod types;

use tauri::{App, Manager};
use types::BlockerState;

pub fn setup(app: &App) {
    app.manage(BlockerState::new(app.handle().clone()));
}
