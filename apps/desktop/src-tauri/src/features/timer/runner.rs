use super::{
    timer::TimerStatus,
    types::{TimerDto, TimerState, TimerUpdatedEvent},
};
use crate::features::audio::{audio, types::SoundId};
use crate::features::settings::types::AppSettingsState;
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

#[cfg(target_os = "macos")]
use crate::app::tray::TrayState;

// MARK: - Timer Runner

/// Handle to control the timer runner thread.
pub struct TimerRunner {
    stop_flag: Arc<AtomicBool>,
}

impl TimerRunner {
    /// Start timer runner in background thread.
    pub fn start(app: AppHandle) -> Self {
        let stop_flag = Arc::new(AtomicBool::new(false));
        let stop_flag_clone = stop_flag.clone();

        thread::spawn(move || {
            run_timer_loop(app, stop_flag_clone);
        });

        return Self { stop_flag };
    }

    /// Stop the timer runner.
    pub fn stop(&self) {
        self.stop_flag.store(true, Ordering::SeqCst);
    }
}

// MARK: - Timer Loop

fn run_timer_loop(app: AppHandle, stop_flag: Arc<AtomicBool>) {
    loop {
        if stop_flag.load(Ordering::SeqCst) {
            break;
        }

        // Get sleep duration based on speed
        let (sleep_duration, speed) = {
            let timer_state = match app.try_state::<TimerState>() {
                Some(s) => s,
                None => {
                    thread::sleep(Duration::from_millis(100));
                    continue;
                }
            };

            let timer = timer_state.lock().unwrap();

            if timer.status != TimerStatus::Running {
                drop(timer);
                thread::sleep(Duration::from_millis(100));
                continue;
            }

            let speed = app
                .try_state::<AppSettingsState>()
                .map(|s| s.lock().unwrap().developer.timer_speed)
                .unwrap_or(1)
                .max(1);

            (Duration::from_millis(1000 / speed as u64), speed)
        };

        thread::sleep(sleep_duration);

        if stop_flag.load(Ordering::SeqCst) {
            break;
        }

        // Get state for tick
        let state_handle = match app.try_state::<TimerState>() {
            Some(s) => s,
            None => continue,
        };

        let mut timer = state_handle.lock().unwrap();

        if timer.status != TimerStatus::Running {
            continue;
        }

        let was_in_overtime = timer.overtime_seconds > 0;

        // Count down or count overtime
        if timer.remaining_seconds > 0 {
            timer.remaining_seconds -= 1;
        } else {
            timer.overtime_seconds += 1;
        }

        // Play tick sound each second (only at 1x speed; at higher speeds it would overlap)
        if speed == 1 {
            audio::play(&app, SoundId::Tick);
        }

        // Play complete sound when entering overtime
        if !was_in_overtime && timer.overtime_seconds > 0 {
            audio::play(&app, SoundId::Complete);
        }

        let _ = TimerUpdatedEvent(TimerDto::from(&*timer)).emit(&app);

        // Update tray with remaining time
        #[cfg(target_os = "macos")]
        TrayState::set_timer(&app, Some(timer.remaining_seconds));
    }
}
