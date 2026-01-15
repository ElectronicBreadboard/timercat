use super::repository::{
    AppActivityRepository, AppRepository, InsertAppActivityInput, InsertWindowActivityInput,
    UpsertAppInput, WindowActivityRepository,
};
use super::types::{ActiveApp, ActiveWindow};
use crate::environment::db::DatabaseState;
use chrono::Utc;
use mado::{WindowEvent, WindowListener, WindowMonitor};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex as TokioMutex;

// MARK: - Start Monitoring

pub fn start_monitoring(app: AppHandle) {
    let handler = WindowMonitorHandler::new(app.clone());
    let monitor = WindowMonitor::new(handler);

    std::thread::spawn(move || {
        println!("[Window Monitor] Started");

        if let Err(e) = monitor.run() {
            eprintln!("[Window Monitor] ERROR: {}", e);
        }
    });
}

// MARK: - Window Monitor Handler

struct WindowMonitorHandler {
    app: AppHandle,
    active_app: Arc<TokioMutex<Option<ActiveApp>>>,
    active_window: Arc<TokioMutex<Option<ActiveWindow>>>,
}

impl WindowMonitorHandler {
    fn new(app: AppHandle) -> Self {
        return Self {
            app,
            active_app: Arc::new(TokioMutex::new(None)),
            active_window: Arc::new(TokioMutex::new(None)),
        };
    }
}

impl WindowListener for WindowMonitorHandler {
    fn on_focus_change(&self, event: WindowEvent) {
        match event {
            WindowEvent::AppActivated { app: app_info } => {
                let app = self.app.clone();
                let active_app: Arc<TokioMutex<Option<ActiveApp>>> =
                    Arc::clone(&self.active_app);

                #[cfg(debug_assertions)]
                {
                    println!("\n[Window Monitor] 🔄 App Activated:\n{}", app_info);
                }

                tauri::async_runtime::spawn(async move {
                    let mut active_app_guard = active_app.lock().await;
                    let now = Utc::now().timestamp();

                    // Save previous app session if app changed
                    if let Some(prev_session) = active_app_guard.take() {
                        if prev_session.bundle_id != app_info.bundle_id {
                            if let Some(state) = app.try_state::<DatabaseState>() {
                                let _ = AppActivityRepository::insert(
                                    &state.pool,
                                    &InsertAppActivityInput {
                                        app_id: prev_session.app_id,
                                        started_at: prev_session.started_at,
                                        ended_at: now,
                                    },
                                )
                                .await;
                            }
                        } else {
                            // Same app reactivated, restore session
                            *active_app_guard = Some(prev_session);
                            return;
                        }
                    }

                    // Upsert new app info and start new app session
                    if let Some(state) = app.try_state::<DatabaseState>() {
                        if let Ok(app_id) = AppRepository::upsert(
                            &state.pool,
                            &UpsertAppInput {
                                bundle_id: app_info.bundle_id.clone(),
                                name: app_info.name,
                                process_path: app_info.process_path,
                            },
                        )
                        .await
                        {
                            *active_app_guard = Some(ActiveApp {
                                app_id,
                                bundle_id: app_info.bundle_id,
                                started_at: now,
                            });
                        }
                    }
                });
            }
            WindowEvent::WindowChanged {
                window: window_info,
            } => {
                let app = self.app.clone();
                let active_window: Arc<TokioMutex<Option<ActiveWindow>>> =
                    Arc::clone(&self.active_window);

                #[cfg(debug_assertions)]
                {
                    println!("\n[Window Monitor] 🪟 Window Changed:\n{}", window_info);
                }

                tauri::async_runtime::spawn(async move {
                    let mut active_window_guard = active_window.lock().await;
                    let now = Utc::now().timestamp();

                    // Save previous window session if window changed
                    if let Some(prev_session) = active_window_guard.take() {
                        if prev_session.bundle_id != window_info.app.bundle_id
                            || prev_session.window_title != window_info.title
                        {
                            if let Some(state) = app.try_state::<DatabaseState>() {
                                let _ = WindowActivityRepository::insert(
                                    &state.pool,
                                    &InsertWindowActivityInput {
                                        app_id: prev_session.app_id,
                                        window_title: prev_session.window_title,
                                        window_id: prev_session.window_id,
                                        window_x: prev_session.window_x,
                                        window_y: prev_session.window_y,
                                        window_width: prev_session.window_width,
                                        window_height: prev_session.window_height,
                                        browser_url: prev_session.browser_url,
                                        browser_is_private: prev_session.browser_is_private,
                                        started_at: prev_session.started_at,
                                        ended_at: now,
                                    },
                                )
                                .await;
                            }
                        } else {
                            // Same window, restore session
                            *active_window_guard = Some(prev_session);
                            return;
                        }
                    }

                    // Extract browser info
                    let (browser_url, browser_is_private) = window_info
                        .browser
                        .as_ref()
                        .map(|b| (b.url.clone(), b.is_private))
                        .unwrap_or((None, None));

                    // Extract bounds
                    let (window_x, window_y, window_width, window_height) = window_info
                        .bounds
                        .as_ref()
                        .map(|b| (Some(b.x), Some(b.y), Some(b.width), Some(b.height)))
                        .unwrap_or((None, None, None, None));

                    // Upsert new app info and start new window session
                    if let Some(state) = app.try_state::<DatabaseState>() {
                        if let Ok(app_id) = AppRepository::upsert(
                            &state.pool,
                            &UpsertAppInput {
                                bundle_id: window_info.app.bundle_id.clone(),
                                name: window_info.app.name,
                                process_path: window_info.app.process_path,
                            },
                        )
                        .await
                        {
                            *active_window_guard = Some(ActiveWindow {
                                app_id,
                                bundle_id: window_info.app.bundle_id,
                                window_title: window_info.title,
                                window_id: window_info.window_id,
                                window_x,
                                window_y,
                                window_width,
                                window_height,
                                browser_url,
                                browser_is_private,
                                started_at: now,
                            });
                        }
                    }
                });
            }
        }
    }
}
