use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionTag {
    pub id: i32,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionTagRule {
    pub id: i32,
    pub session_tag_id: i32,
    pub app_bundle_id: String,
    pub app_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionTagWithRules {
    pub id: i32,
    pub name: String,
    pub color: String,
    pub rules: Vec<SessionTagRule>,
}
