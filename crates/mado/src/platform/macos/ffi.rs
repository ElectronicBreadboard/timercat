use std::ffi::c_void;
use swift_rs::{swift, SRString};

// Monitor lifecycle
swift!(pub fn mado_start_monitor(callback: *const c_void, track_window_changes: bool, allow_browser: bool, include_icon: bool));
swift!(pub fn mado_stop_monitor());

// Permissions
swift!(pub fn mado_is_trusted() -> bool);

// Queries
swift!(pub fn mado_get_active_app(include_icon: bool) -> Option<SRString>);
swift!(pub fn mado_get_active_window(allow_browser: bool, include_icon: bool) -> Option<SRString>);
