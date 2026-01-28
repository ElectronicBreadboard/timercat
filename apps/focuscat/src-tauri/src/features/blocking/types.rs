use serde::{Deserialize, Serialize};

/// Schedule for automatic tag activation.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TagSchedule {
    /// Days of week (1 = Monday, 7 = Sunday)
    pub days: Vec<u8>,
    /// Start time in HH:MM format
    pub start: String,
    /// End time in HH:MM format
    pub end: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TagDto {
    pub id: i32,
    pub name: String,
    pub schedule: Option<TagSchedule>,
    pub created_at: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BlockRuleDto {
    pub id: i32,
    pub tag_id: i32,
    pub rule_type: BlockRuleType,
    // App info (if app rule)
    pub app_id: Option<i32>,
    pub app_bundle_id: Option<String>,
    pub app_name: Option<String>,
    pub app_icon: Option<String>,
    // Website info (if website rule)
    pub website_id: Option<i32>,
    pub website_domain: Option<String>,
    pub website_name: Option<String>,
    pub website_icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum BlockRuleType {
    Block,
    Allow,
}

impl BlockRuleType {
    pub fn as_str(&self) -> &'static str {
        match self {
            BlockRuleType::Block => "block",
            BlockRuleType::Allow => "allow",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "block" => Some(BlockRuleType::Block),
            "allow" => Some(BlockRuleType::Allow),
            _ => None,
        }
    }
}
