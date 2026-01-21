use super::timer::{Timer, TimerConfig, TimerStatus, WorkSessionStats};
use crate::features::session::session::Phase;
use crate::features::settings::types::AppSettingsState;
use serde::Serialize;
use std::ops::Deref;
use std::sync::Mutex;
use tauri::{App, Manager};

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TimerDto {
    pub status: TimerStatus,
    pub phase: Phase,
    pub total_seconds: u32,
    pub remaining_seconds: u32,
    pub overtime_seconds: u32,
    pub sessions_completed: u32,
    pub last_work_session: Option<WorkSessionStats>,
    pub speed: u32,
}

impl From<&Timer> for TimerDto {
    fn from(timer: &Timer) -> Self {
        Self {
            status: timer.status,
            phase: timer.phase,
            total_seconds: timer.total_seconds,
            remaining_seconds: timer.remaining_seconds,
            overtime_seconds: timer.overtime_seconds,
            sessions_completed: timer.sessions_completed,
            last_work_session: timer.last_work_session.clone(),
            speed: timer.speed,
        }
    }
}

// MARK: - Events

#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct TimerUpdatedEvent(pub TimerDto);

// MARK: - State

pub struct TimerState(Mutex<Timer>);

impl TimerState {
    pub fn init(app: &App) -> Self {
        let settings_state = app.state::<AppSettingsState>();
        let settings = settings_state.lock().unwrap();
        let config = TimerConfig::from(&*settings);
        return Self(Mutex::new(Timer::new(&config)));
    }
}

impl Deref for TimerState {
    type Target = Mutex<Timer>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}
