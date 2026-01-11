use std::cell::Cell;
use std::thread;
use std::time::{Duration, Instant};
use rdev::{listen, Event as RdevEvent, EventType};
use tauri::AppHandle;
use tauri_specta::Event;

use super::types::{InputDetectedEvent, InputType};

/// Minimum interval between events in ms (prevents animation spam).
const THROTTLE_MS: u64 = 120;

// MARK: - Input Runner

/// Runs global input listener in background thread.
pub struct InputRunner;

impl InputRunner {
    /// Start input listener in background thread.
    pub fn start(app: AppHandle) {
        thread::spawn(move || {
            run_listener(app);
        });
    }
}

// MARK: - Listener

fn run_listener(app: AppHandle) {
    // Fix for Tauri: must call this when listening from non-main thread
    // See: https://github.com/Narsil/rdev/issues/165
    #[cfg(target_os = "macos")]
    rdev::set_is_main_thread(false);

    let throttle = Duration::from_millis(THROTTLE_MS);
    let last_emit: Cell<Instant> = Cell::new(Instant::now() - throttle);

    let callback = move |event: RdevEvent| {
        // Only handle key/button press (not release, move, scroll)
        let input_type = match event.event_type {
            EventType::KeyPress(_) => Some(InputType::Keyboard),
            EventType::ButtonPress(_) => Some(InputType::Mouse),
            _ => return,
        };

        // Apply throttling
        let now = Instant::now();
        if now.duration_since(last_emit.get()) < throttle {
            return;
        }
        last_emit.set(now);

        // Emit event
        if let Some(input_type) = input_type {
            let _ = InputDetectedEvent(input_type).emit(&app);
        }
    };

    if let Err(e) = listen(callback) {
        eprintln!("[InputRunner] rdev listen error: {:?}", e);
    }
}
