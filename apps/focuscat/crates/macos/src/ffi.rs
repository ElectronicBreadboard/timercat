use swift_rs::{swift, SRString};

// Permissions
swift!(pub fn macos_is_input_monitoring_enabled() -> bool);

// Installed Apps
swift!(pub fn macos_get_installed_apps(include_icons: bool, icon_size: i32) -> Option<SRString>);
swift!(pub fn macos_get_app_icon(bundle_id: &SRString, icon_size: i32) -> Option<SRString>);
