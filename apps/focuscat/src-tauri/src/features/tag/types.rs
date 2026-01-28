use serde::{Deserialize, Serialize};

/// Action for a restriction.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum RestrictionAction {
    Block,
    Allow,
}

impl RestrictionAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            RestrictionAction::Block => "block",
            RestrictionAction::Allow => "allow",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "block" => Some(RestrictionAction::Block),
            "allow" => Some(RestrictionAction::Allow),
            _ => None,
        }
    }
}

// MARK: - Tag

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TagDto {
    pub id: i32,
    pub name: String,
    pub created_at: i64,
}

// MARK: - Restriction

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RestrictionDto {
    pub id: i32,
    pub tag_id: i32,
    pub action: RestrictionAction,
    // App info (if app restriction)
    pub app_id: Option<i32>,
    pub app_bundle_id: Option<String>,
    pub app_name: Option<String>,
    pub app_icon: Option<String>,
    // Website info (if website restriction)
    pub website_id: Option<i32>,
    pub website_domain: Option<String>,
    pub website_name: Option<String>,
    pub website_icon: Option<String>,
}

// MARK: - Schedule

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleDto {
    pub id: i32,
    pub name: String,
    /// Days of week (1 = Monday, 7 = Sunday)
    pub days: Vec<u8>,
    /// Start time in HH:MM format
    pub start_time: String,
    /// End time in HH:MM format
    pub end_time: String,
    pub created_at: i64,
}
