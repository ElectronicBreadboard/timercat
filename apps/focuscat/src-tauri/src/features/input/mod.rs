pub mod runner;
pub mod types;

use tauri::App;

pub fn setup(app: &App) {
    runner::InputRunner::start(app.handle().clone());
}
