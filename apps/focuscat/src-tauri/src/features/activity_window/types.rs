/// Tracks currently active app (in-memory, pending write to DB on change).
pub struct ActiveApp {
    pub app_id: i64,
    pub bundle_id: Option<String>,
    pub started_at: i64,
}

/// Tracks currently active window (in-memory, pending write to DB on change).
pub struct ActiveWindow {
    pub app_id: i64,
    pub bundle_id: Option<String>,
    // Window fields
    pub window_title: Option<String>,
    pub window_id: Option<u32>,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_width: Option<f64>,
    pub window_height: Option<f64>,
    // Browser fields
    pub browser_url: Option<String>,
    pub browser_is_private: Option<bool>,
    // Timestamps
    pub started_at: i64,
}
