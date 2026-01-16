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

## 📦 Installation

```toml
[dependencies]
mado = "0.0.1"
```

## 📖 Usage

### Query current state

```rust
use mado;

// Get current app
let app = mado::get_active_app()?;
println!("Current app: {}", app);

// Get current window (fast, default)
let window = mado::get_active_window()?;
println!("Window: {}", window);

// With browser URL extraction (macOS only)
let window = mado::get_active_window_with_config(mado::QueryConfig {
    allow_browser: true,
})?;
if let Some(browser) = &window.browser {
    println!("URL: {:?}", browser.url);
    println!("Private mode: {}", browser.is_private);
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
                println!("App: {}", app);
            }
            WindowEvent::WindowChanged { window } => {
                println!("Window: {}", window);
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
    allow_browser: true,
    track_window_changes: true,
};
let monitor = WindowMonitor::with_config(MyListener, config);
monitor.run()?;
```

**Supported browsers:** Chrome, Safari, Brave, Edge, Arc, Opera, Firefox (and their variants).

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

Event-driven monitoring minimizes latency and reduces CPU usage by avoiding continuous polling.

### Why Two Event Types?

Two events handle different scenarios:

- **`AppActivated`**: Fires immediately when app is activated (even if no window yet)
- **`WindowChanged`**: Fires when window data is available (title, bounds, browser info)

**Why not combine into one event?** A single event with `Option<WindowInfo>` would miss app activations when apps don't have windows (e.g. tray apps, apps activated via Spotlight before opening a window). Consumers need to know the app was activated even if no window exists yet.

### macOS Implementation

Uses Swift via [swift-rs](https://github.com/Brendonovich/swift-rs) for native API access:

| Component             | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| **NSWorkspace**       | App switch detection via `didActivateApplicationNotification` |
| **Accessibility API** | Window focus/title changes, browser URL extraction            |
| **CoreGraphics**      | Stable window IDs and accurate bounds                         |

**Why Accessibility API for browser URLs?** Previously used AppleScript, but it required per-browser Automation permissions and didn't support Firefox. The Accessibility API only needs the system-wide Accessibility permission and works with all browsers by traversing the UI tree to find the URL bar.

**Browser URL extraction strategies:**

- **Chromium** (Chrome, Brave, Edge, Arc, Opera): Find `AXTextField` by `AXDOMIdentifier` or placeholder text
- **Safari**: Read `AXURL` from `AXWebArea` element
- **Firefox**: Find `AXTextField` with "address" in description

**Threading Model:**

- Monitor runs in a spawned thread with its own CFRunLoop
- NSWorkspace notifications arrive on main thread, forwarded to monitor thread via `CFRunLoopPerformBlock`
- AXObserver callbacks delivered directly to monitor thread's runloop

**Delayed Window Handling:**

Some apps (especially when launched from Dock) activate before their window appears. We use exponential backoff polling (200ms → 400ms → 800ms → 1.6s capped, max ~30s total) to catch delayed windows.

## 💡 Resources / References

- [swift-rs](https://github.com/Brendonovich/swift-rs) - Rust ↔ Swift FFI
- [Creating a standalone Swift package with Xcode](https://developer.apple.com/documentation/xcode/creating-a-standalone-swift-package-with-xcode)
- [Accessibility API Reference](https://developer.apple.com/documentation/applicationservices/axuielement_h)
