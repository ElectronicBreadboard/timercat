use serde::{Deserialize, Serialize};

/// Focus category for an app or website within a profile.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum FocusCategory {
    Focused,
    Neutral,
    Distracting,
}

impl FocusCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            FocusCategory::Focused => "focused",
            FocusCategory::Neutral => "neutral",
            FocusCategory::Distracting => "distracting",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "focused" => Some(FocusCategory::Focused),
            "neutral" => Some(FocusCategory::Neutral),
            "distracting" => Some(FocusCategory::Distracting),
            _ => None,
        }
    }
}

/// Schedule activation mode for a focus profile.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ScheduleMode {
    AlwaysOn,
    PreSelected,
}

impl ScheduleMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            ScheduleMode::AlwaysOn => "always_on",
            ScheduleMode::PreSelected => "pre_selected",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "always_on" => Some(ScheduleMode::AlwaysOn),
            "pre_selected" => Some(ScheduleMode::PreSelected),
            _ => None,
        }
    }
}

// MARK: - DTO

/// The target of a category assignment: all, a specific app, or a specific website.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum FocusTargetDto {
    #[serde(rename = "all")]
    All,
    #[serde(rename = "app")]
    App {
        bundle_id: String,
        name: Option<String>,
        icon: Option<String>,
        color: Option<String>,
    },
    #[serde(rename = "website")]
    Website {
        domain: String,
        name: Option<String>,
        icon: Option<String>,
        color: Option<String>,
    },
}

/// Focus profile with its category assignments and schedules.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusProfileDto {
    pub id: i32,
    pub name: String,
    pub color: Option<String>,
    pub enabled: bool,
    pub categories: Vec<CategoryAssignmentDto>,
    pub schedules: Vec<FocusProfileScheduleDto>,
    pub created_at: f64,
}

/// A category assignment within a focus profile (target + category).
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryAssignmentDto {
    pub id: i32,
    pub category: FocusCategory,
    pub target: FocusTargetDto,
}

/// A schedule entry for a focus profile.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusProfileScheduleDto {
    pub id: i32,
    pub mode: ScheduleMode,
    pub days: Vec<i32>,
    pub start_time: String,
    pub end_time: String,
}

/// A profile shown in session setup, with how it was activated.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionProfileDto {
    pub profile: FocusProfileDto,
    pub activation: ProfileActivation,
}

/// How a profile was activated for session selection.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ProfileActivation {
    /// Always-on schedule is active — shown in session setup, not removable.
    AlwaysOn,
    /// Pre-selected by schedule — shown in session setup, removable.
    PreSelected,
    /// Manually added by the user.
    Manual,
}

// MARK: - Event

/// Event emitted when a focus profile is created, updated, or deleted.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
pub struct ProfileChangedEvent;
