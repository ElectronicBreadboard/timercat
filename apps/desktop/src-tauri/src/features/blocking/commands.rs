use super::blocker::{BlockedTarget, BlockingViolation};
use super::types::{BlockedTargetDto, BlockerState, BlockingViolationDto};
use tauri::Manager;

/// Current blocking violation (None if nothing is blocked).
#[tauri::command]
#[specta::specta]
pub fn get_blocking_violation(app: tauri::AppHandle) -> Option<BlockingViolationDto> {
    return app
        .try_state::<BlockerState>()
        .and_then(|state| state.lock().unwrap().active_violation())
        .map(BlockingViolationDto::from);
}

// MARK: - Conversions

impl From<BlockingViolation> for BlockingViolationDto {
    fn from(v: BlockingViolation) -> Self {
        return Self {
            profile_id: v.profile_id.map(|id| id as i32),
            profile_name: v.profile_name,
            profile_color: v.profile_color,
            blocked_target: BlockedTargetDto::from(v.blocked_target),
        };
    }
}

impl From<BlockedTarget> for BlockedTargetDto {
    fn from(t: BlockedTarget) -> Self {
        return match t {
            BlockedTarget::App { bundle_id } => Self::App { bundle_id },
            BlockedTarget::Website { domain } => Self::Website { domain },
        };
    }
}
