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

    // Start monitor in separate thread
    thread::spawn(|| {
        let monitor = WindowMonitor::new();
        monitor.run(MyListener).expect("Failed to run monitor");
    });

    // Run for 30 seconds then stop
    thread::sleep(Duration::from_secs(30));
    println!("\nStopping...");
    WindowMonitor::stop();

    // Give time for cleanup
    thread::sleep(Duration::from_secs(1));
}
