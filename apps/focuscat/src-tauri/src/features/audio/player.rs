use crate::common::path::get_resource_path;
use rodio::{Decoder, OutputStream, Sink};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::{fs::File, io::BufReader, path::PathBuf, thread};
use tauri::AppHandle;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Type)]
pub enum SoundId {
    #[serde(rename = "tick")]
    Tick,
    #[serde(rename = "complete")]
    Complete,
    #[serde(rename = "meow")]
    Meow,
}

/// Play a sound effect in a background thread.
pub fn play(app: &AppHandle, id: SoundId) {
    let path = match get_audio_path(app, id) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("{}", e);
            return;
        }
    };

    // Spawn thread so we don't block the caller
    thread::spawn(move || {
        // Open audio file
        let file = match File::open(&path) {
            Ok(f) => f,
            Err(e) => {
                eprintln!("Failed to open audio file {:?}: {}", path, e);
                return;
            }
        };
        let reader = BufReader::new(file);

        // Create output stream (must stay alive for audio to play)
        let (_stream, stream_handle) = match OutputStream::try_default() {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Failed to create audio output stream: {}", e);
                return;
            }
        };

        let sink = match Sink::try_new(&stream_handle) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Failed to create audio sink: {}", e);
                return;
            }
        };

        // Set volume (0.0 to 1.0)
        sink.set_volume(0.6);

        // Decode audio from file
        let source = match Decoder::new(reader) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Failed to decode audio: {}", e);
                return;
            }
        };

        sink.append(source);
        sink.sleep_until_end();
    });
}

/// Get the audio file path for a sound ID.
fn get_audio_path(app: &AppHandle, id: SoundId) -> Result<PathBuf, String> {
    let filename = match id {
        SoundId::Tick => "timer-tick.mp3",
        SoundId::Complete => "timer-complete.mp3",
        SoundId::Meow => "cat-meow.mp3",
    };
    get_resource_path(app, &format!("audio/{}", filename))
}
