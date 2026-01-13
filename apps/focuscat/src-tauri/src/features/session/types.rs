use crate::features::timer::types::TimerPhase;

/// Input for inserting a completed session.
pub struct InsertSessionInput {
    pub phase: TimerPhase,
    pub started_at: i64,
    pub ended_at: i64,
    pub base_seconds: u32,
    pub extended_seconds: u32,
    pub overtime_seconds: u32,
    pub session_tag_ids: Vec<i32>,
}
