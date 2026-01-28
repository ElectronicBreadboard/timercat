use super::{player, player::SoundId};
use tauri::AppHandle;

/// Play a sound effect.
#[tauri::command]
#[specta::specta]
pub fn play_sound(app: AppHandle, id: SoundId) -> Result<(), String> {
    player::play(&app, id);
    Ok(())
}
