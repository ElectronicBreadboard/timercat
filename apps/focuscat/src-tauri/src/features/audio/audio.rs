use super::types::{AudioState, SoundId};
use crate::common::path::get_resource_path;
use rodio::{mixer::Mixer, Decoder, OutputStreamBuilder, Sink};
use std::{collections::HashMap, io::Cursor, path::PathBuf, sync::Arc};
use tauri::{App, AppHandle, Manager};

/// Audio player with shared mixer and pre-loaded sounds.
///
/// Inspired by bevy_audio: https://github.com/bevyengine/bevy/tree/main/crates/bevy_audio
pub struct Audio {
    mixer: &'static Mixer,
    sounds: HashMap<SoundId, Arc<[u8]>>,
    volume: f32,
}

impl Audio {
    /// Create new Audio instance with pre-loaded sounds.
    ///
    /// Returns `None` if no audio output device is available.
    pub fn new(app: &App) -> Option<Self> {
        let stream = OutputStreamBuilder::open_default_stream().ok()?;

        // Leak the OutputStream to get a static reference to its mixer.
        // The OutputStream must stay alive for the app lifetime, and leaking
        // gives us a 'static Mixer reference that's Send + Sync.
        let stream_ref: &'static _ = Box::leak(Box::new(stream));
        let mixer: &'static Mixer = stream_ref.mixer();

        let mut audio = Self {
            mixer,
            sounds: HashMap::new(),
            volume: 0.6,
        };

        audio.load_sounds(app.handle());

        return Some(audio);
    }

    /// Play a sound effect.
    pub fn play(&self, id: SoundId) {
        let bytes = match self.sounds.get(&id) {
            Some(b) => Arc::clone(b),
            None => {
                eprintln!("Sound {:?} not loaded", id);
                return;
            }
        };

        let sink = Sink::connect_new(self.mixer);
        sink.set_volume(self.volume);

        let cursor = Cursor::new(bytes);
        match Decoder::new(cursor) {
            Ok(source) => {
                sink.append(source);
                sink.detach();
            }
            Err(e) => {
                eprintln!("Failed to decode audio: {}", e);
            }
        }
    }

    fn load_sounds(&mut self, app: &AppHandle) {
        let ids = [
            SoundId::Tick,
            SoundId::Complete,
            SoundId::Meow,
            SoundId::WindUpTick1,
            SoundId::WindUpTick2,
            SoundId::WindUpTick3,
            SoundId::WindUpTick4,
            SoundId::WindUpTick5,
            SoundId::WindUpTick6,
            SoundId::WindUpTick7,
            SoundId::WindUpTick8,
            SoundId::WindUpTick9,
            SoundId::WindUpTick10,
            SoundId::WindUpTick11,
        ];
        for id in ids {
            if let Ok(path) = get_audio_path(app, id) {
                match std::fs::read(&path) {
                    Ok(bytes) => {
                        self.sounds.insert(id, bytes.into());
                    }
                    Err(e) => {
                        eprintln!("Failed to load {:?}: {}", path, e);
                    }
                }
            }
        }
    }
}

/// Play a sound effect.
///
/// Convenience function that retrieves AudioState from app and plays the sound.
/// Does nothing if audio is unavailable.
pub fn play(app: &AppHandle, id: SoundId) {
    if let Some(state) = app.try_state::<AudioState>() {
        state.play(id);
    }
}

fn get_audio_path(app: &AppHandle, id: SoundId) -> Result<PathBuf, String> {
    let filename = match id {
        SoundId::Tick => "timer-tick.mp3",
        SoundId::Complete => "timer-complete.mp3",
        SoundId::Meow => "cat-meow.mp3",
        SoundId::WindUpTick1 => "timer-wind-up-tick-1.mp3",
        SoundId::WindUpTick2 => "timer-wind-up-tick-2.mp3",
        SoundId::WindUpTick3 => "timer-wind-up-tick-3.mp3",
        SoundId::WindUpTick4 => "timer-wind-up-tick-4.mp3",
        SoundId::WindUpTick5 => "timer-wind-up-tick-5.mp3",
        SoundId::WindUpTick6 => "timer-wind-up-tick-6.mp3",
        SoundId::WindUpTick7 => "timer-wind-up-tick-7.mp3",
        SoundId::WindUpTick8 => "timer-wind-up-tick-8.mp3",
        SoundId::WindUpTick9 => "timer-wind-up-tick-9.mp3",
        SoundId::WindUpTick10 => "timer-wind-up-tick-10.mp3",
        SoundId::WindUpTick11 => "timer-wind-up-tick-11.mp3",
    };
    return get_resource_path(app, &format!("audio/{}", filename));
}
