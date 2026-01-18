mod commands;
pub mod tray;
pub mod window;

use crate::environment::db;
use crate::features::{
    activity_window,
    input::{self, types::InputDetectedEvent},
    permission, session, session_tag,
    settings::{self, types::AppSettingsChangedEvent},
    timer::{
        self,
        types::{TimerCompleteEvent, TimerUpdatedEvent},
    },
};
use specta_typescript::Typescript;
use tauri_specta::{collect_commands, collect_events, Builder};

pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            // Window commands
            commands::show_main_window,
            commands::show_cat_window,
            commands::show_settings_window,
            commands::hide_main_window,
            commands::hide_cat_window,
            commands::hide_settings_window,
            commands::quit_app,
            // Settings commands
            settings::commands::get_settings,
            settings::commands::set_settings,
            settings::commands::get_data_directory_path,
            settings::commands::open_data_directory,
            // Timer commands
            timer::commands::get_timer,
            timer::commands::start_timer,
            timer::commands::pause_timer,
            timer::commands::resume_timer,
            timer::commands::reset_timer,
            timer::commands::skip_timer,
            timer::commands::set_timer_duration,
            timer::commands::set_timer_tags,
            // Session tag commands
            session_tag::commands::get_session_tags,
            session_tag::commands::get_session_tag_with_rules,
            session_tag::commands::create_session_tag,
            session_tag::commands::update_session_tag,
            session_tag::commands::delete_session_tag,
            session_tag::commands::add_session_tag_rule,
            session_tag::commands::delete_session_tag_rule,
            // Activity window commands
            activity_window::commands::get_window_activities,
            // Session commands
            session::commands::get_today_focus_seconds,
            // Permission commands
            permission::commands::is_accessibility_granted,
            permission::commands::open_accessibility_settings,
        ])
        .events(collect_events![
            AppSettingsChangedEvent,
            InputDetectedEvent,
            TimerUpdatedEvent,
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
        .plugin(tauri_plugin_os::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            // https://docs.rs/tauri-specta/2.0.0-rc.21/tauri_specta/index.html
            builder.mount_events(app);

            // Setup modules
            db::setup(app);
            settings::setup(app);
            timer::setup(app);
            input::setup(app);
            activity_window::setup(app);
            #[cfg(target_os = "macos")]
            tray::setup(app);

            // Show main window on startup
            let _ = window::Window::Main.show(app.handle());

            return Ok(());
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window::Window::handle_close(window.label(), window, api);
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, _event| {});
}
