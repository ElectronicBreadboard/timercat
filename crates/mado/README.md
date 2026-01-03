# mado (窓)

> A simple, clean window monitoring library for Rust

## 🌐 Platform Support

- ✅ **macOS**: Full support
- 🚧 **Linux**: Planned
- 🚧 **Windows**: Planned

### Requirements

**macOS:**

- macOS 10.9+
- **Accessibility permissions** required if `track_window_changes: true` (default)
  - System Settings > Privacy & Security > Accessibility
  - Not required if only tracking app switches (`track_window_changes: false`)
- **Automation permissions** (optional, for browser URL extraction)
  - System Settings > Privacy & Security > Automation

## 📦 Installation

```toml
[dependencies]
mado = "0.0.1"
```

## 📖 Usage

### Query current state

```rust
use mado;

let app = mado::get_active_app()?;
println!("Current app: {} (PID: {})", app.name, app.pid);

let window = mado::get_active_window()?;
println!("Window: '{}' in {}", window.title, window.app.name);

// With browser URL extraction (slower, uses AppleScript)
let window = mado::get_active_window_with_browser()?;
if let Some(browser) = &window.browser {
    println!("URL: {:?}", browser.url);
}
```

### Listen to changes

```rust
use mado::{WindowListener, WindowMonitor, WindowEvent};

struct FocusListener;

impl WindowListener for FocusListener {
    fn on_focus_change(&self, event: WindowEvent) {
        match event {
            WindowEvent::AppActivated { app } => {
                println!("App activated: {}", app.name);
            }
            WindowEvent::WindowChanged { window } => {
                println!("Window: '{}'", window.title);
            }
        }
    }
}

let monitor = WindowMonitor::new(FocusListener);
monitor.run()?;
```

### Browser URL extraction (macOS only)

```rust
use mado::{WindowListener, WindowMonitor, MonitorConfig, WindowEvent};

struct MyListener;

impl WindowListener for MyListener {
    fn on_focus_change(&self, event: WindowEvent) {
        if let WindowEvent::WindowChanged { window } = event {
            if let Some(browser) = &window.browser {
                if let Some(url) = &browser.url {
                    println!("URL: {}", url);
                }
                if let Some(is_private) = browser.is_private {
                    println!("Private mode: {}", is_private);
                }
            }
        }
    }
}

let config = MonitorConfig {
    allow_browser: true, // Requires Automation permission
    track_window_changes: true,
};
let monitor = WindowMonitor::with_config(MyListener, config);
monitor.run()?;
```

**Note:** Browser URL extraction requires Automation permission on macOS. If not granted, `window.browser` will be `None`. Supported browsers include Chrome, Safari, Brave, Edge, Arc, and Opera. Firefox is not supported (no AppleScript interface).

### Stop monitoring

```rust
use mado::WindowMonitor;
use std::thread;
use std::time::Duration;

let monitor = WindowMonitor::new(MyListener);

thread::spawn(move || {
    thread::sleep(Duration::from_secs(5));
    WindowMonitor::stop().unwrap();
});

monitor.run()?;
```

### Check permissions (macOS)

```rust
if !mado::is_accessibility_trusted() {
    eprintln!("Please grant accessibility permissions in System Settings");
}
```

## 📐 Architecture

### Why Event-Driven?

Event-driven monitoring minimizes latency and potentially reduces CPU usage and power consumption by avoiding continuous polling.

### Why Two Event Types?

Two events handle different scenarios and provide explicit control:

- **`AppActivated`**: Fires immediately when app is activated (even if no window yet, e.g. tray apps). Provides instant app switch detection.
- **`WindowChanged`**: Fires when window data is available. Provides complete context (title, bounds, browser info).

**Why not combine into one event?** A single event with `Option<WindowInfo>` would be less explicit and wouldn't distinguish "app changed" vs "window changed". More importantly, it would miss app activations when apps don't have windows (e.g. tray apps, apps activated via Spotlight before opening a window). Consumers might need to know the app was activated even if no window exists yet.

### Platform Implementation

#### macOS

Uses Swift via [swift-rs](https://github.com/Brendonovich/swift-rs) for native API access. The Swift code handles:

1. **NSWorkspace** - Detects app switches via `didActivateApplicationNotification`
2. **Accessibility API** - Observes window focus changes (`kAXFocusedWindowChangedNotification`) and title changes (`kAXTitleChangedNotification`)
3. **CoreGraphics** - Provides stable window IDs and accurate bounds (Accessibility API doesn't expose window IDs reliably)
4. **AppleScript** - Extracts browser URLs and private mode detection (optional, requires Automation permission)

**Threading Model:**

- Monitor runs in a spawned thread with its own CFRunLoop
- NSWorkspace notifications arrive on main thread, forwarded to monitor thread via `CFRunLoopPerformBlock`
- AXObserver callbacks delivered directly to monitor thread's runloop

**Delayed Window Handling:**
Some apps (especially when launched from Dock) activate before their window appears. We use exponential backoff polling (200ms → 400ms → 800ms → 1.6s capped, max ~5 min) to catch delayed windows.

## 💡 Resources / References

- [swift-rs](https://github.com/Brendonovich/swift-rs)
- [Creating a standalone Swift package with Xcode](https://developer.apple.com/documentation/xcode/creating-a-standalone-swift-package-with-xcode)
