use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use swift_rs::{swift, SRString};

// =============================================================================
// Public API
// =============================================================================

/// Trait for handling window change events
pub trait WindowListener: Send + Sync {
    /// Called when the focused window title changes
    fn on_window_change(&self, title: String);
}

/// Check if accessibility permissions are granted.
///
/// For window monitoring to work, the app must have accessibility permissions.
/// If this returns `false`, prompt the user to enable permissions in
/// System Preferences → Security & Privacy → Privacy → Accessibility.
pub fn is_accessibility_trusted() -> bool {
    return unsafe { mado_is_trusted() };
}

/// Window monitor
pub struct WindowMonitor {
    _private: (),
}

/// Track if monitor is running (atomic for thread safety)
static RUNNING: AtomicBool = AtomicBool::new(false);

impl WindowMonitor {
    /// Create a new window monitor
    pub fn new() -> Self {
        return Self { _private: () };
    }

    /// Start monitoring (blocks until stopped)
    ///
    /// **Thread Safety**: Can be called from any thread, but only one monitor can run at a time.
    /// The calling thread will run a CFRunLoop and block until `stop()` is called.
    ///
    /// **Permissions**: Requires accessibility permissions. Check with `is_accessibility_trusted()`
    /// before calling, and prompt user to enable if needed.
    ///
    /// Call `stop()` from another thread to stop monitoring.
    pub fn run<L: WindowListener + 'static>(self, listener: L) -> Result<(), Error> {
        // Atomic check-and-set: only one monitor can run at a time
        if RUNNING
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err(Error::AlreadyRunning);
        }

        // Store listener in thread-safe global
        let listener_box: Box<Box<dyn WindowListener>> = Box::new(Box::new(listener));
        let listener_ptr = Box::into_raw(listener_box) as *mut c_void;

        {
            let mut guard = GLOBAL_LISTENER.lock().unwrap();
            *guard = Some(ListenerPtr(listener_ptr));
        }

        // Start monitoring (blocks)
        unsafe {
            let callback_ptr = window_change_callback as *const c_void;
            mado_start_monitor(callback_ptr);
        }

        // Cleanup
        {
            let mut guard = GLOBAL_LISTENER.lock().unwrap();
            if let Some(ListenerPtr(ptr)) = guard.take() {
                unsafe {
                    let _ = Box::from_raw(ptr as *mut Box<dyn WindowListener>);
                }
            }
        }

        RUNNING.store(false, Ordering::SeqCst);

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
swift!(fn mado_is_trusted() -> bool);

/// Thread-safe wrapper for raw pointer
struct ListenerPtr(*mut c_void);
unsafe impl Send for ListenerPtr {}
unsafe impl Sync for ListenerPtr {}

/// Global listener pointer (thread-safe)
static GLOBAL_LISTENER: Mutex<Option<ListenerPtr>> = Mutex::new(None);

/// C callback invoked by Swift when window title changes
extern "C" fn window_change_callback(title_ptr: *const SRString) {
    if title_ptr.is_null() {
        return;
    }

    let title = unsafe { (*title_ptr).as_str().to_string() };

    let guard = GLOBAL_LISTENER.lock().unwrap();
    if let Some(ListenerPtr(ptr)) = *guard {
        unsafe {
            let listener = &*(ptr as *const Box<dyn WindowListener>);
            listener.on_window_change(title);
        }
    }
}

// =============================================================================
// Error
// =============================================================================

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Monitor is already running")]
    AlreadyRunning,

    #[error("Platform error: {0}")]
    Platform(String),
}
