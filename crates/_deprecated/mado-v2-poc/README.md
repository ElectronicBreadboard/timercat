# Mado POC - Swift-based macOS Window Monitoring

> **Note**: This is a proof-of-concept. The actual `mado` library will be built based on this POC.

Minimal, event-driven macOS window monitoring library using Swift + Rust via `swift-rs`.

## Features

- ✅ **Event-driven**: Callback-based, not polling
- ✅ **Cross-app switching**: Detects app activation (NSWorkspace)
- ✅ **Window title changes**: Detects in-app title changes (Accessibility API)
- ✅ **Thread-flexible**: Can run on any thread (main or spawned)
- ✅ **Memory safe**: Swift ARC handles observer lifecycle
- ✅ **Permission check**: `is_accessibility_trusted()` API for permission prompts
- ✅ **Minimal FFI**: Only 3 functions cross the Rust/Swift boundary

## Architecture

```
Rust (mado)
    ↓ call once
Swift (MadoSwift)
    ↓ setup observers
NSWorkspace + Accessibility API
    ↓ callbacks on events
Swift
    ↓ C callback
Rust (WindowListener trait)
```

## Usage

```rust
use mado_v2::{is_accessibility_trusted, WindowListener, WindowMonitor};

struct MyListener;

impl WindowListener for MyListener {
    fn on_window_change(&self, title: String) {
        println!("Window changed: {}", title);
    }
}

fn main() {
    // Check permissions first (required for window monitoring)
    if !is_accessibility_trusted() {
        eprintln!("Enable accessibility permissions in System Preferences");
        return;
    }

    // Run in spawned thread (leaves main thread free for Tauri)
    std::thread::spawn(|| {
        let monitor = WindowMonitor::new();
        monitor.run(MyListener).expect("Failed to run monitor");
    });

    // Stop from any thread
    WindowMonitor::stop();
}
```

## Examples

Two POC examples are provided:

### CLI Application (`poc_cli.rs`)

For CLI apps without a native event loop. Requires explicit `CFRunLoopRun()` on main thread.

```bash
cargo run --example poc_cli
```

### Tauri-Style Application (`poc_tauri_style.rs`)

Simulates Tauri's architecture - exactly how you'd use mado in a real Tauri app.

```bash
cargo run --example poc_tauri_style
```

## POC Results

Both examples demonstrate:

1. ✅ Monitor runs in spawned thread (not main thread)
2. ✅ Main thread remains free (perfect for Tauri tray apps)
3. ✅ Detects app switching (NSWorkspace notifications)
4. ✅ Detects window title changes (Accessibility API)
5. ✅ Cross-thread control (stop from any thread)

**Key insight**: NSWorkspace notifications are posted on the main thread. We receive them via `OperationQueue.main`, then use `CFRunLoopPerformBlock` to schedule work on the monitor thread. This requires the main thread to run an event loop (which Tauri does).

## Improvements over Mado v1

- **No memory leaks**: Swift ARC vs manual `Box::into_raw()` cleanup
- **Correct observer registration**: Title observer on focused window (not app)
- **Simpler codebase**: ~250 lines vs ~800+ lines
- **Less unsafe code**: Only FFI boundary vs ~40% unsafe
- **Better logging**: Consistent `NSLog` for visibility

## Threading Model

The monitor runs in a **spawned thread**, but requires the **main thread to run an event loop**:

- Monitor thread: Runs CFRunLoop for AXObserver callbacks
- Main thread: Must run an event loop (like Tauri does) for NSWorkspace notifications

**Why?** NSWorkspace notifications are posted on the main thread. We use `OperationQueue.main` to receive them, then schedule the actual work on the monitor thread via `CFRunLoopPerformBlock`.

**Tauri use case**: Perfect fit. Tauri runs a native event loop on main thread, so NSWorkspace notifications work automatically. The monitor runs in a spawned thread.

## Requirements

- macOS 10.15+
- Swift toolchain (standard on macOS)
- Accessibility permissions (requested at runtime)

## See Also

- [Decision Document](../../docs/decisions/why-swift-for-mado-macos.md) - Why we chose Swift
- [Mado v1](../_deprecated/mado/) - Original Rust implementation
