# Why Swift for Mado macOS Implementation

## Decision

We chose **Swift via swift-rs** for the macOS window monitoring implementation in our `mado` library.

## Rationale

### Why Swift

#### Call Once, Receive Callbacks

macOS monitoring works best as callback-based: Rust calls into Swift once to start monitoring, Swift sets up all native observers (NSWorkspace, AXObserver), runs the CFRunLoop, and calls back to Rust on each event. This is cleaner than trying to orchestrate native APIs from Rust repeatedly.

#### Memory Safety

The pure Rust implementation required manual memory management for Accessibility API callbacks using `Box::into_raw()`, leading to memory leaks and complexity. Swift's ARC automatically manages memory for observers and callbacks, eliminating these issues entirely.

#### Native API Access

NSWorkspace, Accessibility API, and CoreGraphics are first-class citizens in Swift. The pure Rust approach required three different FFI crates (`core-foundation`, `accessibility-sys`, `objc2`) with ~40% of the code in `unsafe` blocks. Swift eliminates this complexity.

#### Simpler Codebase

~300 lines of Swift + Rust vs ~800+ lines of unsafe Rust for the same functionality. The FFI boundary is minimal (2-3 functions), and only that boundary requires `unsafe` code.

### swift-rs Integration

swift-rs enables calling Swift from Rust with long-running tasks (RunLoop support), callbacks via C function pointers, cross-thread control (stop from any thread), and minimal FFI overhead (~microseconds per callback, negligible for our event frequency).

## Trade-offs

- **Build Complexity**: Requires Swift toolchain, but this is standard on macOS.
- **Two Languages**: Context switching adds cognitive overhead, but the FFI boundary is clean and minimal. The complexity reduction in the Swift layer more than compensates.

## Alternatives Considered

- **Pure Rust**: Single language but required fighting memory management issues, threading complexity (`MainThreadMarker` hacks), and maintaining complex FFI wrappers. ~40% unsafe code, difficult debugging, and required polling for some window info.
