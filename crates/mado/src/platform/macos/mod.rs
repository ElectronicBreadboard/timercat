mod ffi;
mod parser;

use crate::platform::call_listener_safe;
use crate::{
    config::MonitorConfig,
    error::Error,
    listener::WindowListener,
    types::{AppInfo, WindowInfo},
};
use ffi::*;
use parser::parse_event_from_json;
use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use swift_rs::SRString;

/// Track if monitor is running (only one monitor can run at a time)
static RUNNING: AtomicBool = AtomicBool::new(false);

/// Global listener storage for C callback access
static GLOBAL_LISTENER: Mutex<Option<Arc<dyn WindowListener>>> = Mutex::new(None);

/// Start monitoring window and application focus changes.
/// Blocks current thread until `stop()` is called.
pub fn run(listener: Arc<dyn WindowListener>, config: MonitorConfig) -> Result<(), Error> {
    // Atomic check-and-set: only one monitor can run at a time
    if RUNNING
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err(Error::AlreadyRunning);
    }

    // Store listener for C callback access
    {
        let mut guard = GLOBAL_LISTENER.lock().unwrap();
        *guard = Some(listener.clone());
    }

    // Start monitoring (blocks until stopped)
    unsafe {
        let callback_ptr = window_event_callback as *const c_void;
        mado_start_monitor(
            callback_ptr,
            config.track_window_changes,
            config.allow_browser,
        );
    }

    // Cleanup after stop
    {
        let mut guard = GLOBAL_LISTENER.lock().unwrap();
        *guard = None;
    }

    RUNNING.store(false, Ordering::SeqCst);

    return Ok(());
}

/// Stop the monitor (thread-safe, can be called from any thread).
pub fn stop() -> Result<(), Error> {
    if !RUNNING.load(Ordering::SeqCst) {
        return Err(Error::NotRunning);
    }

    unsafe {
        mado_stop_monitor();
    }

    return Ok(());
}

/// Get information about the currently active application.
pub fn get_active_app() -> Result<AppInfo, Error> {
    let json_str = unsafe {
        let result = mado_get_active_app();
        if result.is_none() {
            return Err(Error::NoActiveApp);
        }
        result.unwrap().as_str().to_string()
    };

    let app: AppInfo = serde_json::from_str(&json_str)
        .map_err(|e| Error::Platform(format!("Failed to parse app info: {}", e)))?;

    return Ok(app);
}

/// Get information about the currently active window.
pub fn get_active_window() -> Result<WindowInfo, Error> {
    return get_active_window_internal(false);
}

/// Get information about the currently active window, including browser info.
///
/// This is slower than `get_active_window()` because it runs AppleScript to extract
/// the browser URL and private mode. Only use when you need browser information.
pub fn get_active_window_with_browser() -> Result<WindowInfo, Error> {
    return get_active_window_internal(true);
}

fn get_active_window_internal(allow_browser: bool) -> Result<WindowInfo, Error> {
    let json_str = unsafe {
        let result = mado_get_active_window(allow_browser);
        if result.is_none() {
            return Err(Error::NoActiveWindow);
        }
        result.unwrap().as_str().to_string()
    };

    let window: WindowInfo = serde_json::from_str(&json_str)
        .map_err(|e| Error::Platform(format!("Failed to parse window info: {}", e)))?;

    return Ok(window);
}

/// Check if accessibility permissions are granted.
pub fn is_accessibility_trusted() -> bool {
    return unsafe { mado_is_trusted() };
}

/// C callback invoked by Swift when window/app events occur.
extern "C" fn window_event_callback(event_json_ptr: *const SRString) {
    if event_json_ptr.is_null() {
        return;
    }

    let event_json = unsafe { (*event_json_ptr).as_str() };

    let event = match parse_event_from_json(event_json) {
        Ok(event) => event,
        Err(e) => {
            eprintln!("[mado] Failed to parse event JSON: {} - {}", e, event_json);
            return;
        }
    };

    let guard = GLOBAL_LISTENER.lock().unwrap();
    if let Some(listener) = guard.as_ref() {
        call_listener_safe(listener, event);
    }
}
