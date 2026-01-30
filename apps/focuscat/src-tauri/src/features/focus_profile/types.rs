use serde::{Deserialize, Serialize};

/// Action for a focus profile rule.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum RuleAction {
    Block,
    Allow,
}

impl RuleAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            RuleAction::Block => "block",
            RuleAction::Allow => "allow",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "block" => Some(RuleAction::Block),
            "allow" => Some(RuleAction::Allow),
            _ => None,
        }
    }
}

/// Schedule mode for a focus profile.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ScheduleMode {
    AlwaysOn,
    SessionsOnly,
}

impl ScheduleMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            ScheduleMode::AlwaysOn => "always_on",
            ScheduleMode::SessionsOnly => "sessions_only",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "always_on" => Some(ScheduleMode::AlwaysOn),
            "sessions_only" => Some(ScheduleMode::SessionsOnly),
            _ => None,
        }
    }
}

// MARK: - DTO

/// Target for a focus profile rule.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum RuleTargetDto {
    /// Applies to all apps/websites.
    #[serde(rename = "all")]
    All,
    /// Target a specific app.
    #[serde(rename = "app")]
    App {
        bundle_id: String,
        name: Option<String>,
        icon: Option<String>,
        color: Option<String>,
    },
    /// Target a specific website.
    #[serde(rename = "website")]
    Website {
        domain: String,
        name: Option<String>,
        icon: Option<String>,
        color: Option<String>,
    },
}

/// Focus profile with its rules and schedules.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusProfileDto {
    pub id: i32,
    pub name: String,
    pub color: Option<String>,
    pub rules: Vec<FocusProfileRuleDto>,
    pub schedules: Vec<FocusProfileScheduleDto>,
    pub created_at: f64,
}

/// A rule within a focus profile.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusProfileRuleDto {
    pub id: i32,
    pub action: RuleAction,
    pub target: RuleTargetDto,
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

