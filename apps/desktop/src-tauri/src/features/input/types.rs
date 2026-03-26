use serde::{Deserialize, Serialize};

/// Type of input event detected.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum InputType {
    Keyboard,
    Mouse,
}

// MARK: - Events

/// Event emitted when user input is detected (throttled).
#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct InputDetectedEvent(pub InputType);
