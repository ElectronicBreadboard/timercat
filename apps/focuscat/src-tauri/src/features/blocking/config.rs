pub struct BlockingConfig;

impl BlockingConfig {
    /// Polling interval for schedule boundary checks.
    /// Handles always_on schedule start/end times that can't be event-driven.
    pub fn schedule_poll_interval_secs() -> u64 {
        return 60;
    }
}
