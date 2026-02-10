pub mod audio;
pub mod commands;
pub mod types;

use tauri::{App, Manager};
use types::AudioState;

pub fn setup(app: &App) {
    app.manage(AudioState::init(app));
}
