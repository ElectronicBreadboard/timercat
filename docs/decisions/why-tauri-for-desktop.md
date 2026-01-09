# Why Tauri for Desktop

## Decision

We chose **Tauri** as our desktop application framework.

## Rationale

### Why Tauri

#### Performance & Energy Efficiency

Our app is a tray application that runs primarily in the background. Tauri uses Rust for backend operations, which compiles to native machine code and is significantly more energy-efficient and performant than Electron's main process, which runs JavaScript (Node.js). While Electron can call native C++ modules, the main process logic itself runs in JavaScript, which has higher overhead for continuous background operations.

#### Cross-Platform

As a bootstrapped team, we can't manage multiple codebases. Tauri allows us to write one codebase that targets Windows, macOS, and Linux, significantly reducing maintenance overhead.

#### React Frontend

We're most familiar with React, and Tauri allows us to use our existing React skills and ecosystem for the frontend while leveraging Rust for performance-critical or low-level operations when needed.

#### Rust Backend

Rust provides access to low-level system APIs when needed, while still maintaining a simple React frontend. This gives us the flexibility to optimize critical paths without sacrificing developer experience.

## Trade-offs

### WebView Fragmentation

Tauri uses the OS's native webview (WebView2 on Windows, WebKit on macOS, WebKitGTK on Linux). This means:

- **Different rendering engines**: Features and bugs can vary across platforms
- **Linux variability**: WebKitGTK versions differ by distro (Ubuntu 22.04+ required for Tauri 2.x)
- **Known quirks**: localStorage sync issues on Linux, z-order differences between Windows/macOS

We accept this tradeoff because:

1. Our UI is simple enough that cross-browser issues are minimal
2. The performance and bundle size benefits outweigh the testing overhead
3. Most of our users are on macOS (primary target)

### Rust Learning Curve

Teams unfamiliar with Rust face a steeper learning curve. We mitigate this by:

- Keeping Rust code focused on backend/system operations
- Using Swift for macOS-specific native code (simpler than fighting Rust FFI)
- Frontend remains pure React/TypeScript

## Alternatives Considered

- **Electron**: Too resource-intensive for a background app. Larger bundle sizes and higher memory/CPU usage would negatively impact performance and battery life.
- **Native Development**: Would require separate codebases for each platform, which is not feasible for a bootstrapped team.
