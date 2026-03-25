pub mod commands;
pub mod repository;
pub mod resolution;
pub mod types;

use crate::{
    environment::db::DatabaseState,
    features::{
        focus_profile::types::FocusProfileState,
        session::types::SessionChangedEvent,
        settings::types::{AppSettingsChangedEvent, AppSettingsState},
        timer::types::TimerState,
    },
};
use repository::{FocusProfileRepository, FocusProfileWithRelations};
use resolution::to_resolution_profiles;
use std::sync::Arc;
use tauri::{App, Manager};
use tauri_specta::Event;
use tokio::sync::Notify;
use types::{FocusSessionType, ProfileChangedEvent};

pub fn setup(app: &App) {
    app.manage(FocusProfileState::new());

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
            let profiles_enabled = handle
                .try_state::<AppSettingsState>()
                .map(|state| state.lock().unwrap().features.profiles)
                .unwrap_or(false);

            if profiles_enabled {
                was_disabled = false;
                if let Some(db) = handle.try_state::<DatabaseState>() {
                    let session_type = handle.try_state::<TimerState>().and_then(|state| {
                        state
                            .lock()
                            .unwrap()
                            .session
                            .as_ref()
                            .map(|s| FocusSessionType::from(&s.session_type))
                    });
                    if let Ok(db_profiles) =
                        FocusProfileRepository::get_active(&db.pool, session_type.as_ref()).await
                    {
                        let refs: Vec<(&FocusProfileWithRelations, i64)> =
                            db_profiles.iter().map(|(p, pri)| (p, *pri)).collect();
                        let profiles = to_resolution_profiles(&refs);
                        if let Some(state) = handle.try_state::<FocusProfileState>() {
                            state.lock().unwrap().active_profiles = profiles;
                        }
                    }
                }
            } else if !was_disabled {
                was_disabled = true;
                if let Some(state) = handle.try_state::<FocusProfileState>() {
                    state.lock().unwrap().active_profiles.clear();
                }
            }

            tokio::select! {
                _ = notify.notified() => {}
                _ = tokio::time::sleep(std::time::Duration::from_secs(60)) => {}
            }
        }
    });
}
