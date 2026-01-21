use super::session::{Phase, SessionStatus};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummaryDto {
    pub id: i32,
    pub phase: Phase,
    pub status: SessionStatus,
    pub planned_seconds: u32,
    pub actual_seconds: Option<u32>,
    pub started_at: f64,
    pub ended_at: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionDetailDto {
    pub id: i32,
    pub phase: Phase,
    pub status: SessionStatus,
    pub planned_seconds: u32,
    pub actual_seconds: Option<u32>,
    pub started_at: f64,
    pub ended_at: Option<f64>,
    pub events: Vec<SessionEventDto>,
    pub stats: SessionStatsDto,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionEventDto {
    pub event_type: String,
    pub timestamp: f64,
    /// Extra data (e.g., seconds for Extended events)
    pub data: Option<SessionEventDataDto>,
}

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

// MARK: - Events

/// Event emitted when a session is completed.
#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct SessionCompletedEvent(pub SessionSummaryDto);
