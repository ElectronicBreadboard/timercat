pub mod runner;
pub mod types;

use tauri::App;

pub fn setup(app: &App) {
    #[cfg(not(feature = "app-store"))]
    runner::InputRunner::start(app.handle().clone());
}
