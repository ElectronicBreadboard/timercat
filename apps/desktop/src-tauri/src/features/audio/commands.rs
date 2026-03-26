use super::audio;
use super::types::SoundId;
use tauri::AppHandle;

/// Play a sound effect.
#[tauri::command]
#[specta::specta]
pub fn play_sound(app: AppHandle, id: SoundId) -> Result<(), String> {
    audio::play(&app, id);
    return Ok(());
}
