import SwiftRs
import AppKit
import Foundation
import CoreGraphics

// =============================================================================
// Callback Type
// =============================================================================

typealias WindowCallback = @convention(c) (UnsafePointer<SRString>) -> Void

// =============================================================================
// Global State
// =============================================================================

private var monitorInstance: WindowMonitor?

// =============================================================================
// Monitor
// =============================================================================

class WindowMonitor: NSObject {
    private let callback: WindowCallback
    private var observers: [AXObserver] = []
    private var currentPID: pid_t = 0
    private var isRunning = false
    private var pollTimer: Timer?
    
    init(callback: @escaping WindowCallback) {
        self.callback = callback
    }
    
    func start() {
        guard !isRunning else { return }
        isRunning = true
        
        // Observe initial app using CoreGraphics (works from any thread)
        if let pid = getFrontmostAppPID() {
            observeApp(pid: pid)
        }
        
        // Poll for app changes every 0.5 seconds using CoreGraphics
        // More reliable than NSWorkspace notifications from Rust-spawned threads
        let timer = Timer(timeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.checkForAppSwitch()
        }
        pollTimer = timer
        RunLoop.current.add(timer, forMode: .common)
        
        // Run current thread's run loop (blocks)
        RunLoop.current.run()
    }
    
    func stop() {
        pollTimer?.invalidate()
        pollTimer = nil
        observers.removeAll()
        CFRunLoopStop(CFRunLoopGetCurrent())
    }
    
    /// Get frontmost app PID using CoreGraphics (filters system UI)
    private func getFrontmostAppPID() -> pid_t? {
        let options = CGWindowListOption(arrayLiteral: .optionOnScreenOnly, .excludeDesktopElements)
        guard let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
            return nil
        }
        
        // Find first window from a real user app
        for window in windowList {
            guard let ownerPID = window[kCGWindowOwnerPID as String] as? Int32,
                  let ownerName = window[kCGWindowOwnerName as String] as? String else {
                continue
            }
            
            // Skip system UI
            if ["Window Server", "Control Center", "Dock", "SystemUIServer", "Notification Center"].contains(ownerName) {
                continue
            }
            
            return pid_t(ownerPID)
        }
        
        return nil
    }
    
    private func checkForAppSwitch() {
        guard let newPID = getFrontmostAppPID() else { return }
        
        if newPID != currentPID && currentPID != 0 {
            observers.removeAll()
            observeApp(pid: newPID)
        }
    }
    
    private func observeApp(pid: pid_t) {
        print("[WindowMonitor] 🔧 observeApp(pid: \(pid))")
        currentPID = pid
        
        // Create observer with callback
        var observer: AXObserver?
        let result = AXObserverCreate(pid, axObserverCallback, &observer)
        
        guard result == .success, let observer = observer else {
            print("[WindowMonitor] ❌ Failed to create AXObserver: \(result.rawValue)")
            return
        }
        
        print("[WindowMonitor] ✅ Created AXObserver")
        
        let app = AXUIElementCreateApplication(pid)
        let context = Unmanaged.passUnretained(self).toOpaque()
        
        // Observe window focus changes ON THE APP
        AXObserverAddNotification(
            observer,
            app,
            kAXFocusedWindowChangedNotification as CFString,
            context
        )
        print("[WindowMonitor] ✅ Added focus change notification")
        
        // Register title observer on the FOCUSED WINDOW (not the app)
        registerTitleObserver(forObserver: observer)
        
        // Add to run loop
        CFRunLoopAddSource(
            CFRunLoopGetCurrent(),
            AXObserverGetRunLoopSource(observer),
            .defaultMode
        )
        print("[WindowMonitor] ✅ Added observer to run loop")
        
        observers.append(observer)
        
        // Send initial title
        print("[WindowMonitor] 📤 Sending initial title...")
        sendWindowTitle()
        print("[WindowMonitor] ✅ observeApp complete")
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
        
        // Observe title changes ON THE WINDOW (not the app)
        AXObserverAddNotification(
            observer,
            window as! AXUIElement,
            kAXTitleChangedNotification as CFString,
            context
        )
    }
    
    fileprivate func sendWindowTitle() {
        let app = AXUIElementCreateApplication(currentPID)
        
        // Get focused window from the app
        var focusedWindow: CFTypeRef?
        let windowResult = AXUIElementCopyAttributeValue(
            app,
            kAXFocusedWindowAttribute as CFString,
            &focusedWindow
        )
        
        guard windowResult == .success, let window = focusedWindow else {
            sendTitle("(no window)")
            return
        }
        
        // Get title from the window
        var titleValue: CFTypeRef?
        AXUIElementCopyAttributeValue(
            window as! AXUIElement,
            kAXTitleAttribute as CFString,
            &titleValue
        )
        
        let title = (titleValue as? String) ?? "(no title)"
        sendTitle(title)
    }
    
    private func sendTitle(_ title: String) {
        let srTitle = SRString(title)
        withUnsafePointer(to: srTitle) { ptr in
            callback(ptr)
        }
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
    
    monitor.sendWindowTitle()
}

// =============================================================================
// C API
// =============================================================================

@_cdecl("mado_start_monitor")
public func madoStartMonitor(callbackPtr: UnsafeRawPointer) {
    let callback = unsafeBitCast(callbackPtr, to: WindowCallback.self)
    let monitor = WindowMonitor(callback: callback)
    monitorInstance = monitor
    monitor.start()
}

@_cdecl("mado_stop_monitor")
public func madoStopMonitor() {
    monitorInstance?.stop()
    monitorInstance = nil
}
