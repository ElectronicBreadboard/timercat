pub mod commands;
mod monitor;
pub mod repository;
pub mod types;

use tauri::App;

pub fn setup(app: &App) {
    monitor::start_monitoring(app.handle().clone());
}
