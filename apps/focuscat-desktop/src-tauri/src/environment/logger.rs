/// Debug-only logging. Compiles to nothing in release builds.
/// Usage: `log_debug!("Window Monitor", "Event: {}", event)`
#[cfg(debug_assertions)]
macro_rules! log_debug {
    ($tag:expr, $($arg:tt)*) => {
        eprintln!("[{}] {}", $tag, format!($($arg)*))
    };
}

#[cfg(not(debug_assertions))]
macro_rules! log_debug {
    ($tag:expr, $($arg:tt)*) => {};
}

/// Info-level logging. Always prints.
/// Usage: `log_info!("Window Monitor", "Started")`
macro_rules! log_info {
    ($tag:expr, $($arg:tt)*) => {
        eprintln!("[{}] {}", $tag, format!($($arg)*))
    };
}

/// Warning-level logging. Always prints.
/// Usage: `log_warn!("Window Monitor", "Unexpected exit")`
macro_rules! log_warn {
    ($tag:expr, $($arg:tt)*) => {
        eprintln!("[{}] WARN: {}", $tag, format!($($arg)*))
    };
}

/// Error-level logging. Always prints.
/// Usage: `log_error!("Window Monitor", "Failed: {}", err)`
macro_rules! log_error {
    ($tag:expr, $($arg:tt)*) => {
        eprintln!("[{}] ERROR: {}", $tag, format!($($arg)*))
    };
}

pub(crate) use log_debug;
pub(crate) use log_error;
pub(crate) use log_info;
pub(crate) use log_warn;
