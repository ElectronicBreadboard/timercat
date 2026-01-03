//! FFI declarations for Swift interop.
//!
//! This file defines the interface between Rust and Swift.
//! Each function here corresponds to a `@_cdecl` function in `FFI.swift`.

use std::ffi::c_void;
use swift_rs::{swift, SRString};

// Monitor lifecycle
swift!(pub fn mado_start_monitor(callback: *const c_void, track_window_changes: bool, allow_browser: bool));
swift!(pub fn mado_stop_monitor());

// Permissions
swift!(pub fn mado_is_trusted() -> bool);

// Queries
swift!(pub fn mado_get_active_app() -> Option<SRString>);
swift!(pub fn mado_get_active_window(allow_browser: bool) -> Option<SRString>);
