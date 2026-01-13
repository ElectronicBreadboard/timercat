use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

use super::types::{TimerCompleteEvent, TimerState, TimerStatus, TimerTickEvent};

#[cfg(target_os = "macos")]
use crate::app::tray::set_tray_timer;

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

fn run_timer_loop(app: AppHandle, stop_flag: Arc<AtomicBool>) {
    loop {
        if stop_flag.load(Ordering::SeqCst) {
            break;
        }

        // Get sleep duration based on speed (faster tick = faster countdown)
        let sleep_duration = {
            let state_handle = match app.try_state::<TimerState>() {
                Some(s) => s,
                None => {
                    thread::sleep(Duration::from_millis(100));
                    continue;
                }
            };
            let timer = state_handle.lock().unwrap();

            if timer.status != TimerStatus::Running {
                drop(timer);
                thread::sleep(Duration::from_millis(100));
                continue;
            }

            Duration::from_millis(1000 / timer.speed.max(1) as u64)
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

        // Count down or count overtime
        if timer.remaining_seconds > 0 {
            timer.remaining_seconds -= 1;

            // Emit complete event when hitting zero
            if timer.remaining_seconds == 0 {
                let _ = TimerCompleteEvent(timer.phase).emit(&app);
            }
        } else {
            // Count overtime after completion
            timer.overtime_seconds += 1;
        }

        let _ = TimerTickEvent(timer.clone()).emit(&app);

        // Update tray with remaining time
        #[cfg(target_os = "macos")]
        set_tray_timer(&app, Some(timer.remaining_seconds));
    }
}
