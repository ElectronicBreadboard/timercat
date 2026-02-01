pub mod blocker;
pub mod commands;
pub mod config;
pub mod types;

use crate::environment::db::DatabaseState;
use crate::features::focus_profile::repository::FocusProfileRepository;
use crate::features::focus_profile::types::ProfileChangedEvent;
use crate::features::session::types::SessionChangedEvent;
use crate::features::settings::types::{AppSettingsChangedEvent, AppSettingsState};
use config::BlockingConfig;
use std::sync::Arc;
use tauri::{App, Manager};
use tauri_specta::Event;
use tokio::sync::Notify;
use types::BlockerState;

pub fn setup(app: &App) {
    app.manage(BlockerState::new());

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
    let notify_settings = notify.clone();
    AppSettingsChangedEvent::listen(app, move |_| {
        notify_settings.notify_one();
    });

    // Background task: refreshes on event or schedule poll timeout
    let handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        let mut was_disabled = false;
        loop {
            // Check if profiles feature is enabled
            let profiles_enabled = handle
                .try_state::<AppSettingsState>()
                .map(|state| state.lock().unwrap().features.profiles)
                .unwrap_or(false);

            if profiles_enabled {
                was_disabled = false;
                if let Some(db) = handle.try_state::<DatabaseState>() {
                    let profiles = FocusProfileRepository::get_active(&db.pool).await;
                    if let (Ok(profiles), Some(state)) =
                        (profiles, handle.try_state::<BlockerState>())
                    {
                        state.lock().unwrap().set_profiles(profiles);
                    }
                }
            } else if !was_disabled {
                was_disabled = true;
                if let Some(state) = handle.try_state::<BlockerState>() {
                    state.lock().unwrap().set_profiles(vec![]);
                }
            }

            tokio::select! {
                _ = notify.notified() => {}
                _ = tokio::time::sleep(std::time::Duration::from_secs(BlockingConfig::schedule_poll_interval_secs())) => {}
            }
        }
    });
}
