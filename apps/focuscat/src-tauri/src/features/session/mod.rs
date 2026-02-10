pub mod commands;
pub mod repository;
pub mod session;
pub mod types;

use crate::environment::db::DatabaseState;
use crate::features::timer::types::TimerState;
use chrono::Utc;
use tauri::{App, AppHandle, Manager};

pub fn setup(app: &App) {
    let pool = app.state::<DatabaseState>().pool.clone();

    tauri::async_runtime::spawn(async move {
        match repository::SessionRepository::cleanup_orphaned(&pool).await {
            Ok(count) => {
                if count > 0 {
                    println!("[session] Cleaned up {} orphaned session(s)", count);
                }
            }
            Err(e) => {
                eprintln!("[session] Failed to cleanup orphaned sessions: {}", e);
            }
        }
    });
}

pub fn exit(app: &AppHandle) {
    let session_info = {
        let timer_state = app.state::<TimerState>();
        let timer = timer_state.lock().unwrap();
        timer.session.as_ref().map(|s| (s.id, s.started_at))
    };

    let Some((id, started_at)) = session_info else {
        return;
    };

    let pool = app.state::<DatabaseState>().pool.clone();
    let now = Utc::now().timestamp_millis();
    let actual_seconds = ((now - started_at) / 1000) as u32;

    // Block to ensure cleanup completes before app exits
    tauri::async_runtime::block_on(async move {
        match repository::SessionRepository::cancel(&pool, id, now, actual_seconds).await {
            Ok(()) => {
                println!("[session] Cancelled active session {} on exit", id);
            }
            Err(e) => {
                eprintln!("[session] Failed to cancel session on exit: {}", e);
            }
        }
    });
}
