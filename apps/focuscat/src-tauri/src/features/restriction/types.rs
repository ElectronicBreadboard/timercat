use serde::{Deserialize, Serialize};

/// Action for a restriction set.
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

/// A restriction item (app or website).
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum RestrictionItem {
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

/// A set of restrictions with an action.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RestrictionSet {
    pub action: RestrictionAction,
    pub items: Vec<RestrictionItem>,
}
