# Why Swift for Mado macOS Implementation

## Decision

We chose **Swift via swift-rs** for the macOS window monitoring implementation in our `mado` library.

## Rationale

### Why Swift

#### Memory Safety

The pure Rust implementation requires manual memory management for Accessibility API callbacks using `Box::into_raw()`, which leads to memory leaks and CPU spikes over time. Swift's ARC automatically manages memory for observers and callbacks, eliminating these issues.

#### Native API Access

NSWorkspace, Accessibility API, and CoreGraphics are first-class citizens in Swift. The pure Rust approach requires three different FFI crates (`core-foundation`, `accessibility-sys`, `objc2`) with ~40% of the code in `unsafe` blocks. Swift eliminates this complexity entirely.

#### Simpler Codebase

Estimated ~200 lines of Swift vs ~800 lines of unsafe Rust for the same functionality. The FFI boundary is minimal (3-4 functions), and only that boundary requires `unsafe` code (~5% vs ~40%).

#### Better Debugging

Xcode Instruments can profile memory and CPU usage with native stack traces. Debugging crashes in the pure Rust implementation is extremely difficult.

### swift-rs Integration

swift-rs enables calling Swift from Rust with:
- Long-running tasks (RunLoop support)
- Callbacks via C function pointers
- Cross-thread control (stop from any thread)
- Minimal FFI overhead (~microseconds per callback, negligible for 1-10 events/sec)

## Trade-offs

### Build Complexity

Requires Swift toolchain, but this is standard on macOS where we're already building.

### Two Languages

Context switching between Rust and Swift adds cognitive overhead, but the FFI boundary is clean and minimal. The complexity reduction in the Swift layer more than compensates.

### FFI Overhead

Small performance cost per callback, but unmeasurable for our event frequency (1-10 events/second).

## Alternatives Considered

- **Pure Rust**: Single language but requires fighting memory management issues and maintaining complex FFI wrappers. Would still have 40% unsafe code and difficult debugging.
- **Objective-C**: Native to macOS but requires manual memory management (same issues as Rust). Swift provides ARC with better ergonomics.
- **Polling**: Simpler implementation but higher CPU usage, latency, and battery drain. Against our event-driven design principle.
