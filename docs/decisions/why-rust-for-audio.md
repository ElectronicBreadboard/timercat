# Why Rust for Audio

## Decision

We use **Rust (Rodio)** for all sound effects in FocusCat, including timer sounds (tick, complete) and UI sounds (cat meow).

## Rationale

### Why Rust

#### Timer Sounds Belong with the Timer

The timer runs in a Rust background thread (`TimerRunner`), ticking every second independent of the frontend. Playing sounds directly from the timer loop is simpler than emitting events to the frontend and subscribing there.

#### Settings Stay Centralized

`AppSettingsState` is the source of truth for all settings, managed in Rust. Future sound settings (volume, mute) naturally belong here. No need to sync settings between Rust and frontend.

#### Follows Fat Commands Pattern

Our [Rust backend architecture](./rust-backend-architecture.md) uses "fat commands" where Rust orchestrates side effects. Sound playback fits this pattern. The frontend just calls `specta.commands.playSound('meow')` - Rust handles the rest.

#### Frontend Stays Simple

No audio context, no settings subscriptions, no state management for sounds. Components just invoke commands.

## Trade-offs

### Rodio Dependency

Adds a crate dependency, but Rodio is well-maintained and handles cross-platform audio. It's the same library [Bevy](https://crates.io/crates/bevy_audio/0.18.0/dependencies) uses under the hood.

### Thread Per Sound

Each sound spawns a thread. For notification sounds (~1/second max), this overhead is negligible.

## Alternatives Considered

- **Frontend (HTMLAudioElement)**: Simpler initially, but requires event subscriptions for timer sounds, settings sync between Rust/frontend.
- **Hybrid (timer in Rust, UI in frontend)**: Inconsistent architecture, settings in two places.
