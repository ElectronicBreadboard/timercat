# Why Swift for Mado macOS Implementation

## Decision

We chose **Swift via swift-rs** for the macOS window monitoring implementation in our `mado` library.

## Rationale

### Why Swift

#### Event-Driven Architecture (Call Once, Receive Callbacks)

macOS monitoring works best as callback-based: Rust calls into Swift once to start monitoring, Swift sets up all native observers (NSWorkspace, AXObserver), runs the CFRunLoop, and calls back to Rust on each event. This is cleaner than trying to orchestrate native APIs from Rust repeatedly.

#### Memory Safety

The pure Rust implementation required manual memory management for Accessibility API callbacks using `Box::into_raw()`, leading to potential memory leaks and complexity. Swift's ARC automatically manages memory for observers and callbacks, eliminating these issues entirely.

#### Native API Access

NSWorkspace, Accessibility API, and CoreGraphics are first-class citizens in Swift. The pure Rust approach required three different FFI crates (`core-foundation`, `accessibility-sys`, `objc2`) with ~40% of the code in `unsafe` blocks. Swift eliminates this complexity.

#### Simpler Codebase

~400 lines of Swift + Rust vs ~800+ lines of unsafe Rust for the same functionality. The FFI boundary is minimal (2-4 functions), and only that boundary requires `unsafe` code.

### swift-rs Integration

swift-rs enables:
- **Long-running tasks**: CFRunLoop support with `RunLoop.current.run()`
- **Callbacks**: C function pointers for event callbacks to Rust
- **Cross-thread scheduling**: `CFRunLoopPerformBlock` to schedule work from main to monitor thread
- **Cross-thread control**: `stop()` can be called from any thread via `CFRunLoopStop()`
- **Minimal overhead**: ~microseconds per callback, negligible for our event frequency

### Threading Model

The monitor runs in a **spawned thread**, but requires the **main thread to run an event loop** (which Tauri does):

- NSWorkspace notifications are posted on the main thread
- We receive them via `OperationQueue.main`, then use `CFRunLoopPerformBlock` to schedule work on the monitor thread
- AXObserver callbacks are delivered directly to the monitor thread's runloop

**Tauri use case**: Perfect fit. Tauri runs a native event loop on main thread, so NSWorkspace notifications work automatically. The monitor runs in a spawned thread, leaving the main thread free.

## Trade-offs

- **Build Complexity**: Requires Swift toolchain, but this is standard on macOS.
- **Two Languages**: Context switching adds cognitive overhead, but the FFI boundary is clean and minimal. The complexity reduction in the Swift layer more than compensates.

## Alternatives Considered

- **Pure Rust**: Single language but required fighting memory management, threading complexity, and maintaining FFI wrappers for 3 crates. ~40% unsafe code made debugging difficult and led to subtle bugs.
