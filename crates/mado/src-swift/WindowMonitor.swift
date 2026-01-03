import AppKit
import ApplicationServices
import Foundation
import SwiftRs

typealias WindowEventCallback = @convention(c) (UnsafePointer<SRString>) -> Void

/// Monitors window and app focus changes using NSWorkspace and Accessibility API.
///
/// Threading: Runs in a spawned thread with its own CFRunLoop.
/// NSWorkspace notifications arrive on main thread and are forwarded to monitor thread.
final class WindowMonitor: NSObject {
    /// Singleton instance managed by FFI layer
    nonisolated(unsafe) static var shared: WindowMonitor?

    private let callback: WindowEventCallback
    private let trackWindowChanges: Bool
    private let allowBrowser: Bool

    private var isRunning = false
    private var monitorRunLoop: CFRunLoop?
    private var notificationObserver: NSObjectProtocol?

    // Accessibility observer state
    private var axObservers: [AXObserver] = []
    private var currentPID: pid_t = 0

    // Polling state for delayed windows.
    // Apps launched from Dock/Spotlight can take seconds to show their window.
    // We use exponential backoff: 200ms → 400ms → 800ms → 1.6s (capped).
    // Total time: ~3s for first 4 retries + 184×1.6s = ~300s ≈ 5 min max.
    private var pollingTimer: CFRunLoopTimer?
    private var pollingRetryCount: UInt32 = 0
    private let maxRetries: UInt32 = 188
    private let baseDelay: Double = 0.2
    private let maxDelay: Double = 1.6

    // Deduplication to prevent duplicate WindowChanged events
    private var lastWindowId: UInt32?
    private var lastWindowTitle: String?

    init(
        callback: @escaping WindowEventCallback,
        trackWindowChanges: Bool,
        allowBrowser: Bool
    ) {
        self.callback = callback
        self.trackWindowChanges = trackWindowChanges
        self.allowBrowser = allowBrowser
    }

    // MARK: - Lifecycle

    /// Start monitoring. Blocks forever until stop() is called.
    func start() {
        guard !isRunning else { return }
        isRunning = true
        monitorRunLoop = CFRunLoopGetCurrent()

        setupAppActivationObserver()

        // Observe initial app
        if let app = NSWorkspace.shared.frontmostApplication {
            handleAppActivation(app: app, pid: app.processIdentifier)
        }

        RunLoop.current.run()
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false

        stopWindowPolling()
        cleanupAccessibilityObservers()

        if let observer = notificationObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(observer)
            notificationObserver = nil
        }

        if let runLoop = monitorRunLoop {
            CFRunLoopStop(runLoop)
            monitorRunLoop = nil
        }
    }

    // MARK: - App Activation

    /// NSWorkspace notifications arrive on main thread, we forward to monitor thread via CFRunLoop.
    private func setupAppActivationObserver() {
        notificationObserver = NSWorkspace.shared.notificationCenter
            .addObserver(
                forName: NSWorkspace.didActivateApplicationNotification,
                object: nil,
                queue: OperationQueue.main
            ) { [weak self] notification in
                guard
                    let self = self,
                    let runLoop = self.monitorRunLoop,
                    let app =
                        notification.userInfo?[
                            NSWorkspace.applicationUserInfoKey
                        ]
                        as? NSRunningApplication
                else { return }

                let pid = app.processIdentifier

                CFRunLoopPerformBlock(
                    runLoop,
                    CFRunLoopMode.defaultMode.rawValue
                ) {
                    self.handleAppActivation(app: app, pid: pid)
                }
                CFRunLoopWakeUp(runLoop)
            }
    }

    private func handleAppActivation(app: NSRunningApplication, pid: pid_t) {
        guard pid != currentPID else { return }

        // Cleanup previous app state
        cleanupAccessibilityObservers()
        stopWindowPolling()
        resetDeduplication()

        currentPID = pid
        sendAppActivatedEvent(app: app)

        if trackWindowChanges {
            setupAccessibilityObserver(pid: pid)

            // Try to send window event immediately
            let didSend = sendWindowChangedEvent()

            // If no window yet, start polling.
            // Common when app is launched from Dock - app activates but window takes time to appear.
            if !didSend {
                startWindowPolling()
            }
        }
    }

    // MARK: - Accessibility Observers

    private func setupAccessibilityObserver(pid: pid_t) {
        var observer: AXObserver?
        let result = AXObserverCreate(pid, axCallback, &observer)

        guard result == .success, let observer = observer else { return }

        let app = AXUIElementCreateApplication(pid)
        let context = Unmanaged.passUnretained(self).toOpaque()

        // Observe focus changes at app level (user switches windows within app)
        AXObserverAddNotification(
            observer,
            app,
            kAXFocusedWindowChangedNotification as CFString,
            context
        )

        // Observe title changes on current window (e.g. tab switches in browsers)
        registerTitleObserver(observer: observer, pid: pid)

        if let runLoop = monitorRunLoop {
            CFRunLoopAddSource(
                runLoop,
                AXObserverGetRunLoopSource(observer),
                .defaultMode
            )
        }

        axObservers.append(observer)
    }

    /// Re-register title observer on the focused window.
    /// Called when focus changes because title observer is window-specific.
    private func registerTitleObserver(observer: AXObserver, pid: pid_t) {
        let app = AXUIElementCreateApplication(pid)
        var focusedWindow: CFTypeRef?

        let result = AXUIElementCopyAttributeValue(
            app,
            kAXFocusedWindowAttribute as CFString,
            &focusedWindow
        )

        guard result == .success, let window = focusedWindow else { return }

        let context = Unmanaged.passUnretained(self).toOpaque()
        AXObserverAddNotification(
            observer,
            window as! AXUIElement,
            kAXTitleChangedNotification as CFString,
            context
        )
    }

    private func cleanupAccessibilityObservers() {
        guard let runLoop = monitorRunLoop else { return }

        for observer in axObservers {
            CFRunLoopRemoveSource(
                runLoop,
                AXObserverGetRunLoopSource(observer),
                .defaultMode
            )
        }
        axObservers.removeAll()
        currentPID = 0
    }

    /// Called by AX callback when focus changes
    fileprivate func handleFocusChange(observer: AXObserver) {
        registerTitleObserver(observer: observer, pid: currentPID)
    }

    /// Called by AX callback on any window change
    fileprivate func handleWindowChange() {
        stopWindowPolling()
        _ = sendWindowChangedEvent()
    }

    // MARK: - Window Polling

    /// Start polling for window with exponential backoff.
    /// Needed because some apps (especially launched from Dock) show their window
    /// seconds after activation. Without polling, we'd miss the WindowChanged event.
    private func startWindowPolling() {
        pollingRetryCount = 0
        scheduleNextWindowPoll()
    }

    private func scheduleNextWindowPoll() {
        guard pollingRetryCount < maxRetries, let runLoop = monitorRunLoop
        else {
            stopWindowPolling()
            return
        }

        // Invalidate previous timer if it exists (prevents multiple timers running)
        if let oldTimer = pollingTimer {
            CFRunLoopTimerInvalidate(oldTimer)
            pollingTimer = nil
        }

        pollingRetryCount += 1

        // Exponential backoff: 200ms, 400ms, 800ms, 1.6s, 1.6s, ...
        let delay = min(
            baseDelay * pow(2.0, Double(pollingRetryCount - 1)),
            maxDelay
        )

        let fireDate = CFAbsoluteTimeGetCurrent() + delay
        var context = CFRunLoopTimerContext()
        context.info = Unmanaged.passUnretained(self).toOpaque()

        let timer = CFRunLoopTimerCreate(
            kCFAllocatorDefault,
            fireDate,
            0,  // One-shot
            0,
            0,
            { _, info in
                guard let info = info else { return }
                let monitor = Unmanaged<WindowMonitor>.fromOpaque(info)
                    .takeUnretainedValue()
                monitor.checkWindowPoll()
            },
            &context
        )

        if let timer = timer {
            pollingTimer = timer
            CFRunLoopAddTimer(runLoop, timer, .defaultMode)
        }
    }

    private func checkWindowPoll() {
        let windowInfo = WindowInfo.getForPID(
            currentPID,
            allowBrowser: allowBrowser
        )

        if windowInfo.windowId != nil {
            // Window appeared, send event and stop polling
            stopWindowPolling()
            _ = sendWindowChangedEvent()
        } else {
            // Window not ready yet, continue polling
            scheduleNextWindowPoll()
        }
    }

    private func stopWindowPolling() {
        if let timer = pollingTimer {
            CFRunLoopTimerInvalidate(timer)
            pollingTimer = nil
        }
        pollingRetryCount = 0
    }

    // MARK: - Events

    private func sendAppActivatedEvent(app: NSRunningApplication) {
        let appInfo = AppInfo.from(app)
        let eventData: [String: Any] = ["app": appInfo.toDictionary()]
        sendEvent(type: "AppActivated", data: eventData)
    }

    /// Send WindowChanged event if window is valid. Returns true if sent.
    @discardableResult
    private func sendWindowChangedEvent() -> Bool {
        guard currentPID != 0 else { return false }

        let windowInfo = WindowInfo.getForPID(
            currentPID,
            allowBrowser: allowBrowser
        )

        // Skip if no valid window (no window ID means window not ready yet)
        guard let windowId = windowInfo.windowId, windowId != 0 else {
            return false
        }

        // Deduplicate: only send if window ID or title changed
        let windowTitle = windowInfo.title
        if lastWindowId == windowId, lastWindowTitle == windowTitle {
            return false
        }
        lastWindowId = windowId
        lastWindowTitle = windowTitle

        sendEvent(type: "WindowChanged", data: windowInfo.toDictionary())
        return true
    }

    private func sendEvent(type: String, data: [String: Any]) {
        let event: [String: Any] = ["type": type, "data": data]

        guard
            let jsonData = try? JSONSerialization.data(withJSONObject: event),
            let jsonString = String(data: jsonData, encoding: .utf8)
        else { return }

        let srJson = SRString(jsonString)
        withUnsafePointer(to: srJson) { ptr in
            callback(ptr)
        }
    }

    private func resetDeduplication() {
        lastWindowId = nil
        lastWindowTitle = nil
    }
}

// Global callback for AX notifications
private func axCallback(
    observer: AXObserver,
    element: AXUIElement,
    notification: CFString,
    refcon: UnsafeMutableRawPointer?
) {
    guard let refcon = refcon else { return }

    let monitor = Unmanaged<WindowMonitor>.fromOpaque(refcon)
        .takeUnretainedValue()

    if notification as String == kAXFocusedWindowChangedNotification as String {
        monitor.handleFocusChange(observer: observer)
    }

    monitor.handleWindowChange()
}
