use super::timer::{Timer, TimerConfig, TimerStatus};
use crate::features::settings::types::AppSettingsState;
use serde::Serialize;
use std::ops::Deref;
use std::sync::Mutex;
use tauri::{App, Manager};

// MARK: - DTO

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TimerDto {
    pub status: TimerStatus,
    pub session_type: String,
    pub total_seconds: u32,
    pub remaining_seconds: u32,
    pub overtime_seconds: u32,
    pub sessions_completed: u32,
    pub speed: u32,
}

impl From<&Timer> for TimerDto {
    fn from(timer: &Timer) -> Self {
        return Self {
            status: timer.status,
            session_type: timer.session_type.as_str().to_string(),
            total_seconds: timer.total_seconds,
            remaining_seconds: timer.remaining_seconds,
            overtime_seconds: timer.overtime_seconds,
            sessions_completed: timer.sessions_completed,
            speed: timer.speed,
        };
    }
}

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

// MARK: - Events

#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct TimerUpdatedEvent(pub TimerDto);
