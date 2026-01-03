use crate::platform::call_listener_safe;
use crate::{
    config::MonitorConfig,
    error::Error,
    listener::WindowListener,
    types::{AppInfo, WindowInfo},
};
use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use swift_rs::{swift, SRString};

// =============================================================================
// Global State
// =============================================================================

/// Track if monitor is running (atomic for thread safety)
static RUNNING: AtomicBool = AtomicBool::new(false);

/// Global listener storage (thread-safe)
static GLOBAL_LISTENER: Mutex<Option<std::sync::Arc<dyn WindowListener>>> = Mutex::new(None);

// =============================================================================
// Public API
// =============================================================================

/// Start monitoring window and application focus changes.
///
/// This blocks the current thread until `stop()` is called.
pub fn run(listener: Arc<dyn WindowListener>, config: MonitorConfig) -> Result<(), Error> {
    // Atomic check-and-set: only one monitor can run at a time
    if RUNNING
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err(Error::AlreadyRunning);
    }

    // Store listener
    {
        let mut guard = GLOBAL_LISTENER.lock().unwrap();
        *guard = Some(listener.clone());
    }

    // Start monitoring (blocks)
    unsafe {
        let callback_ptr = window_event_callback as *const c_void;
        mado_start_monitor(callback_ptr, config.track_window_changes);
    }

    // Cleanup
    {
        let mut guard = GLOBAL_LISTENER.lock().unwrap();
        *guard = None;
    }

    RUNNING.store(false, Ordering::SeqCst);

    return Ok(());
}

/// Stop the monitor (thread-safe).
///
/// This can be called from any thread to signal the monitor to stop.
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
///
/// This is a synchronous query that returns the current state immediately.
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
///
/// This is a synchronous query that returns the current state immediately.
/// The returned `WindowInfo` includes both window details and the associated app info.
pub fn get_active_window() -> Result<WindowInfo, Error> {
    let json_str = unsafe {
        let result = mado_get_active_window();
        if result.is_none() {
            return Err(Error::NoActiveWindow);
        }
        result.unwrap().as_str().to_string()
    };

    let window: WindowInfo = serde_json::from_str(&json_str)
        .map_err(|e| Error::Platform(format!("Failed to parse window info: {}", e)))?;

    return Ok(window);
}

/// Check if accessibility permissions are granted (macOS only).
///
/// On macOS, accessibility permissions are required for window monitoring.
/// This function returns `true` if permissions are granted.
pub fn is_accessibility_trusted() -> bool {
    return unsafe { mado_is_trusted() };
}

// =============================================================================
// FFI
// =============================================================================

swift!(fn mado_start_monitor(callback: *const c_void, track_window_changes: bool));
swift!(fn mado_stop_monitor());
swift!(fn mado_is_trusted() -> bool);
swift!(fn mado_get_active_app() -> Option<SRString>);
swift!(fn mado_get_active_window() -> Option<SRString>);

/// C callback invoked by Swift when window/app events occur
extern "C" fn window_event_callback(event_json_ptr: *const SRString) {
    if event_json_ptr.is_null() {
        return;
    }

    let event_json = unsafe { (*event_json_ptr).as_str() };

    // Parse WindowEvent from JSON
    let event = match parse_event_from_json(event_json) {
        Ok(event) => event,
        Err(e) => {
            eprintln!("[mado] Failed to parse event JSON: {} - {}", e, event_json);
            return;
        }
    };

    // Call listener with panic safety
    let guard = GLOBAL_LISTENER.lock().unwrap();
    if let Some(listener) = guard.as_ref() {
        call_listener_safe(listener, event);
    }
}

// =============================================================================
// Event Parsing
// =============================================================================

/// Parse WindowEvent from Swift's JSON format
///
/// Swift sends: { "type": "AppActivated"|"WindowChanged", "data": {...} }
/// We convert this to WindowEvent enum
fn parse_event_from_json(json: &str) -> Result<crate::types::WindowEvent, serde_json::Error> {
    use serde::de::Error;
    use serde_json::Value;

    let value: Value = serde_json::from_str(json)?;

    let event_type = value
        .get("type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| serde_json::Error::custom("Missing 'type' field"))?;

    let data = value
        .get("data")
        .ok_or_else(|| serde_json::Error::custom("Missing 'data' field"))?;

    match event_type {
        "AppActivated" => {
            // For AppActivated, data contains {"app": {...}}
            let app_data = data.get("app").ok_or_else(|| {
                serde_json::Error::custom("Missing 'app' field in AppActivated data")
            })?;
            let app: AppInfo = serde_json::from_value(app_data.clone())?;
            return Ok(crate::types::WindowEvent::AppActivated { app });
        }
        "WindowChanged" => {
            // For WindowChanged, data IS the windowInfo
            let window: WindowInfo = serde_json::from_value(data.clone())?;
            return Ok(crate::types::WindowEvent::WindowChanged { window });
        }
        _ => {
            return Err(serde_json::Error::custom(format!(
                "Unknown event type: {}",
                event_type
            )));
        }
    }
}
