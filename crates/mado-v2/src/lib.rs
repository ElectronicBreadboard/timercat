use std::ffi::c_void;
use swift_rs::{swift, SRString};

// =============================================================================
// Public API
// =============================================================================

/// Trait for handling window change events
pub trait WindowListener: Send + Sync {
    /// Called when the focused window title changes
    fn on_window_change(&self, title: String);
}

/// Window monitor
pub struct WindowMonitor {
    _private: (),
}

impl WindowMonitor {
    /// Create a new window monitor
    pub fn new() -> Self {
        return Self { _private: () };
    }

    /// Start monitoring (blocks until stopped)
    ///
    /// **Important**: Must be called from the main thread to receive app activation
    /// notifications. This is because macOS's NSWorkspace posts notifications on
    /// the main thread's runloop.
    ///
    /// This spawns observers for window changes and blocks the current thread.
    /// Call `stop()` from another thread to stop monitoring.
    pub fn run<L: WindowListener + 'static>(self, listener: L) -> Result<(), Error> {
        // Store listener globally
        let listener_box: Box<Box<dyn WindowListener>> = Box::new(Box::new(listener));
        let listener_ptr = Box::into_raw(listener_box);

        unsafe {
            GLOBAL_LISTENER = listener_ptr as *mut c_void;
        }

        // Start monitoring (blocks)
        unsafe {
            let callback_ptr = window_change_callback as *const c_void;
            mado_start_monitor(callback_ptr);
        }

        // Cleanup
        unsafe {
            if !GLOBAL_LISTENER.is_null() {
                let _ = Box::from_raw(GLOBAL_LISTENER as *mut Box<dyn WindowListener>);
                GLOBAL_LISTENER = std::ptr::null_mut();
            }
        }

        return Ok(());
    }

    /// Stop the monitor (can be called from any thread)
    pub fn stop() {
        unsafe {
            mado_stop_monitor();
        }
    }
}

// =============================================================================
// FFI
// =============================================================================

swift!(fn mado_start_monitor(callback: *const c_void));
swift!(fn mado_stop_monitor());

/// Global listener pointer
static mut GLOBAL_LISTENER: *mut c_void = std::ptr::null_mut();

/// C callback invoked by Swift when window title changes
extern "C" fn window_change_callback(title_ptr: *const SRString) {
    if title_ptr.is_null() {
        return;
    }

    let title = unsafe { (*title_ptr).as_str().to_string() };

    unsafe {
        if !GLOBAL_LISTENER.is_null() {
            let listener = &*(GLOBAL_LISTENER as *const Box<dyn WindowListener>);
            listener.on_window_change(title);
        }
    }
}

// =============================================================================
// Error
// =============================================================================

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Platform error: {0}")]
    Platform(String),
}
