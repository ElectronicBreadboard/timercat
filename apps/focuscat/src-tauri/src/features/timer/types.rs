use super::timer::{Timer, TimerConfig};
use crate::features::session::session::Phase;
use crate::features::settings::types::AppSettingsState;
use serde::Serialize;
use std::ops::Deref;
use std::sync::Mutex;
use tauri::{App, Manager};

// MARK: - Events

#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct TimerUpdatedEvent(pub Timer);

#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct TimerCompleteEvent(pub Phase);

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
