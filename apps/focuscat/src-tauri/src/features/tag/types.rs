use serde::{Deserialize, Serialize};

// MARK: - DTO

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TagDto {
    pub id: i32,
    pub name: String,
    pub color: Option<String>,
    pub created_at: f64,
}
