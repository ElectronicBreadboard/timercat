use super::blocker::Blocker;
use serde::Serialize;
use std::ops::Deref;
use std::sync::Mutex;

// MARK: - DTO

/// Describes what was blocked and by which profile.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BlockingViolationDto {
    pub profile_id: i32,
    pub profile_name: String,
    pub profile_color: Option<String>,
    pub blocked_target: BlockedTargetDto,
}

/// The target that was blocked.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum BlockedTargetDto {
    #[serde(rename = "app", rename_all = "camelCase")]
    App { bundle_id: String },
    #[serde(rename = "website", rename_all = "camelCase")]
    Website { domain: String },
}

// MARK: - Event

/// Event emitted when a blocking violation is detected (or cleared).
#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
pub struct BlockingViolationEvent(pub Option<BlockingViolationDto>);

// MARK: - State

pub struct BlockerState(Mutex<Blocker>);

impl BlockerState {
    pub fn new() -> Self {
        return Self(Mutex::new(Blocker::new()));
    }
}

impl Deref for BlockerState {
    type Target = Mutex<Blocker>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}
