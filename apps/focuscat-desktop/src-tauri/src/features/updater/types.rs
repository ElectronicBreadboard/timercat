use serde::Serialize;

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
    /// Semver parts we are behind (e.g. 1.2.3 → 2.0.0 gives 1, 0, 0).
    pub major_behind: u32,
    pub minor_behind: u32,
    pub patch_behind: u32,
}

// MARK: - Event

#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAvailableEvent(pub UpdateInfo);
