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
