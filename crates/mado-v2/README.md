# mado-v2

> Minimal POC: Swift-based window monitoring for macOS

## Purpose

This is a proof-of-concept for using Swift (via swift-rs) for the mado macOS implementation. It demonstrates:

- Event-driven window monitoring (NSWorkspace + Accessibility API)
- Callbacks from Swift to Rust
- Long-running task with start/stop control
- Minimal, production-ready foundation

## Usage

```rust
use mado_v2::{WindowListener, WindowMonitor};

struct MyListener;

impl WindowListener for MyListener {
    fn on_window_change(&self, title: String) {
        println!("Window: {}", title);
    }
}

fn main() {
    let monitor = WindowMonitor::new();
    monitor.run(MyListener).unwrap(); // Blocks
}
```

## Running the Example

```bash
cargo run --example minimal
```

Switch apps or windows to see changes. The example runs for 30 seconds then stops.

## What It Proves

✅ **Event-driven monitoring** - Uses NSWorkspace and Accessibility observers, not polling  
✅ **Minimal FFI** - Only passes window title, single callback function  
✅ **Clean interface** - Matches mado v1 API (WindowListener trait, run/stop methods)  
✅ **Production-ready** - Simple enough to commit, solid enough to build on

## Current Scope

**Sends only**: Window title (String)

**Missing** (to be added):
- App info (name, PID, bundle ID)
- Window info (ID, bounds)
- Browser URL extraction
- Multiple event types

This is intentional - KISS principle. Once we verify this works reliably, we'll expand it.

## Architecture

```
Rust                           Swift
─────────────────────────────────────────────────
WindowMonitor::run()    →    NSWorkspace observer
                              + AX observers
                              
WindowListener trait    ←    Callback on changes

WindowMonitor::stop()   →    CFRunLoopStop()
```

## Why This Approach

See [Decision Document](../../docs/decisions/why-swift-for-mado-macos.md).

**TL;DR**: Swift's ARC solves memory leak issues in pure Rust implementation, native API access is simpler, and 95% less unsafe code.
