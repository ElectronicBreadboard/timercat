mod commands;
pub mod tray;
pub mod window;

use std::sync::Mutex;

use crate::features::{
    input::{runner::InputRunner, types::InputDetectedEvent},
    settings::{
        self,
        types::{AppSettingsChangedEvent, AppSettingsState},
    },
    timer::{
        self,
        runner::TimerRunner,
        types::{Timer, TimerCompleteEvent, TimerConfig, TimerState, TimerTickEvent},
    },
};
use specta_typescript::Typescript;
use tauri::Manager;
use tauri_specta::{collect_commands, collect_events, Builder};

pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            // Window commands
            commands::show_main_window,
            commands::show_cat_window,
            commands::hide_main_window,
            commands::hide_cat_window,
            commands::quit_app,
            // Settings commands
            settings::commands::get_settings,
            settings::commands::set_settings,
            // Timer commands
            timer::commands::get_timer,
            timer::commands::start_timer,
            timer::commands::pause_timer,
            timer::commands::resume_timer,
            timer::commands::reset_timer,
            timer::commands::skip_timer,
            timer::commands::set_timer_duration,
            timer::commands::set_timer_category,
            timer::commands::cycle_timer_speed,
        ])
        .events(collect_events![
            AppSettingsChangedEvent,
            InputDetectedEvent,
            TimerTickEvent,
            TimerCompleteEvent
        ]);

    #[cfg(debug_assertions)]
    builder
        .export(
            Typescript::default(),
            "../src/environment/specta/bindings.gen.ts",
        )
        .expect("Failed to export Typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            // https://docs.rs/tauri-specta/2.0.0-rc.21/tauri_specta/index.html
            builder.mount_events(app);

            // Load settings from disk
            let app_settings = settings::persistence::load_settings(app);

            // Initialize timer with settings
            let timer_config = TimerConfig::from(&app_settings);
            let timer = Timer::new(&timer_config);

            // Manage state
            app.manage(AppSettingsState::new(app_settings));
            app.manage(TimerState::new(timer));
            app.manage(Mutex::new(None::<TimerRunner>));

            // Start input monitoring
            InputRunner::start(app.handle().clone());

            // Setup tray icon (macOS only)
            #[cfg(target_os = "macos")]
            {
                use crate::app::tray::{Tray, TrayState};

                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                let tray_icon = Tray::setup(app.handle()).ok();
                app.manage(TrayState::new(tray_icon));
            }

            // Show main window on startup
            let _ = window::ShowWindow::Main.show(app.handle());

            return Ok(());
        })
        .on_window_event(|window, event| {
            // Hide main window on close instead of quitting (can reopen from tray)
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let label = window.label();
                if label == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, _event| {});
}
