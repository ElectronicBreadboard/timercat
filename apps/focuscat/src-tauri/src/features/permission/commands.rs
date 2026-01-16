/// Check if accessibility permission is granted.
#[tauri::command]
#[specta::specta]
pub fn is_accessibility_granted() -> bool {
    mado::is_accessibility_trusted()
}

/// Open System Settings to Accessibility pane.
#[tauri::command]
#[specta::specta]
pub fn open_accessibility_settings() {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let _ = Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn();
    }
}
