/// POC: Tauri-style application pattern
///
/// This simulates how mado would be used in a Tauri app:
/// 1. Monitor starts in spawned thread during setup()
/// 2. Main thread runs Tauri's native event loop
/// 3. NSWorkspace notifications work because Tauri runs the main runloop
///
/// In real Tauri app, you'd call this in your setup() function:
/// ```rust
/// std::thread::spawn(move || {
///     let monitor = WindowMonitor::new();
///     monitor.run(MyHandler).expect("Monitor failed");
/// });
/// ```
///
/// Usage: cargo run --example poc_tauri_style
use mado_poc::{is_accessibility_trusted, WindowListener, WindowMonitor};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

struct TauriStyleHandler {
    // In real Tauri, this would be AppHandle
    event_count: Arc<std::sync::atomic::AtomicUsize>,
}

impl WindowListener for TauriStyleHandler {
    fn on_window_change(&self, title: String) {
        let count = self.event_count.fetch_add(1, Ordering::SeqCst) + 1;
        println!("[Tauri Handler] Event #{}: {}", count, title);

        // In real Tauri, you'd emit events to frontend:
        // ActiveWindowChangedEvent { title }.emit(&app_handle);
    }
}

/// Simulates Tauri's setup() function
fn tauri_setup(running: Arc<AtomicBool>) {
    println!("[Tauri Setup] Checking permissions...");

    if !is_accessibility_trusted() {
        eprintln!("[Tauri Setup] ❌ Accessibility permissions required!");
        // In real Tauri, show dialog here
        return;
    }
    println!("[Tauri Setup] ✅ Permissions OK");

    // Create handler (in real Tauri, would hold AppHandle)
    let handler = TauriStyleHandler {
        event_count: Arc::new(std::sync::atomic::AtomicUsize::new(0)),
    };

    // Start monitor in background thread (exactly like real Tauri usage)
    let running_clone = running.clone();
    thread::spawn(move || {
        println!("[Monitor Thread] Started");

        let monitor = WindowMonitor::new();
        if let Err(e) = monitor.run(handler) {
            eprintln!("[Monitor Thread] Error: {}", e);
        }

        println!("[Monitor Thread] Stopped");
        running_clone.store(false, Ordering::SeqCst);
    });

    println!("[Tauri Setup] Monitor started in background thread");
}

/// Simulates Tauri's main event loop
fn tauri_run(running: Arc<AtomicBool>) {
    println!("[Tauri Main] Running native event loop...");
    println!("[Tauri Main] (In real Tauri, this is tauri::Builder::build().run())\n");
    println!("Switch apps to test. Press Ctrl+C to stop.\n");

    // Auto-stop after 30 seconds (simulates app quit)
    let running_clone = running.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(30));
        println!("\n[Timeout] Simulating app quit...");
        WindowMonitor::stop();
        running_clone.store(false, Ordering::SeqCst);

        // Stop main runloop
        unsafe {
            extern "C" {
                fn CFRunLoopStop(rl: *const std::ffi::c_void);
                fn CFRunLoopGetMain() -> *const std::ffi::c_void;
            }
            CFRunLoopStop(CFRunLoopGetMain());
        }
    });

    // This is what Tauri does internally - runs the native event loop
    // NSWorkspace notifications are delivered here
    unsafe {
        extern "C" {
            fn CFRunLoopRun();
        }
        CFRunLoopRun();
    }
}

fn main() {
    println!("=== Mado POC: Tauri-Style Application ===\n");
    println!("This simulates Tauri's architecture:");
    println!("  1. setup() spawns monitor thread");
    println!("  2. run() runs native event loop on main thread");
    println!("  3. NSWorkspace notifications work automatically\n");

    let running = Arc::new(AtomicBool::new(true));

    // Phase 1: Setup (like tauri::Builder::setup())
    tauri_setup(running.clone());

    // Phase 2: Run (like tauri::Builder::build().run())
    tauri_run(running.clone());

    println!("\n=== Tauri-Style POC Complete ===");
}
