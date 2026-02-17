pub mod commands;
pub mod types;

#[cfg(all(desktop, not(feature = "app-store"), not(debug_assertions)))]
mod runner;

#[cfg(all(desktop, not(feature = "app-store"), not(debug_assertions)))]
pub fn setup(app: &tauri::AppHandle) {
    runner::start(app);
}

#[cfg(not(all(desktop, not(feature = "app-store"), not(debug_assertions))))]
pub fn setup(_app: &tauri::AppHandle) {}
