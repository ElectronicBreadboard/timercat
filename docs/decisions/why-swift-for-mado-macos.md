# Why Swift for Mado macOS Implementation

## Decision

We chose **Swift via swift-rs** for the macOS window monitoring implementation in our `mado` library.

## Rationale

### Why Swift over Pure Rust

#### Event-Driven Architecture

macOS monitoring works best as callback-based: Rust calls into Swift once to start monitoring, Swift sets up all native observers (NSWorkspace, AXObserver), runs the CFRunLoop, and calls back to Rust on each event. This is cleaner than orchestrating native APIs from Rust repeatedly.

#### Memory Safety via ARC

The pure Rust implementation required manual memory management for Accessibility API callbacks using `Box::into_raw()`, leading to potential memory leaks and complexity. Swift's ARC automatically manages memory for observers and callbacks, eliminating these issues.

#### Native API Access

NSWorkspace, Accessibility API, CoreGraphics, and AppleScript are first-class citizens in Swift. The pure Rust approach required three different FFI crates (`core-foundation`, `accessibility-sys`, `objc2`) with ~40% of the code in `unsafe` blocks.

**APIs Used:**

| API               | Purpose                                 |
| ----------------- | --------------------------------------- |
| NSWorkspace       | App activation events                   |
| Accessibility API | Window focus and title changes          |
| CoreGraphics      | Stable window IDs and bounds            |
| AppleScript       | Browser URLs and private mode detection |

#### Code Reduction

| Approach         | Lines of Code          | Unsafe Code  |
| ---------------- | ---------------------- | ------------ |
| Swift + Rust FFI | ~800 Swift + ~200 Rust | ~5 functions |
| Pure Rust        | ~1,150 lines           | ~40% unsafe  |

The FFI boundary is minimal (5 functions), and only that boundary requires `unsafe` code in Rust.

### Why swift-rs

swift-rs enables:

- **Long-running tasks**: CFRunLoop support with `RunLoop.current.run()`
- **Callbacks**: C function pointers for event callbacks to Rust
- **Cross-thread scheduling**: `CFRunLoopPerformBlock` to schedule work from main to monitor thread
- **Cross-thread control**: `stop()` can be called from any thread via `CFRunLoopStop()`
- **Minimal overhead**: ~microseconds per callback, negligible for our event frequency

### Threading Model

The monitor runs in a **spawned thread** with its own CFRunLoop:

- NSWorkspace notifications arrive on main thread
- We receive them via `OperationQueue.main`, then use `CFRunLoopPerformBlock` to forward to monitor thread
- AXObserver callbacks are delivered directly to the monitor thread's runloop

**Tauri use case**: Perfect fit. Tauri runs a native event loop on main thread, so NSWorkspace notifications work automatically. The monitor runs in a spawned thread, leaving the main thread free.

## Trade-offs

### Build Complexity

Requires Swift toolchain, but this is standard on macOS development machines.

### Two Languages

Context switching between Rust and Swift adds cognitive overhead. We mitigate this by:

- Keeping the FFI boundary clean and minimal (5 functions)
- Swift handles all macOS-specific logic
- Rust handles cross-platform abstractions and the public API

The complexity reduction in the Swift layer more than compensates.

## Alternatives Considered

- **Pure Rust**: Single language but required fighting memory management, threading complexity, and maintaining FFI wrappers for 3 crates. ~40% unsafe code made debugging difficult and led to subtle bugs.
