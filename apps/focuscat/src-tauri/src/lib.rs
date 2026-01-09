mod app;
mod environment;
mod features;
mod shared;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    app::run();
}
