use super::session::{Phase, SessionStatus};
use serde::{Deserialize, Serialize};

/// Summary DTO for session list views.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummaryDto {
    pub id: i64,
    pub phase: Phase,
    pub status: SessionStatus,
    pub planned_seconds: u32,
    pub actual_seconds: Option<u32>,
    pub started_at: i64,
    pub ended_at: Option<i64>,
}

/// Detailed DTO with events and computed stats.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionDetailDto {
    pub id: i64,
    pub phase: Phase,
    pub status: SessionStatus,
    pub planned_seconds: u32,
    pub actual_seconds: Option<u32>,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub events: Vec<SessionEventDto>,
    pub stats: SessionStatsDto,
}

/// Event DTO for frontend.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionEventDto {
    pub event_type: String,
    pub timestamp: i64,
    /// Extra data (e.g., seconds for Extended events)
    pub data: Option<SessionEventDataDto>,
}

/// Event data for events with extra fields.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionEventDataDto {
    pub seconds: Option<u32>,
}

/// Computed stats for a session.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionStatsDto {
    pub paused_seconds: u32,
    pub extended_seconds: u32,
}
