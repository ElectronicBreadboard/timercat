pub mod commands;
pub mod modes;
pub mod runner;
pub mod timer;
pub mod types;

use std::sync::Mutex;
use tauri::{App, Manager};
use types::TimerState;

pub fn setup(app: &App) {
    app.manage(TimerState::init(app));
    app.manage(Mutex::new(None::<runner::TimerRunner>));
}
