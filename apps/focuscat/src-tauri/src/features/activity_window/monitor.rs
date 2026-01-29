use super::repository::{
    AppActivityRepository, InsertAppActivityInput, InsertWindowActivityInput,
    WindowActivityRepository,
};
use crate::common::url::extract_domain;
use crate::environment::db::DatabaseState;
use crate::features::app::repository::{AppRepository, UpsertAppInput, WebsiteRepository};
use crate::features::settings::types::AppSettingsState;
use chrono::Utc;
use mado::{MonitorConfig, WindowEvent, WindowListener, WindowMonitor};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex as TokioMutex;

// MARK: - Start Monitoring

pub fn start_monitoring(app: AppHandle) {
    let handler = WindowMonitorHandler::new(app.clone());
    let monitor = WindowMonitor::with_config(
        handler,
        MonitorConfig {
            include_app_icon: true,
            include_browser_info: true,
            include_website_info: false,
            track_window_changes: true,
        },
    );

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

    fn is_tracking_enabled(&self) -> bool {
        self.app
            .try_state::<AppSettingsState>()
            .map(|state| state.lock().unwrap().activity.enabled)
            .unwrap_or(false)
    }

    fn is_window_tracking_enabled(&self) -> bool {
        self.app
            .try_state::<AppSettingsState>()
            .map(|state| {
                let settings = state.lock().unwrap();
                settings.activity.enabled && settings.activity.track_windows
            })
            .unwrap_or(false)
    }

    fn is_browser_tracking_enabled(&self) -> bool {
        self.app
            .try_state::<AppSettingsState>()
            .map(|state| {
                let settings = state.lock().unwrap();
                settings.activity.enabled && settings.activity.track_browser
            })
            .unwrap_or(false)
    }
}

impl WindowListener for WindowMonitorHandler {
    fn on_focus_change(&self, event: WindowEvent) {
        match event {
            WindowEvent::AppActivated { app: app_info } => {
                if !self.is_tracking_enabled() {
                    return;
                }

                let app = self.app.clone();
                let active_app: Arc<TokioMutex<Option<ActiveApp>>> = Arc::clone(&self.active_app);

                #[cfg(debug_assertions)]
                {
                    println!("\n[Window Monitor] 🔄 App Activated:\n{}", app_info);
                }

                tauri::async_runtime::spawn(async move {
                    let mut active_app_guard = active_app.lock().await;
                    let now = Utc::now().timestamp_millis();

                    // Save previous active app if app changed
                    if let Some(prev) = active_app_guard.take() {
                        if prev.bundle_id != app_info.bundle_id {
                            if let Some(state) = app.try_state::<DatabaseState>() {
                                let _ = AppActivityRepository::insert(
                                    &state.pool,
                                    &InsertAppActivityInput {
                                        app_id: prev.app_id,
                                        started_at: prev.started_at,
                                        ended_at: now,
                                    },
                                )
                                .await;
                            }
                        } else {
                            // Same app reactivated, restore
                            *active_app_guard = Some(prev);
                            return;
                        }
                    }

                    // Upsert new app and start tracking
                    if let Some(state) = app.try_state::<DatabaseState>() {
                        if let Ok(app_id) = AppRepository::upsert(
                            &state.pool,
                            &UpsertAppInput {
                                bundle_id: app_info.bundle_id.clone(),
                                name: app_info.name,
                                process_path: app_info.process_path,
                                icon: app_info.icon.as_ref().and_then(|i| i.data_url.clone()),
                                color: app_info.icon.as_ref().and_then(|i| i.color.clone()),
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
                if !self.is_window_tracking_enabled() {
                    return;
                }

                let app = self.app.clone();
                let active_window: Arc<TokioMutex<Option<ActiveWindow>>> =
                    Arc::clone(&self.active_window);
                let track_browser_urls = self.is_browser_tracking_enabled();

                #[cfg(debug_assertions)]
                {
                    println!("\n[Window Monitor] 🪟 Window Changed:\n{}", window_info);
                }

                tauri::async_runtime::spawn(async move {
                    let mut active_window_guard = active_window.lock().await;
                    let now = Utc::now().timestamp_millis();

                    // Save previous active window if window changed
                    if let Some(prev) = active_window_guard.take() {
                        if prev.bundle_id != window_info.app.bundle_id
                            || prev.window_title != window_info.title
                        {
                            if let Some(state) = app.try_state::<DatabaseState>() {
                                let _ = WindowActivityRepository::insert(
                                    &state.pool,
                                    &InsertWindowActivityInput {
                                        app_id: prev.app_id,
                                        website_id: prev.website_id,
                                        window_title: prev.window_title,
                                        window_id: prev.window_id,
                                        window_x: prev.window_x,
                                        window_y: prev.window_y,
                                        window_width: prev.window_width,
                                        window_height: prev.window_height,
                                        browser_url: prev.browser_url,
                                        browser_is_private: prev.browser_is_private,
                                        started_at: prev.started_at,
                                        ended_at: now,
                                    },
                                )
                                .await;
                            }
                        } else {
                            // Same window, restore
                            *active_window_guard = Some(prev);
                            return;
                        }
                    }

                    // Extract browser info (only if tracking is enabled)
                    let (browser_url, browser_is_private) = if track_browser_urls {
                        window_info
                            .browser
                            .as_ref()
                            .map(|b| (b.url.clone(), b.is_private))
                            .unwrap_or((None, None))
                    } else {
                        (None, None)
                    };

                    // Extract bounds
                    let (window_x, window_y, window_width, window_height) = window_info
                        .bounds
                        .as_ref()
                        .map(|b| (Some(b.x), Some(b.y), Some(b.width), Some(b.height)))
                        .unwrap_or((None, None, None, None));

                    // Upsert new app and start tracking window
                    if let Some(state) = app.try_state::<DatabaseState>() {
                        if let Ok(app_id) = AppRepository::upsert(
                            &state.pool,
                            &UpsertAppInput {
                                bundle_id: window_info.app.bundle_id.clone(),
                                name: window_info.app.name,
                                process_path: window_info.app.process_path,
                                icon: window_info
                                    .app
                                    .icon
                                    .as_ref()
                                    .and_then(|i| i.data_url.clone()),
                                color: window_info.app.icon.as_ref().and_then(|i| i.color.clone()),
                            },
                        )
                        .await
                        {
                            // Extract website_id for browser activities
                            let website_id = if let Some(ref url) = browser_url {
                                if let Some(domain) = extract_domain(url) {
                                    WebsiteRepository::upsert(&state.pool, &domain).await.ok()
                                } else {
                                    None
                                }
                            } else {
                                None
                            };

                            *active_window_guard = Some(ActiveWindow {
                                app_id,
                                website_id,
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

/// Tracks currently active app (in-memory, pending write to DB on change).
pub struct ActiveApp {
    pub app_id: i64,
    pub bundle_id: Option<String>,
    pub started_at: i64,
}

/// Tracks currently active window (in-memory, pending write to DB on change).
pub struct ActiveWindow {
    pub app_id: i64,
    pub website_id: Option<i64>,
    pub bundle_id: Option<String>,
    // Window fields
    pub window_title: Option<String>,
    pub window_id: Option<u32>,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_width: Option<f64>,
    pub window_height: Option<f64>,
    // Browser fields
    pub browser_url: Option<String>,
    pub browser_is_private: Option<bool>,
    // Timestamps
    pub started_at: i64,
}
