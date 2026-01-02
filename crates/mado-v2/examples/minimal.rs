use mado_v2::{WindowListener, WindowMonitor};
use std::thread;
use std::time::Duration;

struct MyListener;

impl WindowListener for MyListener {
    fn on_window_change(&self, title: String) {
        println!("Window changed: {}", title);
    }
}

fn main() {
    println!("Starting window monitor...");
    println!("Switch apps or windows to see changes");
    println!("Press Ctrl+C to stop\n");

    // Auto-stop after 60 seconds
    thread::spawn(|| {
        thread::sleep(Duration::from_secs(60));
        println!("\nStopping after timeout...");
        WindowMonitor::stop();
    });

    // Run monitor on main thread (required for app activation notifications)
    let monitor = WindowMonitor::new();
    monitor.run(MyListener).expect("Failed to run monitor");
}
