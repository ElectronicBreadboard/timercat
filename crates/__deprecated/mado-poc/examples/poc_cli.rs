/// POC: CLI application with explicit main event loop
///
/// For CLI apps without a native event loop (like Tauri), you must run
/// CFRunLoopRun() on the main thread for NSWorkspace notifications to work.
///
/// Usage: cargo run --example poc_cli
use mado_poc::{is_accessibility_trusted, WindowListener, WindowMonitor};
use std::thread;
use std::time::Duration;

struct PrintListener;

impl WindowListener for PrintListener {
    fn on_window_change(&self, title: String) {
        println!("[CLI] Window: {}", title);
    }
}

fn main() {
    println!("=== Mado POC: CLI Application ===\n");

    if !is_accessibility_trusted() {
        eprintln!("❌ Accessibility permissions required!");
        eprintln!("   System Settings → Privacy & Security → Accessibility");
        return;
    }
    println!("✅ Accessibility permissions granted\n");

    // Spawn monitor thread
    thread::spawn(|| {
        println!("[Monitor Thread] Started\n");
        let monitor = WindowMonitor::new();
        if let Err(e) = monitor.run(PrintListener) {
            eprintln!("[Monitor Thread] Error: {}", e);
        }
        println!("[Monitor Thread] Stopped");
    });

    // Auto-stop after 30 seconds
    thread::spawn(|| {
        thread::sleep(Duration::from_secs(30));
        println!("\n[Timeout] Stopping...");
        WindowMonitor::stop();
        // Stop main runloop too
        unsafe {
            extern "C" {
                fn CFRunLoopStop(rl: *const std::ffi::c_void);
                fn CFRunLoopGetMain() -> *const std::ffi::c_void;
            }
            CFRunLoopStop(CFRunLoopGetMain());
        }
    });

    // CLI apps MUST run main event loop for NSWorkspace notifications
    println!("[Main Thread] Running CFRunLoop (required for CLI apps)");
    println!("Switch apps to test. Auto-stops in 30 seconds.\n");
    unsafe {
        extern "C" {
            fn CFRunLoopRun();
        }
        CFRunLoopRun();
    }

    println!("\n=== Done ===");
}
