pub struct BlockingConfig;

impl BlockingConfig {
    /// Our own bundle IDs (never block ourselves).
    pub fn own_bundle_ids() -> &'static [&'static str] {
        return &["com.buildergroup.focuscat", "com.buildergroup.focuscat.dev"];
    }
}
