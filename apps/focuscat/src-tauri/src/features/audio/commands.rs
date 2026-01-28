use super::types::{AudioState, SoundId};
use tauri::State;

/// Play a sound effect.
#[tauri::command]
#[specta::specta]
pub fn play_sound(audio: State<'_, AudioState>, id: SoundId) -> Result<(), String> {
    audio.play(id);
    return Ok(());
}
