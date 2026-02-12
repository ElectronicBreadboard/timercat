use super::audio::Audio;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::App;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Type)]
pub enum SoundId {
    #[serde(rename = "tick")]
    Tick,
    #[serde(rename = "complete")]
    Complete,
    #[serde(rename = "meow")]
    Meow,
    #[serde(rename = "wind-up-tick-1")]
    WindUpTick1,
    #[serde(rename = "wind-up-tick-2")]
    WindUpTick2,
    #[serde(rename = "wind-up-tick-3")]
    WindUpTick3,
    #[serde(rename = "wind-up-tick-4")]
    WindUpTick4,
    #[serde(rename = "wind-up-tick-5")]
    WindUpTick5,
    #[serde(rename = "wind-up-tick-6")]
    WindUpTick6,
    #[serde(rename = "wind-up-tick-7")]
    WindUpTick7,
    #[serde(rename = "wind-up-tick-8")]
    WindUpTick8,
    #[serde(rename = "wind-up-tick-9")]
    WindUpTick9,
    #[serde(rename = "wind-up-tick-10")]
    WindUpTick10,
    #[serde(rename = "wind-up-tick-11")]
    WindUpTick11,
}

// MARK: - State

pub struct AudioState(Option<Audio>);

impl AudioState {
    pub fn init(app: &App) -> Self {
        return Self(Audio::new(app));
    }

    /// Play a sound effect. Does nothing if audio is unavailable.
    pub fn play(&self, id: SoundId) {
        if let Some(audio) = &self.0 {
            audio.play(id);
        }
    }
}
