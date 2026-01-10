use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

use super::types::{
    Timer, TimerCompleteEvent, TimerPhase, TimerSettings, TimerSettingsState, TimerState,
    TimerStatus, TimerTickEvent,
};

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
        // Check stop flag
        if stop_flag.load(Ordering::SeqCst) {
            break;
        }

        // Sleep for 1 second
        thread::sleep(Duration::from_secs(1));

        // Check stop flag again after sleep
        if stop_flag.load(Ordering::SeqCst) {
            break;
        }

        // Get state and settings
        let state_handle = match app.try_state::<TimerState>() {
            Some(s) => s,
            None => continue,
        };
        let settings_handle = match app.try_state::<TimerSettingsState>() {
            Some(s) => s,
            None => continue,
        };

        // Lock and process
        let mut timer = state_handle.lock().unwrap();
        let settings = settings_handle.lock().unwrap();

        // Only tick if running
        if timer.status != TimerStatus::Running {
            continue;
        }

        // Decrement remaining seconds
        if timer.remaining_seconds > 0 {
            timer.remaining_seconds -= 1;
        }

        // Emit tick event
        let _ = TimerTickEvent(timer.clone()).emit(&app);

        // Check if phase completed
        if timer.remaining_seconds == 0 {
            let completed_phase = timer.phase;

            // Transition to next phase
            transition_to_next_phase(&mut timer, &settings);

            // Emit completion event
            let _ = TimerCompleteEvent(completed_phase).emit(&app);

            // Emit tick with new state
            let _ = TimerTickEvent(timer.clone()).emit(&app);
        }
    }
}

fn transition_to_next_phase(timer: &mut Timer, settings: &TimerSettings) {
    let is_work_phase = timer.phase == TimerPhase::Work;

    // Increment sessions if work phase completed
    if is_work_phase {
        timer.sessions_completed += 1;
    }

    // Determine next phase
    let next_phase = if is_work_phase {
        if timer.sessions_completed % settings.sessions_before_long_break == 0 {
            TimerPhase::LongBreak
        } else {
            TimerPhase::ShortBreak
        }
    } else {
        TimerPhase::Work
    };

    // Update state
    let next_duration = Timer::get_duration_for_phase(next_phase, settings);
    timer.status = TimerStatus::Idle;
    timer.phase = next_phase;
    timer.total_seconds = next_duration;
    timer.remaining_seconds = next_duration;
}
