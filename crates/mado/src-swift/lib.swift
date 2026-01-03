import SwiftRs
import AppKit
import Foundation
import CoreGraphics
import ApplicationServices

// =============================================================================
// Callback Type
// =============================================================================

typealias WindowEventCallback = @convention(c) (UnsafePointer<SRString>) -> Void

// =============================================================================
// Global State
// =============================================================================

// Access is synchronized by Rust side (only one monitor can run at a time)
nonisolated(unsafe) private var monitorInstance: WindowMonitor?

// =============================================================================
// Monitor
// =============================================================================

// WindowMonitor is accessed from a single thread (monitor thread) managed by Rust
final class WindowMonitor: NSObject, @unchecked Sendable {
    private let callback: WindowEventCallback
    private var observers: [AXObserver] = []
    private var currentPID: pid_t = 0
    private var isRunning = false
    private var notificationObserver: NSObjectProtocol?
    private var monitorRunLoop: CFRunLoop?
    private var trackWindowChanges: Bool = true
    
    // Deduplication: track last sent window to avoid duplicate events
    private var lastWindowId: UInt32? = nil
    private var lastWindowTitle: String? = nil
    
    // Polling state for windows that appear after app activation
    private var pollingTimer: CFRunLoopTimer? = nil
    private var pollingRetryCount: UInt32 = 0

    init(callback: @escaping WindowEventCallback, trackWindowChanges: Bool) {
        self.callback = callback
        self.trackWindowChanges = trackWindowChanges
    }

    func start() {
        guard !isRunning else { return }
        isRunning = true
        monitorRunLoop = CFRunLoopGetCurrent()

        // App activation notification
        // IMPORTANT: NSWorkspace posts on main thread, so we use OperationQueue.main
        // Then schedule the actual work back to our monitor's runloop
        notificationObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil,
            queue: OperationQueue.main
        ) { [weak self] notification in
            guard let self = self else { return }
            guard let runLoop = self.monitorRunLoop else { return }

            guard let app = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication else {
                return
            }

            let newPID = app.processIdentifier

            // Schedule observer setup on our monitor thread's runloop
            CFRunLoopPerformBlock(runLoop, CFRunLoopMode.defaultMode.rawValue) {
                if newPID != self.currentPID {
                    self.cleanupObservers()
                    self.stopPolling()
                    self.resetDeduplication()
                    self.currentPID = newPID

                    // Send AppActivated event
                    self.sendAppActivatedEvent(app: app)

                    // Setup observers if tracking window changes
                    if self.trackWindowChanges {
                        self.observeApp(pid: newPID)
                        
                        // Start polling for window to become available (with exponential backoff)
                        self.startPolling()
                    }
                }
            }
            CFRunLoopWakeUp(runLoop)
        }

        // Observe initial app
        if let frontApp = NSWorkspace.shared.frontmostApplication {
            currentPID = frontApp.processIdentifier

            // Send initial AppActivated event
            sendAppActivatedEvent(app: frontApp)

            // Setup observers if tracking window changes
            if trackWindowChanges {
                observeApp(pid: frontApp.processIdentifier)
                
                // Start polling for window to become available (with exponential backoff)
                startPolling()
            }
        }

        // Run run loop
        RunLoop.current.run()
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false
        stopPolling()

        // Remove notification observer
        if let observer = notificationObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(observer)
            notificationObserver = nil
        }

        // Cleanup AX observers
        cleanupObservers()

        // Stop the monitor's runloop
        if let runLoop = monitorRunLoop {
            CFRunLoopStop(runLoop)
            monitorRunLoop = nil
        }
    }

    private func cleanupObservers() {
        for observer in observers {
            CFRunLoopRemoveSource(
                monitorRunLoop ?? CFRunLoopGetCurrent(),
                AXObserverGetRunLoopSource(observer),
                .defaultMode
            )
        }
        observers.removeAll()
    }

    private func observeApp(pid: pid_t) {
        // Create observer with callback
        var observer: AXObserver?
        let result = AXObserverCreate(pid, axObserverCallback, &observer)

        guard result == .success, let observer = observer else {
            return
        }

        let app = AXUIElementCreateApplication(pid)
        let context = Unmanaged.passUnretained(self).toOpaque()

        // Observe window focus changes ON THE APP
        AXObserverAddNotification(
            observer,
            app,
            kAXFocusedWindowChangedNotification as CFString,
            context
        )

        // Register title observer on the FOCUSED WINDOW
        registerTitleObserver(forObserver: observer)

        // Add to run loop
        CFRunLoopAddSource(
            CFRunLoopGetCurrent(),
            AXObserverGetRunLoopSource(observer),
            .defaultMode
        )

        observers.append(observer)

        // Send initial window event
        sendWindowChangedEvent()
    }

    fileprivate func registerTitleObserver(forObserver observer: AXObserver) {
        let app = AXUIElementCreateApplication(currentPID)

        // Get focused window
        var focusedWindow: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(
            app,
            kAXFocusedWindowAttribute as CFString,
            &focusedWindow
        )

        guard result == .success, let window = focusedWindow else {
            return
        }

        let context = Unmanaged.passUnretained(self).toOpaque()

        // Observe title changes ON THE WINDOW
        AXObserverAddNotification(
            observer,
            window as! AXUIElement,
            kAXTitleChangedNotification as CFString,
            context
        )
    }

    fileprivate func sendWindowChangedEvent() {
        let windowInfo = getWindowInfo(pid: currentPID)
        
        // Only send WindowChanged if we have a valid window (window ID indicates window is available)
        // This prevents sending incomplete events when app is activated but window isn't ready yet
        guard let windowId = windowInfo["windowId"] as? UInt32, windowId != 0 else {
            // Window not available yet - skip event
            // AppActivated already fired, WindowChanged will fire when window becomes available
            return
        }
        
        let windowTitle = windowInfo["title"] as? String
        
        // Deduplication: only send if window actually changed
        if let lastId = lastWindowId, lastId == windowId {
            if let lastTitle = lastWindowTitle, let currentTitle = windowTitle, lastTitle == currentTitle {
                // Same window ID and title - skip duplicate
                return
            }
        }
        
        // Update last sent window info
        lastWindowId = windowId
        lastWindowTitle = windowTitle
        
        sendEvent(type: "WindowChanged", data: windowInfo as [String: Any])
    }
    
    /// Check if window is available and send WindowChanged event if so
    /// Used after AppActivated to catch windows that become available shortly after activation
    fileprivate func checkAndSendWindowChanged() {
        // Only check if we're still tracking the same PID
        guard currentPID != 0 else {
            stopPolling()
            return
        }
        
        let windowInfo = getWindowInfo(pid: currentPID)
        
        // Check if window is available
        if let windowId = windowInfo["windowId"] as? UInt32, windowId != 0 {
            // Window found - send event and stop polling
            sendWindowChangedEvent()
            stopPolling()
            return
        }
        
        // Window not ready yet - continue polling with exponential backoff
        continuePolling()
    }
    
    /// Start polling for window to become available (exponential backoff)
    fileprivate func startPolling() {
        stopPolling() // Clear any existing timer
        pollingRetryCount = 0
        
        // First check immediately
        checkAndSendWindowChanged()
    }
    
    /// Continue polling with exponential backoff (capped at 1.6s)
    fileprivate func continuePolling() {
        // Stop polling if we've tried too many times (~5 minutes max)
        if pollingRetryCount >= 188 {
            stopPolling()
            return
        }
        
        pollingRetryCount += 1
        
        // Calculate delay with exponential backoff: 200ms → 400ms → 800ms → 1.6s (capped)
        let baseDelay = 0.2
        let delay = min(baseDelay * pow(2.0, Double(pollingRetryCount - 1)), 1.6)
        
        guard let runLoop = monitorRunLoop else {
            stopPolling()
            return
        }
        
        let fireDate = CFAbsoluteTimeGetCurrent() + delay
        var context = CFRunLoopTimerContext()
        context.info = Unmanaged.passUnretained(self).toOpaque()
        
        let timer = CFRunLoopTimerCreate(
            kCFAllocatorDefault,
            fireDate,
            0, // interval (0 = one-shot)
            0, // flags
            0, // order
            { (timer, info) in
                guard let info = info else { return }
                let monitor = Unmanaged<WindowMonitor>.fromOpaque(info).takeUnretainedValue()
                monitor.checkAndSendWindowChanged()
            },
            &context
        )
        
        if let timer = timer {
            pollingTimer = timer
            CFRunLoopAddTimer(runLoop, timer, .defaultMode)
        }
    }
    
    /// Stop polling for window
    fileprivate func stopPolling() {
        if let timer = pollingTimer {
            CFRunLoopTimerInvalidate(timer)
            pollingTimer = nil
        }
        pollingRetryCount = 0
    }
    
    /// Reset deduplication state (called when app changes)
    fileprivate func resetDeduplication() {
        lastWindowId = nil
        lastWindowTitle = nil
    }

    fileprivate func sendAppActivatedEvent(app: NSRunningApplication) {
        let appInfo = getAppInfo(app: app)
        let eventData: [String: Any] = [
            "app": appInfo as [String: Any]
        ]
        sendEvent(type: "AppActivated", data: eventData)
    }

    private func sendEvent(type: String, data: [String: Any]) {
        let event: [String: Any] = [
            "type": type,
            "data": data
        ]

        guard let jsonData = try? JSONSerialization.data(withJSONObject: event, options: []),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            return
        }

        let srJson = SRString(jsonString)
        withUnsafePointer(to: srJson) { ptr in
            callback(ptr)
        }
    }

    fileprivate func getAppInfo(app: NSRunningApplication) -> [String: Any?] {
        return getAppInfoStatic(app: app)
    }

    fileprivate func getWindowInfo(pid: pid_t) -> [String: Any?] {
        return getWindowInfoStatic(pid: pid)
    }
}

// =============================================================================
// AX Observer Callback
// =============================================================================

private func axObserverCallback(
    observer: AXObserver,
    element: AXUIElement,
    notification: CFString,
    refcon: UnsafeMutableRawPointer?
) {
    guard let refcon = refcon else { return }
    let monitor = Unmanaged<WindowMonitor>.fromOpaque(refcon).takeUnretainedValue()

    // Re-register title observer when focus changes
    if notification as String == kAXFocusedWindowChangedNotification as String {
        monitor.registerTitleObserver(forObserver: observer)
    }

    monitor.sendWindowChangedEvent()
}

// =============================================================================
// C API
// =============================================================================

@_cdecl("mado_start_monitor")
public func madoStartMonitor(callbackPtr: UnsafeRawPointer, trackWindowChanges: Bool) {
    let callback = unsafeBitCast(callbackPtr, to: WindowEventCallback.self)
    let monitor = WindowMonitor(callback: callback, trackWindowChanges: trackWindowChanges)
    monitorInstance = monitor
    monitor.start()
}

@_cdecl("mado_stop_monitor")
public func madoStopMonitor() {
    monitorInstance?.stop()
    monitorInstance = nil
}

@_cdecl("mado_is_trusted")
public func madoIsTrusted() -> Bool {
    return AXIsProcessTrusted()
}

@_cdecl("mado_get_active_app")
public func madoGetActiveApp() -> SRString? {
    // Use Accessibility API to get frontmost app (more reliable than NSWorkspace)
    let systemWide = AXUIElementCreateSystemWide()
    var focusedApp: CFTypeRef?
    
    let result = AXUIElementCopyAttributeValue(
        systemWide,
        kAXFocusedApplicationAttribute as CFString,
        &focusedApp
    )
    
    guard result == .success, let appElement = focusedApp else {
        // Fallback to NSWorkspace if Accessibility API fails
        guard let frontApp = NSWorkspace.shared.frontmostApplication else {
            return nil
        }
        let appInfo = getAppInfoStatic(app: frontApp)
        guard let jsonData = try? JSONSerialization.data(withJSONObject: appInfo, options: []),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            return nil
        }
        return SRString(jsonString)
    }
    
    // Get PID from accessibility element using AXUIElementGetPid
    var pid: pid_t = 0
    let pidResult = AXUIElementGetPid(appElement as! AXUIElement, &pid)
    
    guard pidResult == .success, pid != 0 else {
        return nil
    }
    
    // Get app info from PID
    guard let runningApp = NSRunningApplication(processIdentifier: pid_t(pid)) else {
        return nil
    }
    
    let appInfo = getAppInfoStatic(app: runningApp)
    
    guard let jsonData = try? JSONSerialization.data(withJSONObject: appInfo, options: []),
          let jsonString = String(data: jsonData, encoding: .utf8) else {
        return nil
    }
    
    return SRString(jsonString)
}

@_cdecl("mado_get_active_window")
public func madoGetActiveWindow() -> SRString? {
    // Use Accessibility API to get frontmost app (same as get_active_app for consistency)
    let systemWide = AXUIElementCreateSystemWide()
    var focusedApp: CFTypeRef?
    
    let result = AXUIElementCopyAttributeValue(
        systemWide,
        kAXFocusedApplicationAttribute as CFString,
        &focusedApp
    )
    
    guard result == .success, let appElement = focusedApp else {
        // Fallback to NSWorkspace if Accessibility API fails
        guard let frontApp = NSWorkspace.shared.frontmostApplication else {
            return nil
        }
        let windowInfo = getWindowInfoStatic(pid: frontApp.processIdentifier)
        guard let jsonData = try? JSONSerialization.data(withJSONObject: windowInfo, options: []),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            return nil
        }
        return SRString(jsonString)
    }
    
    // Get PID from accessibility element
    var pid: pid_t = 0
    let pidResult = AXUIElementGetPid(appElement as! AXUIElement, &pid)
    
    guard pidResult == .success, pid != 0 else {
        return nil
    }
    
    // Get window info for the frontmost app
    let windowInfo = getWindowInfoStatic(pid: pid)

    guard let jsonData = try? JSONSerialization.data(withJSONObject: windowInfo, options: []),
          let jsonString = String(data: jsonData, encoding: .utf8) else {
        return nil
    }

    return SRString(jsonString)
}

// =============================================================================
// Helper Functions
// =============================================================================

private func getAppInfoStatic(app: NSRunningApplication) -> [String: Any?] {
    return [
        "pid": app.processIdentifier,
        "name": app.localizedName,
        "bundleId": app.bundleIdentifier,
        "processPath": app.executableURL?.path
    ]
}

// =============================================================================
// CoreGraphics Window Info
// =============================================================================

/// Find window ID and bounds using CoreGraphics API
///
/// Uses two strategies:
/// 1. Exact title match (most accurate - process might have multiple windows)
/// 2. First window matching PID (fallback when title doesn't match)
private func findWindowIdAndBounds(pid: pid_t, title: String?) -> (windowId: UInt32?, bounds: [String: Double]?) {
    // Get window list (option: on-screen windows only, exclude desktop elements)
    // Options: kCGWindowListOptionOnScreenOnly (1 << 0) | kCGWindowListOptionExcludeDesktopElements (1 << 4)
    let option: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
    guard let windowList = CGWindowListCopyWindowInfo(option, kCGNullWindowID) as? [[String: Any]] else {
        return (nil, nil)
    }

    let titleToMatch = title ?? ""

    // Try exact title match first
    if !titleToMatch.isEmpty {
        for windowDict in windowList {
            guard let ownerPID = windowDict["kCGWindowOwnerPID"] as? Int,
                  ownerPID == pid,
                  let windowName = windowDict["kCGWindowName"] as? String,
                  windowName == titleToMatch,
                  matchesWindowCriteria(windowDict, pid: pid) else {
                continue
            }

            if let windowId = windowDict["kCGWindowNumber"] as? Int,
               let bounds = extractBounds(from: windowDict) {
                return (UInt32(windowId), bounds)
            }
        }
    }

    // Fallback: first window matching PID
    for windowDict in windowList {
        guard let ownerPID = windowDict["kCGWindowOwnerPID"] as? Int,
              ownerPID == pid,
              matchesWindowCriteria(windowDict, pid: pid) else {
            continue
        }

        if let windowId = windowDict["kCGWindowNumber"] as? Int,
           let bounds = extractBounds(from: windowDict) {
            return (UInt32(windowId), bounds)
        }
    }

    return (nil, nil)
}

/// Check if window matches selection criteria
private func matchesWindowCriteria(_ windowDict: [String: Any], pid: pid_t) -> Bool {
    // Must be on-screen
    guard let isOnscreen = windowDict["kCGWindowIsOnscreen"] as? Bool, isOnscreen else {
        return false
    }

    // Must have non-zero alpha (not fully transparent)
    guard let alpha = windowDict["kCGWindowAlpha"] as? Double, alpha > 0.0 else {
        return false
    }

    return true
}

/// Extract window bounds from CoreGraphics window dictionary
private func extractBounds(from windowDict: [String: Any]) -> [String: Double]? {
    guard let boundsDict = windowDict["kCGWindowBounds"] as? [String: Any],
          let x = boundsDict["X"] as? Double,
          let y = boundsDict["Y"] as? Double,
          let width = boundsDict["Width"] as? Double,
          let height = boundsDict["Height"] as? Double else {
        return nil
    }

    return [
        "x": x,
        "y": y,
        "width": width,
        "height": height
    ]
}

private func getWindowInfoStatic(pid: pid_t) -> [String: Any?] {
    let app = AXUIElementCreateApplication(pid)

    // Get app info
    let appInfo: [String: Any?]
    if let runningApp = NSRunningApplication(processIdentifier: pid) {
        appInfo = getAppInfoStatic(app: runningApp)
    } else {
        appInfo = [
            "pid": pid,
            "name": nil,
            "bundleId": nil,
            "processPath": nil
        ]
    }

    // Get focused window
    var focusedWindow: CFTypeRef?
    let windowResult = AXUIElementCopyAttributeValue(
        app,
        kAXFocusedWindowAttribute as CFString,
        &focusedWindow
    )

    guard windowResult == .success, let window = focusedWindow else {
        return [
            "title": nil,
            "windowId": nil,
            "bounds": nil,
            "app": appInfo,
            "browser": nil
        ]
    }

    // Get window title
    var titleValue: CFTypeRef?
    AXUIElementCopyAttributeValue(
        window as! AXUIElement,
        kAXTitleAttribute as CFString,
        &titleValue
    )
    let title = titleValue as? String

    // Get window ID and bounds using CoreGraphics (more reliable than Accessibility API)
    let (windowId, bounds) = findWindowIdAndBounds(pid: pid, title: title)

    return [
        "title": title,
        "windowId": windowId,
        "bounds": bounds,
        "app": appInfo,
        "browser": nil
    ]
}
