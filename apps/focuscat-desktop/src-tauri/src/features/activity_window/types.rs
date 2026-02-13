use serde::Serialize;

// MARK: - DTO

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WindowActivityDto {
    // App fields
    pub app_bundle_id: Option<String>,
    pub app_name: Option<String>,
    pub app_icon: Option<String>,
    pub app_color: Option<String>,
    // Website fields (NULL for non-browser)
    pub website_domain: Option<String>,
    pub website_name: Option<String>,
    pub website_icon: Option<String>,
    pub website_color: Option<String>,
    // Window fields
    pub window_title: Option<String>,
    pub browser_url: Option<String>,
    pub started_at: f64,
    pub ended_at: f64,
}
