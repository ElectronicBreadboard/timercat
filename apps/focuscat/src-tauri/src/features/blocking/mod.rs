pub mod checker;
pub mod config;
pub mod types;

use crate::environment::db::DatabaseState;
use crate::features::focus_profile::types::ProfileChangedEvent;
use crate::features::session::types::SessionChangedEvent;
use checker::BlockingChecker;
use config::BlockingConfig;
use std::sync::Arc;
use tauri::{App, Manager};
use tauri_specta::Event;
use tokio::sync::Notify;
use types::BlockingCheckerState;

pub fn setup(app: &App) {
    app.manage(BlockingCheckerState::new());

    let notify = Arc::new(Notify::new());

    // Listen for domain events and trigger refresh
    let notify_session = notify.clone();
    SessionChangedEvent::listen(app, move |_| {
        notify_session.notify_one();
    });
    let notify_profile = notify.clone();
    ProfileChangedEvent::listen(app, move |_| {
        notify_profile.notify_one();
    });

    // Background task: refreshes on event or schedule poll timeout
    let handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        loop {
            if let Some(db) = handle.try_state::<DatabaseState>() {
                let checker = BlockingChecker::refresh(&db.pool).await;
                if let Some(state) = handle.try_state::<BlockingCheckerState>() {
                    *state.lock().unwrap() = checker;
                }
            }

            tokio::select! {
                _ = notify.notified() => {}
                _ = tokio::time::sleep(std::time::Duration::from_secs(BlockingConfig::schedule_poll_interval_secs())) => {}
            }
        }
    });
}
