pub struct BlockingConfig;

impl BlockingConfig {
    /// Polling interval for schedule boundary checks.
    pub fn schedule_poll_interval_secs() -> u64 {
        return 60;
    }

    /// Our own bundle IDs (never block ourselves).
    pub fn own_bundle_ids() -> &'static [&'static str] {
        return &["com.buildergroup.focuscat", "com.buildergroup.focuscat.dev"];
    }
}
